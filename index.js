const express = require('express');
const sequelize = require('./database/sequelize');
const User = require('./models/User');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

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

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Sync database and start server
sequelize.sync({ force: false }) // Set force: true to drop and recreate tables
  .then(() => {
    console.log('Database synced');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to sync database:', err);
  });