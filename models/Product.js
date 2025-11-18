const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
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
    size: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isIn: {
                args: [['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size', null]],
                msg: 'Invalid size. Must be one of: XS, S, M, L, XL, XXL, XXXL, One Size, or empty'
            }
        }
    },
    
    category: {
        type: DataTypes.STRING,
        allowNull: false,
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
    timestamps: true,
    tableName: 'products',
    underscored: true
});

module.exports = Product;