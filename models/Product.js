const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const Product = sequelize.define('Product', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Product name is required'
            }
        }
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: {
                msg: 'Price must be a valid number'
            },
            min: {
                args: [0],
                msg: 'Price must be a positive number'
            }
        }
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Category is required'
            }
        }
    },
    size: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
            isIn: {
                args: [['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size', null]],
                msg: 'Invalid size. Must be one of: XS, S, M, L, XL, XXL, XXXL, One Size, or empty'
            }
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Description is required'
            }
        }
    },
    hasCustomization: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    customizationDetails: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'products',
    timestamps: true,
    underscored: false,
    paranoid: true,
    defaultScope: {
        where: {
            isActive: true
        }
    },
    scopes: {
        withInactive: {
            where: {
                isActive: true
            }
        }
    }
});

module.exports = Product;