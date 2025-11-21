const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const Cart = sequelize.define('Cart', {
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
    status: {
        type: DataTypes.ENUM('active', 'completed', 'abandoned'),
        defaultValue: 'active',
        allowNull: false
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false
    }
}, {
    tableName: 'carts',
    timestamps: true
});

module.exports = Cart;
