const express = require('express');
const router = express.Router();
const { Order, OrderItem, Cart, CartItem, Product } = require('../models');
const auth = require('../middleware/auth');

// Helper function to generate unique order number
const generateOrderNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
};

// Create new order from cart
router.post('/create', auth, async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            customerEmail,
            deliveryType,
            deliveryZone,
            deliveryAddress,
            deliveryFee,
            paymentMethod,
            paymentPhone,
            notes
        } = req.body;

        // Validate required fields
        if (!customerName || !customerPhone || !paymentMethod) {
            return res.status(400).json({
                message: 'Missing required fields: customerName, customerPhone, paymentMethod'
            });
        }

        // Get user's active cart
        const cart = await Cart.findOne({
            userId: req.user.id,
            status: 'active'
        });

        if (!cart) {
            return res.status(400).json({ message: 'No active cart found' });
        }

        // Fetch cart items with product details
        const cartItems = await CartItem.find({ cartId: cart._id })
            .populate({
                path: 'productId',
                populate: { path: 'images' }
            });

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Calculate totals
        let subtotal = 0;
        const orderItemsData = [];

        for (const cartItem of cartItems) {
            const product = cartItem.productId; // Populated product
            if (!product) continue; // Skip if product doesn't exist

            const itemPrice = cartItem.price;
            const customFee = cartItem.customizationFee || 0;
            const itemSubtotal = (itemPrice + customFee) * cartItem.quantity;
            subtotal += itemSubtotal;

            // Get primary image
            const primaryImage = product.images?.find(img => img.isPrimary)?.url ||
                product.images?.[0]?.url || null;

            orderItemsData.push({
                productId: product._id,
                productName: product.name,
                productImage: primaryImage,
                quantity: cartItem.quantity,
                price: cartItem.price,
                subtotal: itemSubtotal,
                size: cartItem.size,
                type: cartItem.type || null,
                customization: cartItem.customization || null,
                customizationFee: cartItem.customizationFee || 0
            });
        }

        const taxAmount = subtotal * 0.08; // 8% tax
        const totalAmount = subtotal + parseFloat(deliveryFee || 0) + taxAmount;

        // Create order
        const order = await Order.create({
            userId: req.user.id,
            orderNumber: generateOrderNumber(),
            customerName,
            customerPhone,
            customerEmail: customerEmail || null,
            deliveryType: deliveryType || 'delivery',
            deliveryZone: deliveryZone || null,
            deliveryAddress: deliveryAddress || null,
            deliveryFee: deliveryFee || 0,
            subtotal,
            taxAmount,
            totalAmount,
            paymentMethod,
            paymentStatus: 'pending',
            paymentPhone: paymentPhone || customerPhone,
            orderStatus: 'pending',
            notes: notes || null
        });

        // Create order items
        const orderItemsPromises = orderItemsData.map(item => {
            return OrderItem.create({
                orderId: order._id,
                ...item
            });
        });
        await Promise.all(orderItemsPromises);

        // Mark cart as completed and clear items
        cart.status = 'completed';
        await cart.save();
        await CartItem.deleteMany({ cartId: cart._id });

        // Fetch complete order with items
        // Since items are virtual, we can populate them
        const completeOrder = await Order.findById(order._id).populate('items');

        res.status(201).json({
            message: 'Order created successfully',
            order: completeOrder
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            message: 'Failed to create order',
            error: error.message
        });
    }
});

// Get user's orders
router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id })
            .populate('items')
            .sort({ createdAt: -1 });

        res.json({ orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// Get all orders (Admin)
router.get('/all', auth, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('items')
            .sort({ createdAt: -1 });
        res.json({ orders });
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// Get single order by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            userId: req.user.id
        }).populate('items');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({ order });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Failed to fetch order' });
    }
});

// Update payment status and order status (Admin/System)
router.put('/:id/payment-status', auth, async (req, res) => {
    try {
        const { paymentStatus, transactionId, orderStatus } = req.body;

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (paymentStatus) order.paymentStatus = paymentStatus;
        if (transactionId) order.transactionId = transactionId;
        if (orderStatus) order.orderStatus = orderStatus;

        // Auto-update logic if only payment status is sent
        if (paymentStatus === 'paid' && !orderStatus) {
            order.paidAt = new Date();
        }

        await order.save();

        res.json({ message: 'Order updated successfully', order });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Failed to update order' });
    }
});

// Cancel order
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.orderStatus === 'delivered' || order.orderStatus === 'shipped') {
            return res.status(400).json({
                message: 'Cannot cancel order that has been shipped or delivered'
            });
        }

        order.orderStatus = 'cancelled';
        await order.save();

        res.json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Failed to cancel order' });
    }
});

// Delete order
router.delete('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Delete associated items
        await OrderItem.deleteMany({ orderId: order._id });
        await order.deleteOne();

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: 'Failed to delete order' });
    }
});

module.exports = router;
