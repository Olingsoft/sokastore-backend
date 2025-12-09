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
    data: {
        type: Buffer,
        required: false
    },
    contentType: {
        type: String,
        required: false
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

// Avoid returning the binary data by default when converting to JSON to keep responses light
productImageSchema.set('toJSON', {
    transform: function (doc, ret) {
        delete ret.data;
        return ret;
    }
});

module.exports = mongoose.model('ProductImage', productImageSchema);
