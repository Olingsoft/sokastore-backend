const mongoose = require('mongoose');
const slugify = require('slugify');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Blog title is required'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        required: true
    },
    content: {
        type: String,
        required: [true, 'Content is required']
    },
    excerpt: {
        type: String,
        required: [true, 'Excerpt is required']
    },
    author: {
        type: String,
        default: 'SokaStore Admin'
    },
    imageData: {
        type: Buffer,
        default: null
    },
    imageContentType: {
        type: String,
        default: null
    },
    imageUrl: {
        type: String,
        default: null
    },
    tags: [String],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Generate slug before validation
blogSchema.pre('validate', async function () {
    if (this.title && (!this.slug || this.isModified('title'))) {
        let slug = slugify(this.title, { lower: true, strict: true });
        let count = 1;
        let baseSlug = slug;

        // Check for uniqueness
        while (true) {
            const existing = await this.constructor.findOne({ slug });
            if (!existing || (existing._id.equals(this._id))) break;
            slug = `${baseSlug}-${count++}`;
        }
        this.slug = slug;
    }
});

module.exports = mongoose.model('Blog', blogSchema);
