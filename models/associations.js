const Product = require('./Product');
const ProductImage = require('./ProductImage');
const User = require('./User');
const Cart = require('./CartModel');
const CartItem = require('./CartItem');
const Order = require('./Order');
const OrderItem = require('./OrderItem');

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
    foreignKey: {
        name: 'cartId',
        field: 'cart_id'
    },
    as: 'items',
    onDelete: 'CASCADE'
});

CartItem.belongsTo(Cart, {
    foreignKey: {
        name: 'cartId',
        field: 'cart_id'
    },
    as: 'cart'
});

// Product - CartItem
Product.hasMany(CartItem, {
    foreignKey: {
        name: 'productId',
        field: 'product_id'
    },
    as: 'cartItems'
});

CartItem.belongsTo(Product, {
    foreignKey: {
        name: 'productId',
        field: 'product_id'
    },
    as: 'product'
});

// User - Order
User.hasMany(Order, {
    foreignKey: {
        name: 'userId',
        field: 'user_id'
    },
    as: 'orders'
});

Order.belongsTo(User, {
    foreignKey: {
        name: 'userId',
        field: 'user_id'
    },
    as: 'user'
});

// Order - OrderItem
Order.hasMany(OrderItem, {
    foreignKey: {
        name: 'orderId',
        field: 'order_id'
    },
    as: 'items',
    onDelete: 'CASCADE'
});

OrderItem.belongsTo(Order, {
    foreignKey: {
        name: 'orderId',
        field: 'order_id'
    },
    as: 'order'
});

// Product - OrderItem
Product.hasMany(OrderItem, {
    foreignKey: {
        name: 'productId',
        field: 'product_id'
    },
    as: 'orderItems'
});

OrderItem.belongsTo(Product, {
    foreignKey: {
        name: 'productId',
        field: 'product_id'
    },
    as: 'product'
});

module.exports = { Product, ProductImage, User, Cart, CartItem, Order, OrderItem };

