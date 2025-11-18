const express = require('express');
const router = express.Router();
const { Product, ProductImage, sequelize } = require('../models');
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
    const transaction = await sequelize.transaction();
    
    try {
        await handleFileUpload(req, res);
        
        const { name, price, size, category, description, hasCustomization, customizationDetails } = req.body;
        
        // Validate required fields
        if (!name || !price || !category || !description) {
            throw new Error('Missing required fields');
        }

        // Create the product
        const product = await Product.create({
            name,
            price: parseFloat(price),
            size: size || null,
            category: category.toUpperCase(),
            description,
            hasCustomization: hasCustomization === 'true',
            customizationDetails: hasCustomization === 'true' ? customizationDetails : null
        }, { transaction });

        // Process uploaded files
        if (req.files && req.files.length > 0) {
            const imagePromises = req.files.map((file, index) => {
                return ProductImage.create({
                    url: `/uploads/products/${path.basename(file.path)}`,
                    isPrimary: index === 0,
                    position: index,
                    productId: product.id
                }, { transaction });
            });
            
            await Promise.all(imagePromises);
        }

        // Fetch the product with its images within the same transaction
        const productWithImages = await Product.findByPk(product.id, {
            include: [{ 
                model: ProductImage, 
                as: 'images',
                attributes: ['id', 'url', 'isPrimary', 'position'],
                order: [['position', 'ASC']]
            }],
            transaction
        });

        // If everything is successful, commit the transaction
        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: productWithImages
        });
        
    } catch (error) {
        // If anything goes wrong, rollback the transaction
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        
        console.error('Error creating product:', error);
        
        // Clean up uploaded files if there was an error
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                if (file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        const statusCode = error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError' 
            ? 400 
            : 500;
            
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Error creating product',
            errors: error.errors ? error.errors.map(e => e.message) : [error.message]
        });
    }
});

// Get all products with their images
router.get('/', async (req, res) => {
    try {
        const products = await Product.findAll({
            where: { isActive: true },
            include: [{
                model: ProductImage,
                as: 'images',
                attributes: ['id', 'url', 'isPrimary', 'position'],
                order: [['position', 'ASC']]
            }],
            order: [['createdAt', 'DESC']]
        });

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
        const product = await Product.findByPk(req.params.id, {
            include: [{
                model: ProductImage,
                as: 'images',
                attributes: ['id', 'url', 'isPrimary', 'position'],
                order: [['position', 'ASC']]
            }]
        });

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

// Update a product
router.put('/:id', auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    
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

        const product = await Product.findByPk(req.params.id, { transaction });
        
        if (!product) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Update product details
        await product.update({
            name,
            price: parseFloat(price),
            size: size || null,
            category: category.toUpperCase(),
            description,
            hasCustomization: hasCustomization === 'true',
            customizationDetails: hasCustomization === 'true' ? customizationDetails : null
        }, { transaction });

        // Handle image removal
        const imagesToRemove = JSON.parse(removeImages);
        if (imagesToRemove && imagesToRemove.length > 0) {
            await ProductImage.destroy({
                where: {
                    id: imagesToRemove,
                    productId: product.id
                },
                transaction
            });
        }

        // Process new uploaded files
        if (req.files && req.files.length > 0) {
            const currentImages = await ProductImage.findAll({
                where: { productId: product.id },
                transaction
            });

            const imagePromises = req.files.map((file, index) => {
                return ProductImage.create({
                    url: `/uploads/products/${path.basename(file.path)}`,
                    isPrimary: currentImages.length === 0 && index === 0, // Set as primary if no images exist
                    position: currentImages.length + index,
                    productId: product.id
                }, { transaction });
            });
            
            await Promise.all(imagePromises);
        }

        // Fetch the updated product with its images
        const updatedProduct = await Product.findByPk(product.id, {
            include: [{
                model: ProductImage,
                as: 'images',
                attributes: ['id', 'url', 'isPrimary', 'position'],
                order: [['position', 'ASC']]
            }],
            transaction
        });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct
        });
        
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        
        console.error('Error updating product:', error);
        
        // Clean up uploaded files if there was an error
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                if (file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        const statusCode = error.name === 'SequelizeValidationError' ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Error updating product',
            errors: error.errors ? error.errors.map(e => e.message) : [error.message]
        });
    }
});

// Delete a product
router.delete('/:id', auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const product = await Product.findByPk(req.params.id, {
            include: [{ model: ProductImage, as: 'images' }],
            transaction
        });

        if (!product) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Soft delete the product
        await product.update({ isActive: false }, { transaction });

        // Or hard delete with:
        // await product.destroy({ transaction });
        // await ProductImage.destroy({ where: { productId: product.id }, transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
        
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting product'
        });
    }
});

// Set primary image for a product
router.put('/:id/primary-image/:imageId', auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id, imageId } = req.params;

        // Reset all images' isPrimary to false
        await ProductImage.update(
            { isPrimary: false },
            { 
                where: { productId: id },
                transaction
            }
        );

        // Set the selected image as primary
        const [updated] = await ProductImage.update(
            { isPrimary: true },
            { 
                where: { 
                    id: imageId,
                    productId: id 
                },
                transaction
            }
        );

        if (!updated) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        await transaction.commit();

        res.json({
            success: true,
            message: 'Primary image updated successfully'
        });
        
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        
        console.error('Error setting primary image:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting primary image'
        });
    }
});

module.exports = router;