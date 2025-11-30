const express = require('express');
const sequelize = require('./database/sequelize');
const User = require('./models/User'); // may be used elsewhere
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true, // Allow cookies to be sent cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files from the 'public' directory
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Test database connection
app.get('/', async (req, res) => {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database has been established successfully.');
    res.json({ status: 'Database connection successful' });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/usersRoutes');
const productRoutes = require('./routes/productRoute');
const categoryRoutes = require('./routes/categoryRoutes');
const stockRoutes = require('./routes/stockRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Sync database and start server (alter:true adds missing columns)
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synced');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to sync database:', err);
  });