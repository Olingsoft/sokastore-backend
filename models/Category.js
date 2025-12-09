const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    slug: {
        type: String,
        unique: true,
        required: true
    }
}, {
    timestamps: true
});

categorySchema.pre('validate', async function (next) {
    if (this.name && (!this.slug || this.isModified('name'))) {
        let slug = slugify(this.name, { lower: true, strict: true });
        let count = 1;
        let baseSlug = slug;

        while (true) {
            const existing = await this.constructor.findOne({ slug });
            if (!existing || (existing._id.equals(this._id))) break;
            slug = `${baseSlug}-${count++}`;
        }
        this.slug = slug;
    }
    next();
});

module.exports = mongoose.model('Category', categorySchema);
