const Product = require('./Product');
const ProductImage = require('./ProductImage');

// Define associations
Product.hasMany(ProductImage, {
    foreignKey: 'productId',
    as: 'images',
    onDelete: 'CASCADE'
});

ProductImage.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product',
    onDelete: 'CASCADE'
});

module.exports = { Product, ProductImage };
