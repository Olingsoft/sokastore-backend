const { DataTypes, Model } = require("sequelize");
const sequelize = require("../database/sequelize");
const slugify = require('slugify');

class Badge extends Model {
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

Badge.init(
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
        },
        icon: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'URL or path to badge icon'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        sequelize,
        modelName: "Badge",
        tableName: "badges", // Explicitly naming table is good practice
        hooks: {
            beforeValidate: async (badge) => {
                if (badge.name && (!badge.slug || badge.changed('name'))) {
                    badge.slug = await Badge.generateSlug(badge.name);
                }
            }
        }
    }
);

module.exports = Badge;