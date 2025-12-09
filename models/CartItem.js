const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    cartId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: [1, 'Quantity must be at least 1']
    },
    price: {
        type: Number,
        required: true
    },
    size: {
        type: String,
        default: null
    },
    type: {
        type: String,
        default: null
    },
    customization: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    customizationFee: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CartItem', cartItemSchema);
