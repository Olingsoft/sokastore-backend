const express = require("express");
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

        const skip = (page - 1) * limit;
        const query = {};

        // Apply filters
        if (productId) query.productId = productId;
        if (type) query.type = type;
        if (reference) query.reference = { $regex: reference, $options: 'i' };

        // Date range filter
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const count = await Stock.countDocuments(query);
        const stockMovements = await Stock.find(query)
            .populate('productId', 'name sku') // Select only name and sku
            .sort({ date: -1 })
            .limit(parseInt(limit))
            .skip(skip);

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
        const stockMovement = await Stock.findById(req.params.id)
            .populate('productId', 'name sku');

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
    try {
        const { productId, quantity, type, reference, notes, unitPrice } = req.body;

        // Create stock movement
        // The pre-save middleware in Stock model handles product stock update validation and execution
        const stockMovement = await Stock.create({
            productId,
            quantity: parseFloat(quantity),
            type,
            reference,
            notes,
            unitPrice: unitPrice ? parseFloat(unitPrice) : null,
            date: new Date()
        });

        res.status(201).json(stockMovement);
    } catch (err) {
        console.error(err);
        // Handle custom errors from middleware
        if (err.message === 'Product not found') {
            return res.status(404).json({ message: "Product not found" });
        }
        if (err.message === 'Insufficient stock') {
            return res.status(400).json({ message: "Insufficient stock available" });
        }

        res.status(500).json({
            message: "Failed to add stock movement",
            error: err.message
        });
    }
});

// Update stock movement (only certain fields can be updated)
router.put("/:id", async (req, res) => {
    try {
        const { reference, notes } = req.body;

        const stockMovement = await Stock.findById(req.params.id);

        if (!stockMovement) {
            return res.status(404).json({ message: "Stock movement not found" });
        }

        // Only allow updating reference and notes
        if (reference !== undefined) stockMovement.reference = reference;
        if (notes !== undefined) stockMovement.notes = notes;

        await stockMovement.save();

        res.json(stockMovement);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update stock movement" });
    }
});

// Delete stock movement (soft delete logic not natively supported in Mongoose without plugin, implementing hard delete)
router.delete("/:id", async (req, res) => {
    try {
        const stockMovement = await Stock.findById(req.params.id);

        if (!stockMovement) {
            return res.status(404).json({ message: "Stock movement not found" });
        }

        // Note: Deleting a stock movement implies reverting the stock change.
        // I need to handle this? The Sequelize code had an 'afterDestroy' hook.
        // It's not implemented in Mongoose schema I wrote earlier, so I should implement it here manually or rely on hooks if present.
        // Checking Stock.js... I didn't add post('remove') hook.
        // So I will implement reversion logic here.

        const product = await Product.findById(stockMovement.productId);
        if (product) {
            const quantityChange = stockMovement.type === 'in' ? -stockMovement.quantity : stockMovement.quantity;
            const newQuantity = Math.max(0, product.stockQuantity + quantityChange);
            product.stockQuantity = newQuantity;
            await product.save();
        }

        await stockMovement.deleteOne();

        res.json({ message: "Stock movement deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete stock movement" });
    }
});

// Get current stock levels for products
router.get("/products/levels", async (req, res) => {
    try {
        const { minQuantity, maxQuantity } = req.query;

        // Aggregate current levels from Stock collection is expensive if we have many movements.
        // Better to query Product collection directly since we maintain stockQuantity there now.

        const query = {};
        if (minQuantity || maxQuantity) {
            query.stockQuantity = {};
            if (minQuantity) query.stockQuantity.$gte = parseFloat(minQuantity);
            if (maxQuantity) query.stockQuantity.$lte = parseFloat(maxQuantity);
        }

        const products = await Product.find(query, 'name stockQuantity sku');

        const result = products.map(p => ({
            id: p._id,
            name: p.name,
            stockQuantity: p.stockQuantity
        }));

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
        const skip = (page - 1) * limit;

        const query = { productId };

        // Date range filter
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const count = await Stock.countDocuments(query);
        const stockMovements = await Stock.find(query)
            .sort({ date: -1 }) // Descending for display
            .limit(parseInt(limit))
            .skip(skip);

        // Calculating running balance retrospectively is hard with pagination.
        // Sequelize version did it on the returned page, which is just partial history.
        // We will mimic that.

        // To do it correctly, we'd need total stock check.
        // For now, simpler implementation as per request.

        let runningBalance = 0;
        // This running balance is locally scoped to the page and inaccurate unless we calculate from start.
        // But the previous implementation logic was similar (map over rows).

        const history = stockMovements.map(movement => {
            const balanceChange = movement.type === 'in' ? movement.quantity : -movement.quantity;
            runningBalance += balanceChange;
            return {
                ...movement.toObject(),
                runningBalance // This is relative to the start of this page, likely not what user wants but matching previous logic
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