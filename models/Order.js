const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    // Customer Details
    customerName: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        default: null
    },
    // Delivery Information
    deliveryType: {
        type: String,
        enum: ['pickup', 'delivery'],
        default: 'delivery',
        required: true
    },
    deliveryZone: {
        type: String,
        default: null
    },
    deliveryAddress: {
        type: String,
        default: null
    },
    deliveryFee: {
        type: Number,
        default: 0
    },
    // Order Amounts
    subtotal: {
        type: Number,
        required: true
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    // Payment Information
    paymentMethod: {
        type: String,
        enum: ['mpesa', 'card', 'cash'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
        required: true
    },
    paymentPhone: {
        type: String,
        default: null
    },
    transactionId: {
        type: String,
        default: null
    },
    // Order Status
    orderStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
        required: true
    },
    notes: {
        type: String,
        default: null
    },
    paidAt: {
        type: Date,
        default: null
    },
    shippedAt: {
        type: Date,
        default: null
    },
    deliveredAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for items
orderSchema.virtual('items', {
    ref: 'OrderItem',
    localField: '_id',
    foreignField: 'orderId'
});

module.exports = mongoose.model('Order', orderSchema);
