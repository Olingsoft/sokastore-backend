const mongoose = require('mongoose');
const Product = require('./Product');

const stockSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    type: {
        type: String,
        enum: ['in', 'out'],
        required: true
    },
    reference: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    unitPrice: {
        type: Number
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

stockSchema.virtual('totalValue').get(function () {
    return this.quantity * (this.unitPrice || 0);
});

// Update product stock before saving
stockSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const product = await Product.findById(this.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            const quantityChange = this.type === 'in' ? this.quantity : -this.quantity;
            const newQuantity = product.stockQuantity + quantityChange;

            if (newQuantity < 0) {
                throw new Error('Insufficient stock');
            }

            product.stockQuantity = newQuantity;
            await product.save();
        } catch (error) {
            return next(error);
        }
    }
    next();
});

module.exports = mongoose.model('Stock', stockSchema);