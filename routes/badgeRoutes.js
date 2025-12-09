const express = require('express');
const router = express.Router();
const Badge = require('../models/Badge');

// Get all badges
router.get('/', async (req, res) => {
    try {
        const badges = await Badge.find();
        res.json(badges);
    } catch (error) {
        console.error('Error fetching badges:', error);
        res.status(500).json({ message: 'Server error fetching badges' });
    }
});

// Get single badge by ID
router.get('/:id', async (req, res) => {
    try {
        const badge = await Badge.findById(req.params.id);
        if (!badge) {
            return res.status(404).json({ message: 'Badge not found' });
        }
        res.json(badge);
    } catch (error) {
        console.error('Error fetching badge:', error);
        res.status(500).json({ message: 'Server error fetching badge' });
    }
});

// Create a new badge
router.post('/', async (req, res) => {
    try {
        const { name, icon, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Badge name is required' });
        }

        const newBadge = await Badge.create({
            name,
            icon,
            description
        });

        res.status(201).json(newBadge);
    } catch (error) {
        console.error('Error creating badge:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Badge name already exists' });
        }
        res.status(500).json({ message: 'Server error creating badge' });
    }
});

// Update a badge
router.put('/:id', async (req, res) => {
    try {
        const { name, icon, description } = req.body;
        const badge = await Badge.findById(req.params.id);

        if (!badge) {
            return res.status(404).json({ message: 'Badge not found' });
        }

        // Update fields if provided
        if (name) badge.name = name;
        if (icon !== undefined) badge.icon = icon;
        if (description !== undefined) badge.description = description;

        await badge.save();
        res.json(badge);
    } catch (error) {
        console.error('Error updating badge:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Badge name already exists' });
        }
        res.status(500).json({ message: 'Server error updating badge' });
    }
});

// Delete a badge
router.delete('/:id', async (req, res) => {
    try {
        const badge = await Badge.findById(req.params.id);

        if (!badge) {
            return res.status(404).json({ message: 'Badge not found' });
        }

        await badge.deleteOne();
        res.json({ message: 'Badge deleted successfully' });
    } catch (error) {
        console.error('Error deleting badge:', error);
        res.status(500).json({ message: 'Server error deleting badge' });
    }
});

module.exports = router;