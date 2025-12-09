const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned'],
        default: 'active',
        required: true
    },
    totalAmount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for items
cartSchema.virtual('items', {
    ref: 'CartItem',
    localField: '_id',
    foreignField: 'cartId'
});

module.exports = mongoose.model('Cart', cartSchema);
