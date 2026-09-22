const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'company-dashboard-local-secret';

const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
};

module.exports = { authenticate };

