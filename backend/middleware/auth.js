const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');

/**
 * protect — verifies the JWT in the Authorization header.
 * Attaches the decoded user/driver/admin object to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorised — no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Admin token
    if (decoded.role === 'admin') {
      req.user = { id: 'admin', role: 'admin', email: decoded.email };
      return next();
    }

    // Driver token
    if (decoded.role === 'driver' || decoded.role === 'driver-pending') {
      const driver = await Driver.findById(decoded.id).select('-password');
      if (!driver) return res.status(401).json({ success: false, message: 'Driver not found' });
      req.user = { id: driver._id, role: decoded.role, driver };
      return next();
    }

    // Regular user token
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    req.user = { id: user._id, role: 'user', user };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

/**
 * requireRole — restricts a route to specific roles.
 * Usage: requireRole('admin') or requireRole('user', 'admin')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied — insufficient permissions' });
  }
  next();
};

module.exports = { protect, requireRole };
