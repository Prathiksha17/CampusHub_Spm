const Resource = require('../models/Resource');
const Activity = require('../models/Activity');
const Report = require('../models/Report');
const Exchange = require('../models/Exchange');
const { asyncHandler, httpError } = require('../middleware/error');
const { escapeRegex, tokenize } = require('../utils/text');
const { similarTo } = require('../utils/recommend');

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) { /* comma separated */ }
  return String(tags).split(',').map((t) => t.trim()).filter(Boolean);
};

const canEdit = (user, resource) => resource.owner.equals(user._id) || user.role === 'admin';

exports.create = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  body.tags = parseTags(body.tags).slice(0, 10);
  body.images = (req.files || []).map((f) => `/uploads/${f.filename}`);
  body.owner = req.user._id;
  body.department = req.user.department;
  const resource = await Resource.create(body);
  res.status(201).json(resource);
});

// Smart search: text relevance + fuzzy prefix fallback + rich filters
exports.list = asyncHandler(async (req, res) => {
  const { q, category, listingType, condition, minPrice, maxPrice, sort = 'newest', department, owner, status } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(48, Number(req.query.limit) || 12);

  const filter = { isFlagged: false };
  filter.status = status || 'Available';
  if (status === 'all') delete filter.status;
  if (category) filter.category = { $in: String(category).split(',') };
  if (listingType) filter.listingType = { $in: String(listingType).split(',') };
  if (condition) filter.condition = { $in: String(condition).split(',') };
  if (department) filter.department = department;
  if (owner) filter.owner = owner;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  let useText = false;
  if (q && q.trim()) {
    // Full-text search first; fall back to fuzzy regex if no hits (or text index unavailable)
    const textCount = await Resource.countDocuments({ ...filter, $text: { $search: q } }).catch(() => 0);
    if (textCount > 0) {
      filter.$text = { $search: q };
      useText = true;
    } else {
      // fuzzy fallback: match any token as a prefix in title/tags/description
      const toks = tokenize(q).map((t) => escapeRegex(t.slice(0, Math.max(3, t.length - 1))));
      const rx = new RegExp(toks.length ? toks.join('|') : escapeRegex(q.trim()), 'i');
      filter.$or = [{ title: rx }, { tags: rx }, { description: rx }];
    }
    if (req.user) Activity.create({ user: req.user._id, action: 'search', query: q.trim().slice(0, 80) }).catch(() => {});
  }

  const sorts = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    priceLow: { price: 1 },
    priceHigh: { price: -1 },
    popular: { views: -1, wishlistCount: -1 }
  };
  let sortBy = sorts[sort] || sorts.newest;
  let projection = {};
  if (useText && sort === 'relevance') {
    projection = { score: { $meta: 'textScore' } };
    sortBy = { score: { $meta: 'textScore' } };
  }

  const [items, total] = await Promise.all([
    Resource.find(filter, projection)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('owner', 'name avatar trustScore department ratingAvg isVerified'),
    Resource.countDocuments(filter)
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

exports.suggestions = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const rx = new RegExp(escapeRegex(q), 'i');
  const items = await Resource.find({ status: 'Available', isFlagged: false, $or: [{ title: rx }, { tags: rx }] })
    .select('title category')
    .limit(8);
  res.json(items);
});

exports.get = asyncHandler(async (req, res) => {
  const resource = await Resource.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true }).populate(
    'owner',
    'name avatar trustScore department ratingAvg ratingCount isVerified completedExchanges badges createdAt'
  );
  if (!resource) throw httpError(404, 'Listing not found');
  let myRequest = null;
  if (req.user) {
    Activity.create({ user: req.user._id, action: 'view', resource: resource._id, category: resource.category }).catch(() => {});
    myRequest = await Exchange.findOne({ resource: resource._id, requester: req.user._id, status: { $in: ['Pending', 'Accepted'] } });
  }
  res.json({ resource, myRequest });
});

exports.similar = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw httpError(404, 'Listing not found');
  res.json(await similarTo(resource));
});

exports.update = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw httpError(404, 'Listing not found');
  if (!canEdit(req.user, resource)) throw httpError(403, 'You can only edit your own listings');
  const fields = ['title', 'description', 'category', 'condition', 'listingType', 'price', 'rentPerDay', 'swapFor', 'location', 'status'];
  fields.forEach((f) => req.body[f] !== undefined && (resource[f] = req.body[f]));
  if (req.body.tags !== undefined) resource.tags = parseTags(req.body.tags).slice(0, 10);
  let keep = resource.images;
  if (req.body.keepImages !== undefined) keep = parseTags(req.body.keepImages);
  resource.images = [...keep, ...(req.files || []).map((f) => `/uploads/${f.filename}`)].slice(0, 6);
  await resource.save();
  res.json(resource);
});

exports.remove = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw httpError(404, 'Listing not found');
  if (!canEdit(req.user, resource)) throw httpError(403, 'You can only delete your own listings');
  const active = await Exchange.countDocuments({ resource: resource._id, status: 'Accepted' });
  if (active && req.user.role !== 'admin') throw httpError(400, 'This listing has an accepted exchange. Complete or cancel it first.');
  await Exchange.updateMany({ resource: resource._id, status: 'Pending' }, { status: 'Cancelled' });
  await resource.deleteOne();
  res.json({ message: 'Listing deleted' });
});

exports.mine = asyncHandler(async (req, res) => {
  const items = await Resource.find({ owner: req.user._id }).sort('-createdAt');
  const counts = await Exchange.aggregate([
    { $match: { owner: req.user._id, status: 'Pending' } },
    { $group: { _id: '$resource', n: { $sum: 1 } } }
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(items.map((i) => ({ ...i.toObject(), pendingRequests: map[String(i._id)] || 0 })));
});

exports.report = asyncHandler(async (req, res) => {
  const { reason, details } = req.body;
  if (!reason) throw httpError(400, 'Choose a reason for the report');
  const report = await Report.create({ reporter: req.user._id, targetType: 'Resource', targetId: req.params.id, reason, details });
  const open = await Report.countDocuments({ targetType: 'Resource', targetId: req.params.id, status: 'Open' });
  if (open >= 3) await Resource.updateOne({ _id: req.params.id }, { isFlagged: true }); // auto-hide pending review
  res.status(201).json(report);
});
