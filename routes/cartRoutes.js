const express = require('express');
const router = express.Router();
const { Cart, CartItem, Product } = require('../models');
const auth = require('../middleware/auth');

// Get user's cart
router.get('/', auth, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated correctly' });
        }

        // Find active cart
        let cart = await Cart.findOne({
            userId: req.user.id,
            status: 'active'
        });

        if (!cart) {
            cart = await Cart.create({ userId: req.user.id });
            return res.json({
                id: cart._id,
                items: [],
                totalAmount: 0
            });
        }

        // Fetch cart items with product details and images
        const cartItems = await CartItem.find({ cartId: cart._id })
            .populate({
                path: 'productId',
                populate: { path: 'images' } // Populate virtual images on Product
            });

        // Calculate total amount
        let totalAmount = 0;
        if (cartItems) {
            totalAmount = cartItems.reduce((sum, item) => {
                if (!item.productId) return sum; // Handle deleted products
                const itemPrice = item.price * item.quantity;
                const customFee = (item.customizationFee || 0) * item.quantity;
                return sum + itemPrice + customFee;
            }, 0);
        }

        // Map items to include product details structure similar to previous response
        const formattedItems = cartItems.map(item => {
            const product = item.productId;
            if (!product) return item; // Orphaned item

            return {
                ...item.toObject(),
                product: product
            };
        });

        res.json({
            id: cart._id,
            items: formattedItems,
            totalAmount: totalAmount.toFixed(2)
        });

    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
    try {
        const { productId, quantity = 1, size, type, customization, customizationFee } = req.body;

        // Find product to get price
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Find or create active cart
        let cart = await Cart.findOne({
            userId: req.user.id,
            status: 'active'
        });

        if (!cart) {
            cart = await Cart.create({ userId: req.user.id });
        }

        // Check if item already exists
        let cartItem = await CartItem.findOne({
            cartId: cart._id,
            productId: productId,
            size: size || null,
            type: type || null,
            // Deep comparison of customization object might need better handling
            // for now assume simple equality or null
            customization: customization || null
        });

        if (cartItem) {
            // Update quantity
            cartItem.quantity += parseInt(quantity);
            await cartItem.save();
        } else {
            // Determine price based on version if applicable
            let itemPrice = product.price;
            if (product.hasVersions) {
                if (type === 'Fan Version') {
                    itemPrice = product.priceFan;
                } else if (type === 'Player Version') {
                    itemPrice = product.pricePlayer;
                }
            }

            // Create new item
            cartItem = await CartItem.create({
                cartId: cart._id,
                productId: productId,
                quantity: parseInt(quantity),
                price: itemPrice,
                size: size || null,
                type: type || null,
                customization: customization || null,
                customizationFee: customizationFee || 0
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
        const cartItem = await CartItem.findById(req.params.id);

        if (!cartItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Verify item belongs to user's active cart
        const cart = await Cart.findById(cartItem.cartId);
        if (!cart || cart.userId.toString() !== req.user.id || cart.status !== 'active') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (quantity < 1) {
            await cartItem.deleteOne();
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
        const cartItem = await CartItem.findById(req.params.id);

        if (!cartItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Verify item belongs to user's active cart
        const cart = await Cart.findById(cartItem.cartId);
        if (!cart || cart.userId.toString() !== req.user.id || cart.status !== 'active') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await cartItem.deleteOne();
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
            userId: req.user.id,
            status: 'active'
        });

        if (cart) {
            await CartItem.deleteMany({ cartId: cart._id });
        }

        res.json({ message: 'Cart cleared' });

    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
