const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    url: {
        type: String,
        required: true
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    position: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ProductImage', productImageSchema);
