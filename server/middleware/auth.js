const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getUserFromToken = async (header) => {
  if (!header || !header.startsWith('Bearer ')) return null;
  const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  return User.findById(decoded.id);
};

exports.protect = async (req, res, next) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Please sign in to continue' });
    if (user.isBanned) return res.status(403).json({ message: 'Your account has been suspended. Contact the admin team.' });
    // Refresh "last active" at most every 2 minutes to avoid a write on every request
    if (!user.lastActive || Date.now() - user.lastActive > 120000) {
      await User.updateOne({ _id: user._id }, { lastActive: new Date() });
      user.lastActive = new Date();
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
};

exports.optionalAuth = async (req, res, next) => {
  try {
    req.user = await getUserFromToken(req.headers.authorization);
  } catch (e) {
    req.user = null;
  }
  next();
};

exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};
