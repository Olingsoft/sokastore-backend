const sequelize = require('../database/sequelize');
const { Product, ProductImage } = require('./associations');

// Import all models
const db = {
  Product,
  ProductImage,
  sequelize
};

module.exports = db;
