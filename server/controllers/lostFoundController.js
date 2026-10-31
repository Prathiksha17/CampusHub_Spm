const LostFound = require('../models/LostFound');
const notify = require('../utils/notify');
const { findLostFoundMatches } = require('../utils/recommend');
const { escapeRegex } = require('../utils/text');
const { asyncHandler, httpError } = require('../middleware/error');

exports.create = asyncHandler(async (req, res) => {
  const { type, title, description, category, location, date, contact } = req.body;
  const item = await LostFound.create({
    type, title, description, category, location, contact,
    date: date || Date.now(),
    image: req.file ? `/uploads/${req.file.filename}` : '',
    reporter: req.user._id
  });
  // Smart matching: alert reporters of likely counterpart posts
  const matches = await findLostFoundMatches(item);
  for (const m of matches.slice(0, 3)) {
    if (m.item.reporter._id.equals(req.user._id)) continue;
    await notify(req, m.item.reporter._id, {
      type: 'lostfound',
      message: `Possible match (${m.score}%) for your ${m.item.type.toLowerCase()} item "${m.item.title}": "${item.title}"`,
      link: `/lost-found?item=${item._id}`
    });
  }
  res.status(201).json({ item, matches });
});

exports.list = asyncHandler(async (req, res) => {
  const { type, status = 'Open', q, category } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (status !== 'all') filter.status = status;
  if (category) filter.category = category;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { location: rx }];
  }
  res.json(await LostFound.find(filter).sort('-createdAt').limit(100).populate('reporter', 'name avatar trustScore'));
});

exports.get = asyncHandler(async (req, res) => {
  const item = await LostFound.findById(req.params.id).populate('reporter', 'name avatar trustScore').populate('claims.user', 'name avatar');
  if (!item) throw httpError(404, 'Post not found');
  const matches = await findLostFoundMatches(item);
  res.json({ item, matches });
});

exports.claim = asyncHandler(async (req, res) => {
  const item = await LostFound.findById(req.params.id);
  if (!item) throw httpError(404, 'Post not found');
  if (item.reporter.equals(req.user._id)) throw httpError(400, 'This is your own post');
  if (item.status !== 'Open') throw httpError(400, 'This post is no longer open');
  if (item.claims.some((c) => c.user.equals(req.user._id))) throw httpError(400, 'You already responded to this post');
  const message = (req.body.message || '').slice(0, 500);
  item.claims.push({ user: req.user._id, message });
  await item.save();
  const verb = item.type === 'Found' ? 'says this item belongs to them' : 'may have found your item';
  await notify(req, item.reporter, { type: 'lostfound', message: `${req.user.name} ${verb}: "${item.title}"`, link: `/lost-found?item=${item._id}` });
  res.json(item);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const item = await LostFound.findById(req.params.id);
  if (!item) throw httpError(404, 'Post not found');
  if (!item.reporter.equals(req.user._id) && req.user.role !== 'admin') throw httpError(403, 'Only the reporter can update this');
  if (!['Open', 'Claimed', 'Resolved'].includes(req.body.status)) throw httpError(400, 'Invalid status');
  item.status = req.body.status;
  await item.save();
  res.json(item);
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await LostFound.findById(req.params.id);
  if (!item) throw httpError(404, 'Post not found');
  if (!item.reporter.equals(req.user._id) && req.user.role !== 'admin') throw httpError(403, 'Only the reporter can delete this');
  await item.deleteOne();
  res.json({ message: 'Deleted' });
});
