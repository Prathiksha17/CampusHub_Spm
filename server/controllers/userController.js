const User = require('../models/User');
const Resource = require('../models/Resource');
const Review = require('../models/Review');
const Activity = require('../models/Activity');
const { asyncHandler, httpError } = require('../middleware/error');

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-wishlist -email -phone');
  if (!user) throw httpError(404, 'User not found');
  const [listings, reviews] = await Promise.all([
    Resource.find({ owner: user._id, status: { $ne: 'Inactive' } }).sort('-createdAt').limit(24),
    Review.find({ reviewee: user._id }).populate('reviewer', 'name avatar').sort('-createdAt').limit(30)
  ]);
  res.json({ user, listings, reviews });
});

exports.toggleWishlist = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.resourceId);
  if (!resource) throw httpError(404, 'Listing not found');
  const idx = req.user.wishlist.findIndex((id) => id.equals(resource._id));
  let saved;
  if (idx >= 0) {
    req.user.wishlist.splice(idx, 1);
    resource.wishlistCount = Math.max(0, resource.wishlistCount - 1);
    saved = false;
  } else {
    req.user.wishlist.push(resource._id);
    resource.wishlistCount += 1;
    saved = true;
    Activity.create({ user: req.user._id, action: 'wishlist', resource: resource._id, category: resource.category }).catch(() => {});
  }
  await Promise.all([req.user.save(), resource.save()]);
  res.json({ saved, wishlist: req.user.wishlist });
});

exports.getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: 'wishlist', populate: { path: 'owner', select: 'name avatar trustScore' } });
  res.json(user.wishlist.filter(Boolean));
});

exports.leaderboard = asyncHandler(async (req, res) => {
  const users = await User.find({ role: 'student', isBanned: false })
    .sort({ greenPoints: -1, trustScore: -1 })
    .limit(Number(req.query.limit) || 10)
    .select('name avatar department greenPoints badges trustScore completedExchanges');
  res.json(users);
});
