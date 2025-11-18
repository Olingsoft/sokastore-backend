// models/Stock.js
const { DataTypes } = require("sequelize");
const { Model } = require("sequelize");
const sequelize = require("../database/sequelize");

class Stock extends Model {}

Stock.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Products',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0
            }
        },
        type: {
            type: DataTypes.ENUM('in', 'out'),
            allowNull: false
        },
        reference: {
            type: DataTypes.STRING,
            comment: 'Reference number for the stock movement (e.g., PO number, sales order)'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        unitPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Unit price at the time of stock movement'
        },
        totalValue: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.quantity * (this.unitPrice || 0);
            },
            set() {
                throw new Error('Do not try to set the `totalValue` value!');
            }
        },
        date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: false
        }
    },
    {
        sequelize,
        modelName: "Stock",
        tableName: "Stocks",
        timestamps: true,
        paranoid: true
    }
);

// Import Product model after the Stock model is defined
const Product = require('./Product');

// Add hooks after both models are defined
Stock.addHook('beforeSave', 'updateProductStock', async (stock) => {
    const product = await Product.findByPk(stock.productId);
    
    if (!product) {
        throw new Error('Product not found');
    }

    // Calculate new quantity
    const quantityChange = stock.type === 'in' ? stock.quantity : -stock.quantity;
    const newQuantity = product.stockQuantity + quantityChange;
    
    // Prevent negative stock for out movements
    if (newQuantity < 0) {
        throw new Error('Insufficient stock');
    }

    // Update product stock
    await Product.update(
        { stockQuantity: newQuantity },
        { where: { id: stock.productId } }
    );
});

Stock.addHook('afterDestroy', 'revertProductStock', async (stock) => {
    const product = await Product.findByPk(stock.productId);
    
    if (product) {
        const quantityChange = stock.type === 'in' ? -stock.quantity : stock.quantity;
        const newQuantity = Math.max(0, product.stockQuantity + quantityChange);
        
        await Product.update(
            { stockQuantity: newQuantity },
            { where: { id: stock.productId } }
        );
    }
});

module.exports = Stock;