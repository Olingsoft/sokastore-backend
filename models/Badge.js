const mongoose = require('mongoose');
const slugify = require('slugify');

const badgeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Badge name is required'],
        unique: true,
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    slug: {
        type: String,
        unique: true,
        required: true
    },
    icon: {
        type: String,
        default: null
    },
    description: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

badgeSchema.pre('validate', async function (next) {
    if (this.name && (!this.slug || this.isModified('name'))) {
        let slug = slugify(this.name, { lower: true, strict: true });
        let count = 1;
        let baseSlug = slug;

        // Check for uniqueness
        // Note: usage of 'this.constructor' refers to the Model
        while (true) {
            const existing = await this.constructor.findOne({ slug });
            if (!existing || (existing._id.equals(this._id))) break;
            slug = `${baseSlug}-${count++}`;
        }
        this.slug = slug;
    }
    next();
});

module.exports = mongoose.model('Badge', badgeSchema);