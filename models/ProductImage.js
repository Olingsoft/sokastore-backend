const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

const ProductImage = sequelize.define('ProductImage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isPrimary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    position: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true,
    tableName: 'product_images'
});

module.exports = ProductImage;
