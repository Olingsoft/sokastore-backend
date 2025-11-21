const express = require('express');
const router = express.Router();
const { Cart, CartItem, Product, ProductImage } = require('../models/associations');
const auth = require('../middleware/auth');

// Get user's cart
router.get('/', auth, async (req, res) => {
    console.log('GET /api/cart hit');
    try {
        console.log('User from auth middleware:', req.user);
        if (!req.user || !req.user.id) {
            console.error('User ID missing in request');
            return res.status(401).json({ message: 'User not authenticated correctly' });
        }

        console.log('Fetching cart for user:', req.user.id);

        // First, find the cart without includes to avoid complex subquery issues
        let cart = await Cart.findOne({
            where: {
                userId: req.user.id,
                status: 'active'
            }
        });

        console.log('Cart found:', cart ? cart.id : 'No active cart');

        if (!cart) {
            console.log('Creating new cart for user:', req.user.id);
            cart = await Cart.create({ userId: req.user.id });
            // Return empty cart structure if just created
            return res.json({
                id: cart.id,
                items: [],
                totalAmount: 0
            });
        }

        // Now fetch cart items separately with product details
        const cartItems = await CartItem.findAll({
            where: {
                cartId: cart.id
            },
            include: [{
                model: Product,
                as: 'product',
                include: [{
                    model: ProductImage,
                    as: 'images',
                    required: false
                }]
            }]
        });

        console.log('Cart items count:', cartItems?.length || 0);

        // Calculate total amount
        let totalAmount = 0;
        if (cartItems) {
            totalAmount = cartItems.reduce((sum, item) => {
                return sum + (parseFloat(item.price) * item.quantity);
            }, 0);
        }

        console.log('Returning cart with', cartItems?.length || 0, 'items, total:', totalAmount);

        res.json({
            id: cart.id,
            items: cartItems || [],
            totalAmount: totalAmount.toFixed(2)
        });

    } catch (error) {
        console.error('Error fetching cart - Full error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
    try {
        const { productId, quantity = 1, size } = req.body;

        // Find product to get price
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Find or create active cart
        const [cart] = await Cart.findOrCreate({
            where: {
                userId: req.user.id,
                status: 'active'
            },
            defaults: { userId: req.user.id }
        });

        // Check if item already exists in cart
        let cartItem = await CartItem.findOne({
            where: {
                cartId: cart.id,
                productId: productId,
                size: size || null
            }
        });

        if (cartItem) {
            // Update quantity
            cartItem.quantity += parseInt(quantity);
            await cartItem.save();
        } else {
            // Create new item
            cartItem = await CartItem.create({
                cartId: cart.id,
                productId: productId,
                quantity: parseInt(quantity),
                price: product.price, // Store current price
                size: size || null
            });
        }

        res.json({ message: 'Item added to cart', cartItem });

    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update cart item quantity
router.put('/item/:id', auth, async (req, res) => {
    try {
        const { quantity } = req.body;
        const cartItem = await CartItem.findByPk(req.params.id);

        if (!cartItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Verify item belongs to user's active cart
        const cart = await Cart.findByPk(cartItem.cartId);
        if (cart.userId !== req.user.id || cart.status !== 'active') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (quantity < 1) {
            await cartItem.destroy();
            return res.json({ message: 'Item removed from cart' });
        }

        cartItem.quantity = quantity;
        await cartItem.save();

        res.json({ message: 'Cart updated', cartItem });

    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove item from cart
router.delete('/item/:id', auth, async (req, res) => {
    try {
        const cartItem = await CartItem.findByPk(req.params.id);

        if (!cartItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Verify item belongs to user's active cart
        const cart = await Cart.findByPk(cartItem.cartId);
        if (cart.userId !== req.user.id || cart.status !== 'active') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await cartItem.destroy();
        res.json({ message: 'Item removed from cart' });

    } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Clear cart
router.delete('/', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({
            where: {
                userId: req.user.id,
                status: 'active'
            }
        });

        if (cart) {
            await CartItem.destroy({
                where: { cartId: cart.id }
            });
        }

        res.json({ message: 'Cart cleared' });

    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
