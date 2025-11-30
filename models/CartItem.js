const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const CartItem = sequelize.define('CartItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cartId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'carts',
            key: 'id'
        }
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 1
        }
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Snapshot of product price at time of addition'
    },
    size: {
        type: DataTypes.STRING,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Product type (e.g., Replica, Authentic)'
    },
    customization: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Customization details (playerName, playerNumber, selectedBadge)'
    },
    customizationFee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Additional fee for customization'
    }
}, {
    tableName: 'cart_items',
    timestamps: true,
    underscored: true
});

module.exports = CartItem;
