const express = require('express');
const router = express.Router();
const { Product, ProductImage } = require('../models');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for memory storage
const storage = multer.memoryStorage();

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

// Serve product image by ID
router.get('/image/:id', async (req, res) => {
    try {
        const image = await ProductImage.findById(req.params.id);
        if (!image || !image.data) {
            return res.status(404).send('Image not found');
        }

        res.set('Content-Type', image.contentType);
        res.send(image.data);
    } catch (error) {
        console.error('Error fetching image:', error);
        res.status(500).send('Error fetching image');
    }
});

// Create a new product with multiple images
router.post('/', auth, async (req, res) => {
    try {
        await handleFileUpload(req, res);

        const { name, price, size, category, description, hasCustomization, customizationDetails, hasVersions, priceFan, pricePlayer } = req.body;

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
            customizationDetails: hasCustomization === 'true' ? customizationDetails : null,
            hasVersions: hasVersions === 'true',
            priceFan: hasVersions === 'true' ? parseFloat(priceFan) : 0,
            pricePlayer: hasVersions === 'true' ? parseFloat(pricePlayer) : 0
        });

        await product.save();

        // Process uploaded files
        if (req.files && req.files.length > 0) {
            const imagePromises = req.files.map((file, index) => {
                return ProductImage.create({
                    data: file.buffer,
                    contentType: file.mimetype,
                    isPrimary: index === 0,
                    position: index,
                    productId: product._id,
                    // Temporary URL until ID is generated, but we can use a placeholder or null if we change schema
                    // For now, let's create it and then update the URL
                    url: 'placeholder'
                }).then(image => {
                    // Update the URL to point to the API endpoint
                    image.url = `/api/products/image/${image._id}`;
                    return image.save();
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
        // Note: No need to cleanup files as they are in memory

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
            hasVersions,
            priceFan,
            pricePlayer,
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
        product.hasVersions = hasVersions === 'true';
        product.priceFan = hasVersions === 'true' ? parseFloat(priceFan) : 0;
        product.pricePlayer = hasVersions === 'true' ? parseFloat(pricePlayer) : 0;

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
                    data: file.buffer,
                    contentType: file.mimetype,
                    isPrimary: currentImagesCount === 0 && index === 0,
                    position: currentImagesCount + index,
                    productId: product._id,
                    url: 'placeholder'
                }).then(image => {
                    image.url = `/api/products/image/${image._id}`;
                    return image.save();
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
        // Note: No need to cleanup files as they are in memory

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