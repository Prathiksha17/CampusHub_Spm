const Notification = require('../models/Notification');

// Persist a notification and push it live over socket.io
module.exports = async function notify(req, userId, { type = 'info', message, link = '' }) {
  const n = await Notification.create({ user: userId, type, message, link });
  const io = req.app.get('io');
  if (io) io.to(`user:${userId}`).emit('notification:new', n);
  return n;
};
