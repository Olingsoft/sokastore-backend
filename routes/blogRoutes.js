const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only .png, .jpg, .jpeg and .webp format allowed!'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
}).single('image');

// Helper function to handle file upload
const handleFileUpload = (req, res) => {
    return new Promise((resolve, reject) => {
        upload(req, res, (err) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return reject(new Error('File size too large. Maximum 5MB.'));
                } else if (err.message) {
                    return reject(new Error(err.message));
                }
                return reject(new Error('Error uploading file.'));
            }
            resolve();
        });
    });
};

// Serve blog image by ID
router.get('/image/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog || !blog.imageData) {
            return res.status(404).send('Image not found');
        }

        res.set('Content-Type', blog.imageContentType);
        res.send(blog.imageData);
    } catch (error) {
        console.error('Error fetching blog image:', error);
        res.status(500).send('Error fetching image');
    }
});

// Create a new blog post
router.post('/', auth, async (req, res) => {
    try {
        await handleFileUpload(req, res);

        const { title, content, excerpt, author, tags } = req.body;

        if (!title || !content || !excerpt) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const blogData = {
            title,
            content,
            excerpt,
            author: author || 'SokaStore Admin',
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : []
        };

        if (req.file) {
            blogData.imageData = req.file.buffer;
            blogData.imageContentType = req.file.mimetype;
            // Temporary URL, will be updated after save
            blogData.imageUrl = 'placeholder';
        }

        const blog = new Blog(blogData);
        await blog.save();

        if (req.file) {
            blog.imageUrl = `/api/blogs/image/${blog._id}`;
            await blog.save();
        }

        res.status(201).json({
            success: true,
            message: 'Blog post created successfully',
            blog
        });

    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error creating blog post'
        });
    }
});

// Get all active blog posts
router.get('/', async (req, res) => {
    try {
        const blogs = await Blog.find({ isActive: true })
            .select('-imageData') // Exclude buffer from list to save bandwidth
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: blogs.length,
            data: blogs
        });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching blog posts'
        });
    }
});

// Get single blog post by slug
router.get('/:slug', async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug, isActive: true })
            .select('-imageData');

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        res.json({
            success: true,
            data: blog
        });
    } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching blog post'
        });
    }
});

// Update a blog post
router.put('/:id', auth, async (req, res) => {
    try {
        await handleFileUpload(req, res);

        const { title, content, excerpt, author, tags, isActive } = req.body;
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog post not found' });
        }

        if (title) blog.title = title;
        if (content) blog.content = content;
        if (excerpt) blog.excerpt = excerpt;
        if (author) blog.author = author;
        if (isActive !== undefined) blog.isActive = isActive === 'true' || isActive === true;
        if (tags) {
            blog.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        }

        if (req.file) {
            blog.imageData = req.file.buffer;
            blog.imageContentType = req.file.mimetype;
            blog.imageUrl = `/api/blogs/image/${blog._id}`;
        }

        await blog.save();

        res.json({
            success: true,
            message: 'Blog post updated successfully',
            blog: await Blog.findById(blog._id).select('-imageData')
        });

    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating blog post'
        });
    }
});

// Delete a blog post (Soft delete)
router.delete('/:id', auth, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog post not found' });
        }

        blog.isActive = false;
        await blog.save();

        res.json({
            success: true,
            message: 'Blog post deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting blog post'
        });
    }
});

module.exports = router;
