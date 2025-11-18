// category routes

const express = require("express");
const router = express.Router();
const { Op } = require('sequelize');
const Category = require("../models/Category");

// Get all categories with pagination and search
router.get("/", async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;
        
        const whereClause = search ? {
            [Op.or]: [
                { name: { [Op.iLike]: `%${search}%` } },
                { slug: { [Op.iLike]: `%${search}%` } }
            ]
        } : {};

        const { count, rows: categories } = await Category.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.json({
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
            data: categories
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get category by ID
router.get("/:id", async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        res.json(category);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get category by slug
router.get("/slug/:slug", async (req, res) => {
    try {
        const category = await Category.findOne({ 
            where: { slug: req.params.slug } 
        });
        
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        
        res.json(category);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Create category
router.post("/", async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }
        
        const category = await Category.create({ name });
        res.status(201).json(category);
    } catch (err) {
        console.error(err);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: "Category with this name already exists" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update category
router.put("/:id", async (req, res) => {
    try {
        const { name } = req.body;
        const category = await Category.findByPk(req.params.id);
        
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        
        // Only update if name is provided and different
        if (name && name !== category.name) {
            category.name = name;
            await category.save(); // This will trigger the beforeValidate hook
        }
        
        res.json(category);
    } catch (err) {
        console.error(err);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: "Category with this name already exists" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
});

// Delete category
router.delete("/:id", async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        
        await category.destroy();
        res.json({ message: "Category deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
