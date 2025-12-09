const express = require('express');
const router = express.Router();
const { Product, ProductImage } = require('../models');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for multiple file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
    fileFilter: fileFilter
}).array('images', 10); // 'images' is the field name, max 10 files

// Helper function to handle multiple file uploads
const handleFileUpload = (req, res) => {
    return new Promise((resolve, reject) => {
        upload(req, res, (err) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return reject(new Error('File size too large. Maximum 5MB per file.'));
                } else if (err.message) {
                    return reject(new Error(err.message));
                }
                return reject(new Error('Error uploading files.'));
            }
            resolve();
        });
    });
};

// Create a new product with multiple images
router.post('/', auth, async (req, res) => {
    try {
        await handleFileUpload(req, res);

        const { name, price, size, category, description, hasCustomization, customizationDetails } = req.body;

        // Validate required fields
        if (!name || !price || !category || !description) {
            throw new Error('Missing required fields');
        }

        // Create the product
        const product = new Product({
            name,
            price: parseFloat(price),
            size: size || null,
            category: category.toUpperCase(),
            description,
            hasCustomization: hasCustomization === 'true',
            customizationDetails: hasCustomization === 'true' ? customizationDetails : null
        });

        await product.save();

        // Process uploaded files
        if (req.files && req.files.length > 0) {
            const imagePromises = req.files.map((file, index) => {
                return ProductImage.create({
                    url: `/uploads/products/${path.basename(file.path)}`,
                    isPrimary: index === 0,
                    position: index,
                    productId: product._id
                });
            });

            await Promise.all(imagePromises);
        }

        // Fetch the product with its images
        const productWithImages = await Product.findById(product._id).populate('images');

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: productWithImages
        });

    } catch (error) {
        console.error('Error creating product:', error);

        // Clean up uploaded files if there was an error
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                if (file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        const statusCode = error.name === 'ValidationError' ? 400 : 500;

        res.status(statusCode).json({
            success: false,
            message: error.message || 'Error creating product',
            errors: error.errors ? Object.values(error.errors).map(e => e.message) : [error.message]
        });
    }
});

// Get all products with their images
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true })
            .populate('images')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products'
        });
    }
});

// Get single product by ID with images
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('images');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product'
        });
    }
});

// Get related products
router.get('/related/:id', async (req, res) => {
    try {
        const currentProduct = await Product.findById(req.params.id);

        if (!currentProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // MongoDB aggregation for random sample or find with limit
        const relatedProducts = await Product.aggregate([
            {
                $match: {
                    category: currentProduct.category,
                    _id: { $ne: currentProduct._id },
                    isActive: true
                }
            },
            { $sample: { size: 4 } }
        ]);

        // Populate images for aggregated results
        await Product.populate(relatedProducts, {
            path: 'images',
            match: { isPrimary: true }
        });

        res.json({
            success: true,
            count: relatedProducts.length,
            data: relatedProducts
        });
    } catch (error) {
        console.error('Error fetching related products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching related products'
        });
    }
});

// Update a product
router.put('/:id', auth, async (req, res) => {
    try {
        await handleFileUpload(req, res);

        const {
            name,
            price,
            size,
            category,
            description,
            hasCustomization,
            customizationDetails,
            removeImages = '[]'
        } = req.body;

        let product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Update product details
        product.name = name || product.name;
        product.price = price ? parseFloat(price) : product.price;
        product.size = size || null; // Explicit null if passed empty
        product.category = category ? category.toUpperCase() : product.category;
        product.description = description || product.description;
        product.hasCustomization = hasCustomization === 'true';
        product.customizationDetails = hasCustomization === 'true' ? customizationDetails : null;

        await product.save();

        // Handle image removal
        const imagesToRemove = JSON.parse(removeImages);
        if (imagesToRemove && imagesToRemove.length > 0) {
            await ProductImage.deleteMany({
                _id: { $in: imagesToRemove },
                productId: product._id
            });
        }

        // Process new uploaded files
        if (req.files && req.files.length > 0) {
            const currentImagesCount = await ProductImage.countDocuments({ productId: product._id });

            const imagePromises = req.files.map((file, index) => {
                return ProductImage.create({
                    url: `/uploads/products/${path.basename(file.path)}`,
                    isPrimary: currentImagesCount === 0 && index === 0,
                    position: currentImagesCount + index,
                    productId: product._id
                });
            });

            await Promise.all(imagePromises);
        }

        // Fetch the updated product with its images
        const updatedProduct = await Product.findById(product._id).populate('images');

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct
        });

    } catch (error) {
        console.error('Error updating product:', error);

        // Clean up uploaded files if there was an error
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                if (file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        const statusCode = error.name === 'ValidationError' ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Error updating product',
            errors: error.errors ? Object.values(error.errors).map(e => e.message) : [error.message]
        });
    }
});

// Delete a product
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Soft delete
        product.isActive = false;
        await product.save();

        // Hard delete equivalent (commented out as per original)
        // await product.deleteOne();
        // await ProductImage.deleteMany({ productId: product._id });

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting product'
        });
    }
});

// Set primary image for a product
router.put('/:id/primary-image/:imageId', auth, async (req, res) => {
    try {
        const { id, imageId } = req.params;

        // Reset all images' isPrimary to false
        await ProductImage.updateMany(
            { productId: id },
            { isPrimary: false }
        );

        // Set the selected image as primary
        const updated = await ProductImage.findOneAndUpdate(
            { _id: imageId, productId: id },
            { isPrimary: true },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        res.json({
            success: true,
            message: 'Primary image updated successfully'
        });

    } catch (error) {
        console.error('Error setting primary image:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting primary image'
        });
    }
});

module.exports = router;