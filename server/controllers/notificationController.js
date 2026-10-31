const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/error');

exports.list = asyncHandler(async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(60);
  const unread = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ items, unread });
});

exports.markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ ok: true });
});

exports.markAll = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

exports.clear = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id, read: true });
  res.json({ ok: true });
});
