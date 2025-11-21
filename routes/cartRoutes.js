const express = require('express');
const router = express.Router();
const { Cart, CartItem, Product, ProductImage } = require('../models/associations');
const auth = require('../middleware/auth');

// Get user's cart
router.get('/', auth, async (req, res) => {
    try {
        let cart = await Cart.findOne({
            where: {
                userId: req.user.id,
                status: 'active'
            },
            include: [{
                model: CartItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product',
                    include: [{
                        model: ProductImage,
                        as: 'images',
                        where: { isPrimary: true },
                        required: false
                    }]
                }]
            }]
        });

        if (!cart) {
            cart = await Cart.create({ userId: req.user.id });
            // Return empty cart structure if just created
            return res.json({
                id: cart.id,
                items: [],
                totalAmount: 0
            });
        }

        // Calculate total amount
        let totalAmount = 0;
        if (cart.items) {
            totalAmount = cart.items.reduce((sum, item) => {
                return sum + (parseFloat(item.price) * item.quantity);
            }, 0);
        }

        res.json({
            id: cart.id,
            items: cart.items,
            totalAmount: totalAmount.toFixed(2)
        });

    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Server error' });
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
