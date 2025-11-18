// category model

const { DataTypes } = require("sequelize");
const { Model } = require("sequelize");
const sequelize = require("../database/sequelize");
const slugify = require('slugify');

class Category extends Model {
    static async generateSlug(name) {
        let slug = slugify(name, { lower: true, strict: true });
        let count = 1;
        let baseSlug = slug;
        
        while (true) {
            const existing = await this.findOne({ where: { slug } });
            if (!existing) return slug;
            slug = `${baseSlug}-${count++}`;
        }
    }
}

Category.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
                len: [2, 100]
            }
        },
        slug: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        }
    },
    {
        sequelize,
        modelName: "Category",
        hooks: {
            beforeValidate: async (category) => {
                if (category.name && (!category.slug || category.changed('name'))) {
                    category.slug = await Category.generateSlug(category.name);
                }
            }
        }
    }
);

module.exports = Category;
