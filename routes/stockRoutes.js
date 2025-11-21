const express = require("express");
const { Op } = require('sequelize');
const router = express.Router();
const Stock = require("../models/Stock");
const Product = require("../models/Product");

// Middleware to validate stock data
const validateStockData = (req, res, next) => {
    const { productId, quantity, type, unitPrice } = req.body;
    
    if (!productId || !quantity || !type) {
        return res.status(400).json({ message: "productId, quantity, and type are required" });
    }
    
    if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Quantity must be a positive number" });
    }
    
    if (!['in', 'out'].includes(type)) {
        return res.status(400).json({ message: "Type must be either 'in' or 'out'" });
    }
    
    if (unitPrice && (isNaN(unitPrice) || unitPrice < 0)) {
        return res.status(400).json({ message: "Unit price must be a positive number" });
    }
    
    next();
};

// Get all stock movements with filters
router.get("/", async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            productId, 
            type, 
            startDate, 
            endDate,
            reference
        } = req.query;
        
        const offset = (page - 1) * limit;
        const whereClause = {};
        
        // Apply filters
        if (productId) whereClause.productId = productId;
        if (type) whereClause.type = type;
        if (reference) whereClause.reference = { [Op.iLike]: `%${reference}%` };
        
        // Date range filter
        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) whereClause.date[Op.gte] = new Date(startDate);
            if (endDate) whereClause.date[Op.lte] = new Date(endDate);
        }
        
        const { count, rows: stockMovements } = await Stock.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Product,
                    attributes: ['id', 'name', 'sku']
                }
            ],
            order: [['date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            paranoid: false // Include soft-deleted records if needed
        });
        
        res.json({
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
            data: stockMovements
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get stock movement by ID
router.get("/:id", async (req, res) => {
    try {
        const stockMovement = await Stock.findByPk(req.params.id, {
            include: [
                {
                    model: Product,
                    attributes: ['id', 'name', 'sku']
                }
            ],
            paranoid: false
        });
        
        if (!stockMovement) {
            return res.status(404).json({ message: "Stock movement not found" });
        }
        
        res.json(stockMovement);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Add stock movement
router.post("/", validateStockData, async (req, res) => {
    const transaction = await Stock.sequelize.transaction();
    
    try {
        const { productId, quantity, type, reference, notes, unitPrice } = req.body;
        
        // Check if product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            await transaction.rollback();
            return res.status(404).json({ message: "Product not found" });
        }
        
        // For stock out, check if enough stock is available
        if (type === 'out' && product.stockQuantity < quantity) {
            await transaction.rollback();
            return res.status(400).json({ 
                message: "Insufficient stock available",
                availableQuantity: product.stockQuantity
            });
        }
        
        // Create stock movement
        const stockMovement = await Stock.create({
            productId,
            quantity: parseFloat(quantity),
            type,
            reference,
            notes,
            unitPrice: unitPrice ? parseFloat(unitPrice) : null,
            date: new Date()
        }, { transaction });
        
        await transaction.commit();
        res.status(201).json(stockMovement);
    } catch (err) {
        await transaction.rollback();
        console.error(err);
        res.status(500).json({ 
            message: "Failed to add stock movement",
            error: err.message 
        });
    }
});

// Update stock movement (only certain fields can be updated)
router.put("/:id", async (req, res) => {
    const transaction = await Stock.sequelize.transaction();
    
    try {
        const { reference, notes } = req.body;
        
        const stockMovement = await Stock.findByPk(req.params.id, { transaction });
        
        if (!stockMovement) {
            await transaction.rollback();
            return res.status(404).json({ message: "Stock movement not found" });
        }
        
        // Only allow updating reference and notes
        stockMovement.reference = reference || stockMovement.reference;
        stockMovement.notes = notes !== undefined ? notes : stockMovement.notes;
        
        await stockMovement.save({ transaction });
        await transaction.commit();
        
        res.json(stockMovement);
    } catch (err) {
        await transaction.rollback();
        console.error(err);
        res.status(500).json({ message: "Failed to update stock movement" });
    }
});

// Delete stock movement (soft delete)
router.delete("/:id", async (req, res) => {
    const transaction = await Stock.sequelize.transaction();
    
    try {
        const stockMovement = await Stock.findByPk(req.params.id, { transaction });
        
        if (!stockMovement) {
            await transaction.rollback();
            return res.status(404).json({ message: "Stock movement not found" });
        }
        
        // Soft delete the stock movement
        await stockMovement.destroy({ transaction });
        await transaction.commit();
        
        res.json({ message: "Stock movement deleted successfully" });
    } catch (err) {
        await transaction.rollback();
        console.error(err);
        res.status(500).json({ message: "Failed to delete stock movement" });
    }
});

// Get current stock levels for products
router.get("/products/levels", async (req, res) => {
    try {
        const { minQuantity, maxQuantity } = req.query;

        const movements = await Stock.findAll({
            attributes: ['productId', 'quantity', 'type']
        });

        const totalsByProduct = {};
        for (const movement of movements) {
            const change = movement.type === 'in' ? movement.quantity : -movement.quantity;
            const productId = movement.productId;
            totalsByProduct[productId] = (totalsByProduct[productId] || 0) + change;
        }

        let result = Object.entries(totalsByProduct).map(([productId, quantity]) => ({
            id: Number(productId),
            stockQuantity: quantity,
        }));

        if (minQuantity) {
            const min = parseFloat(minQuantity);
            result = result.filter((item) => item.stockQuantity >= min);
        }

        if (maxQuantity) {
            const max = parseFloat(maxQuantity);
            result = result.filter((item) => item.stockQuantity <= max);
        }

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch stock levels" });
    }
});

// Get stock history for a specific product
router.get("/product/:productId/history", async (req, res) => {
    try {
        const { productId } = req.params;
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        const whereClause = { productId };
        
        // Date range filter
        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) whereClause.date[Op.gte] = new Date(startDate);
            if (endDate) whereClause.date[Op.lte] = new Date(endDate);
        }
        
        const { count, rows: stockMovements } = await Stock.findAndCountAll({
            where: whereClause,
            order: [['date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        // Calculate running balance
        let runningBalance = 0;
        const history = stockMovements.map(movement => {
            const balanceChange = movement.type === 'in' ? movement.quantity : -movement.quantity;
            runningBalance += balanceChange;
            return {
                ...movement.toJSON(),
                runningBalance
            };
        });
        
        res.json({
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
            data: history
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch stock history" });
    }
});

module.exports = router;