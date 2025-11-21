const Product = require('./Product');
const ProductImage = require('./ProductImage');
const User = require('./User');
const Cart = require('./CartModel');
const CartItem = require('./CartItem');

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

// User - Cart
User.hasMany(Cart, {
    foreignKey: 'userId',
    as: 'carts'
});

Cart.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// Cart - CartItem
Cart.hasMany(CartItem, {
    foreignKey: 'cartId',
    as: 'items',
    onDelete: 'CASCADE'
});

CartItem.belongsTo(Cart, {
    foreignKey: 'cartId',
    as: 'cart'
});

// Product - CartItem
Product.hasMany(CartItem, {
    foreignKey: 'productId',
    as: 'cartItems'
});

CartItem.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

module.exports = { Product, ProductImage, User, Cart, CartItem };
