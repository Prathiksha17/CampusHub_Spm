const User = require('../models/User');
const Resource = require('../models/Resource');
const Exchange = require('../models/Exchange');
const Report = require('../models/Report');
const LostFound = require('../models/LostFound');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { recomputeTrust } = require('../utils/trust');
const notify = require('../utils/notify');
const { escapeRegex } = require('../utils/text');
const { asyncHandler, httpError } = require('../middleware/error');

const monthBuckets = (n = 6) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - i);
    out.push({ start: new Date(d), label: d.toLocaleString('en', { month: 'short' }) });
  }
  return out;
};

exports.stats = asyncHandler(async (req, res) => {
  const [users, banned, verified, resources, available, flagged, exchangeStatus, openReports, lostOpen, posts, byCategory, byType] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isBanned: true }),
    User.countDocuments({ isVerified: true }),
    Resource.countDocuments(),
    Resource.countDocuments({ status: 'Available' }),
    Resource.countDocuments({ isFlagged: true }),
    Exchange.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Report.countDocuments({ status: 'Open' }),
    LostFound.countDocuments({ status: 'Open' }),
    Post.countDocuments(),
    Resource.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    Resource.aggregate([{ $group: { _id: '$listingType', n: { $sum: 1 } } }])
  ]);

  const buckets = monthBuckets();
  const since = buckets[0].start;
  const [userGrowth, exGrowth, listingGrowth] = await Promise.all([
    User.find({ createdAt: { $gte: since } }).select('createdAt'),
    Exchange.find({ createdAt: { $gte: since } }).select('createdAt status'),
    Resource.find({ createdAt: { $gte: since } }).select('createdAt')
  ]);
  const inBucket = (date, i) => date >= buckets[i].start && (i === buckets.length - 1 || date < buckets[i + 1].start);
  const growth = buckets.map((b, i) => ({
    month: b.label,
    users: userGrowth.filter((u) => inBucket(u.createdAt, i)).length,
    listings: listingGrowth.filter((u) => inBucket(u.createdAt, i)).length,
    exchanges: exGrowth.filter((u) => inBucket(u.createdAt, i)).length,
    completed: exGrowth.filter((u) => u.status === 'Completed' && inBucket(u.createdAt, i)).length
  }));

  const recentUsers = await User.find().sort('-createdAt').limit(5).select('name email department createdAt');
  res.json({
    counts: { users, banned, verified, resources, available, flagged, openReports, lostOpen, posts },
    exchanges: Object.fromEntries(exchangeStatus.map((e) => [e._id, e.n])),
    byCategory: byCategory.map((c) => ({ category: c._id, count: c.n })),
    byType: byType.map((c) => ({ type: c._id, count: c.n })),
    growth,
    recentUsers
  });
});

exports.users = asyncHandler(async (req, res) => {
  const { q, role, status } = req.query;
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { studentId: rx }];
  }
  if (role) filter.role = role;
  if (status === 'banned') filter.isBanned = true;
  if (status === 'unverified') filter.isVerified = false;
  res.json(await User.find(filter).sort('-createdAt').limit(200));
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  if (user._id.equals(req.user._id) && (req.body.isBanned || req.body.role === 'student')) throw httpError(400, 'You cannot ban or demote yourself');
  ['isBanned', 'isVerified', 'role'].forEach((f) => req.body[f] !== undefined && (user[f] = req.body[f]));
  await user.save();
  await recomputeTrust(user._id);
  if (req.body.isVerified) await notify(req, user._id, { type: 'system', message: 'Your student account has been verified by the admin team.', link: '/profile' });
  res.json(await User.findById(user._id));
});

exports.resources = asyncHandler(async (req, res) => {
  const { q, flagged } = req.query;
  const filter = {};
  if (flagged === 'true') filter.isFlagged = true;
  if (q) filter.title = new RegExp(escapeRegex(q), 'i');
  res.json(await Resource.find(filter).sort('-createdAt').limit(200).populate('owner', 'name email'));
});

exports.updateResource = asyncHandler(async (req, res) => {
  const r = await Resource.findById(req.params.id);
  if (!r) throw httpError(404, 'Listing not found');
  ['isFlagged', 'status'].forEach((f) => req.body[f] !== undefined && (r[f] = req.body[f]));
  await r.save();
  res.json(r);
});

exports.deleteResource = asyncHandler(async (req, res) => {
  const r = await Resource.findById(req.params.id);
  if (!r) throw httpError(404, 'Listing not found');
  await Exchange.updateMany({ resource: r._id, status: { $in: ['Pending', 'Accepted'] } }, { status: 'Cancelled' });
  await r.deleteOne();
  await notify(req, r.owner, { type: 'system', message: `Your listing "${r.title}" was removed by a moderator for violating campus guidelines.` });
  res.json({ message: 'Listing removed' });
});

exports.reports = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const reports = await Report.find(filter).sort('-createdAt').limit(200).populate('reporter', 'name email');
  const models = { Resource, User, Post, LostFound };
  const enriched = await Promise.all(
    reports.map(async (r) => {
      const t = await models[r.targetType].findById(r.targetId).select('title name email');
      return { ...r.toObject(), target: t ? { _id: t._id, label: t.title || t.name || t.email } : null };
    })
  );
  res.json(enriched);
});

exports.resolveReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw httpError(404, 'Report not found');
  const { status, actionNote, removeTarget } = req.body;
  if (!['Resolved', 'Dismissed'].includes(status)) throw httpError(400, 'Status must be Resolved or Dismissed');
  report.status = status;
  report.actionNote = actionNote || '';
  await report.save();
  if (report.targetType === 'Resource') {
    if (status === 'Resolved' && removeTarget) await Resource.deleteOne({ _id: report.targetId });
    else if (status === 'Dismissed') await Resource.updateOne({ _id: report.targetId }, { isFlagged: false });
  }
  if (report.targetType === 'User') await recomputeTrust(report.targetId);
  if (report.targetType === 'Post' && status === 'Resolved' && removeTarget) await Post.deleteOne({ _id: report.targetId });
  await notify(req, report.reporter, { type: 'system', message: `Your report was reviewed: ${status.toLowerCase()}.` });
  res.json(report);
});

exports.exchanges = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(
    await Exchange.find(filter)
      .sort('-createdAt')
      .limit(200)
      .populate('resource', 'title')
      .populate('owner', 'name')
      .populate('requester', 'name')
  );
});

exports.broadcast = asyncHandler(async (req, res) => {
  const { message, link } = req.body;
  if (!message) throw httpError(400, 'Message is required');
  const users = await User.find({ isBanned: false }).select('_id');
  const docs = await Notification.insertMany(users.map((u) => ({ user: u._id, type: 'announcement', message, link: link || '' })));
  const io = req.app.get('io');
  if (io) docs.forEach((n) => io.to(`user:${n.user}`).emit('notification:new', n));
  res.json({ sent: docs.length });
});
