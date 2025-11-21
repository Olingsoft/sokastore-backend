const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'orders',
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
    // Product snapshot at time of order
    productName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Product name at time of purchase'
    },
    productImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Primary product image URL'
    },
    // Order details
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
        comment: 'Unit price at time of purchase'
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'quantity * price'
    },
    // Product variations
    size: {
        type: DataTypes.STRING,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Customization details (stored as JSON)
    customization: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Customization options like player name, number, badge'
    },
    customizationFee: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false
    }
}, {
    tableName: 'order_items',
    timestamps: true,
    underscored: true
});

module.exports = OrderItem;
