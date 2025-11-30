const express = require('express');
const router = express.Router();
const { Order, OrderItem, Cart, CartItem, Product, ProductImage } = require('../models/associations');
const auth = require('../middleware/auth');

// Helper function to generate unique order number
const generateOrderNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
};

// Create new order from cart
router.post('/create', auth, async (req, res) => {
    const transaction = await Order.sequelize.transaction();

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

        // Get user's active cart (step 1: find cart)
        const cart = await Cart.findOne({
            where: {
                userId: req.user.id,
                status: 'active'
            },
            transaction
        });

        if (!cart) {
            await transaction.rollback();
            return res.status(400).json({ message: 'No active cart found' });
        }

        // Step 2: Fetch cart items separately to avoid Sequelize query bug
        const cartItems = await CartItem.findAll({
            where: { cartId: cart.id },
            include: [{
                model: Product,
                as: 'product',
                include: [{
                    model: ProductImage,
                    as: 'images',
                    required: false
                }]
            }],
            transaction
        });

        if (!cartItems || cartItems.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const cartItem of cartItems) {
            const itemPrice = parseFloat(cartItem.price);
            const customFee = parseFloat(cartItem.customizationFee || 0);
            const itemSubtotal = (itemPrice + customFee) * cartItem.quantity;
            subtotal += itemSubtotal;

            // Get primary image
            const primaryImage = cartItem.product?.images?.find(img => img.isPrimary)?.url ||
                cartItem.product?.images?.[0]?.url || null;

            orderItems.push({
                productId: cartItem.productId,
                productName: cartItem.product?.name || 'Unknown Product',
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
        }, { transaction });

        // Create order items
        for (const item of orderItems) {
            await OrderItem.create({
                orderId: order.id,
                ...item
            }, { transaction });
        }

        // Mark cart as completed and clear items
        await cart.update({ status: 'completed' }, { transaction });
        await CartItem.destroy({
            where: { cartId: cart.id },
            transaction
        });

        await transaction.commit();

        // Fetch complete order with items
        const completeOrder = await Order.findByPk(order.id, {
            include: [{
                model: OrderItem,
                as: 'items'
            }]
        });

        res.status(201).json({
            message: 'Order created successfully',
            order: completeOrder
        });

    } catch (error) {
        await transaction.rollback();
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
        const orders = await Order.findAll({
            where: { userId: req.user.id },
            include: [{
                model: OrderItem,
                as: 'items'
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json({ orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// Get all orders (Admin) - MUST be before /:id route
router.get('/all', auth, async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [{
                model: OrderItem,
                as: 'items'
            }],
            order: [['createdAt', 'DESC']]
        });
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
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            include: [{
                model: OrderItem,
                as: 'items'
            }]
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({ order });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Failed to fetch order' });
    }
});

// Update payment status (for payment gateway callbacks)
// Update payment status and order status (Admin/System)
router.put('/:id/payment-status', auth, async (req, res) => {
    try {
        const { paymentStatus, transactionId, orderStatus } = req.body;

        const order = await Order.findByPk(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const updateData = {};
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (transactionId) updateData.transactionId = transactionId;
        if (orderStatus) updateData.orderStatus = orderStatus;

        // Auto-update logic if only payment status is sent
        if (paymentStatus === 'paid' && !orderStatus) {
            updateData.paidAt = new Date();
            // Keep orderStatus as 'pending' by default - admin will update it manually
        }

        await order.update(updateData);

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
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.orderStatus === 'delivered' || order.orderStatus === 'shipped') {
            return res.status(400).json({
                message: 'Cannot cancel order that has been shipped or delivered'
            });
        }

        await order.update({ orderStatus: 'cancelled' });

        res.json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Failed to cancel order' });
    }
});

// Delete order
router.delete('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Delete associated items
        await OrderItem.destroy({ where: { orderId: order.id } });
        await order.destroy();

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: 'Failed to delete order' });
    }
});

module.exports = router;
