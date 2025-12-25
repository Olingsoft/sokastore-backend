const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price must be a positive number']
    },
    hasVersions: {
        type: Boolean,
        default: false
    },
    priceFan: {
        type: Number,
        default: 0
    },
    pricePlayer: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        uppercase: true,
        trim: true
    },
    size: {
        type: String,
        trim: true,
        enum: {
            values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size', null],
            message: 'Invalid size'
        }
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    hasCustomization: {
        type: Boolean,
        default: false
    },
    customizationDetails: {
        type: String,
        default: null
    },
    stockQuantity: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for images (referenced in a separate collection)
productSchema.virtual('images', {
    ref: 'ProductImage',
    localField: '_id',
    foreignField: 'productId',
    options: { sort: { position: 1 } } // Sort by position ascending
});

module.exports = mongoose.model('Product', productSchema);