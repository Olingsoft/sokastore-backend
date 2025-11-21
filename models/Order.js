const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    orderNumber: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        comment: 'Unique order reference number'
    },
    // Customer Details
    customerName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    customerPhone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    customerEmail: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Delivery Information
    deliveryType: {
        type: DataTypes.ENUM('pickup', 'delivery'),
        defaultValue: 'delivery',
        allowNull: false
    },
    deliveryZone: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Delivery zone (e.g., Nairobi, Kiambu)'
    },
    deliveryAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Full delivery address'
    },
    deliveryFee: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false
    },
    // Order Amounts
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Sum of all items before fees and taxes'
    },
    taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Final total including all fees'
    },
    // Payment Information
    paymentMethod: {
        type: DataTypes.ENUM('mpesa', 'card', 'cash'),
        allowNull: false
    },
    paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        defaultValue: 'pending',
        allowNull: false
    },
    paymentPhone: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Phone number used for M-Pesa payment'
    },
    transactionId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Payment gateway transaction ID'
    },
    // Order Status
    orderStatus: {
        type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false
    },
    // Additional Information
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Special instructions or notes'
    },
    // Timestamps for tracking
    paidAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    shippedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'orders',
    timestamps: true,
    underscored: true
});

module.exports = Order;
