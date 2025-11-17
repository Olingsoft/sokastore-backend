// auth middleware
const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = (req, res, next) => {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer <token>"
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ 
                message: 'Failed to authenticate token',
                error: err.message 
            });
        }
        req.user = decoded;
        next();
    });
};

module.exports = auth;