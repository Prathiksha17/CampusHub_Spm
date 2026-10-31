const Activity = require('../models/Activity');
const Resource = require('../models/Resource');
const Exchange = require('../models/Exchange');
const { recommendFor, suggestPrice, buildProfile } = require('../utils/recommend');
const { CATEGORIES } = require('../utils/constants');
const { asyncHandler, httpError } = require('../middleware/error');

exports.recommendations = asyncHandler(async (req, res) => {
  res.json(await recommendFor(req.user, Number(req.query.limit) || 12));
});

exports.priceSuggest = asyncHandler(async (req, res) => {
  const { category, condition, title } = req.query;
  if (!CATEGORIES.includes(category)) throw httpError(400, 'Choose a valid category');
  res.json(await suggestPrice({ category, condition, title }));
});

// Campus demand analytics + personalised insights
exports.insights = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 30 * 864e5);

  const [recent, supply, myListings, profile] = await Promise.all([
    Activity.find({ createdAt: { $gte: since } }).select('action category query').limit(20000).lean(),
    Resource.aggregate([{ $match: { status: 'Available' } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    Resource.find({ owner: req.user._id }).select('title views wishlistCount status category createdAt listingType'),
    buildProfile(req.user)
  ]);

  const actMap = {};
  const searchMap = {};
  recent.forEach((a) => {
    if (a.action === 'search' && a.query) {
      const q = a.query.toLowerCase().trim();
      searchMap[q] = (searchMap[q] || 0) + 1;
    } else if (a.category) {
      actMap[a.category] = actMap[a.category] || { views: 0, demand: 0 };
      if (a.action === 'view') actMap[a.category].views += 1;
      else actMap[a.category].demand += 1;
    }
  });
  const topSearches = Object.entries(searchMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([query, count]) => ({ query, count }));

  const supplyMap = Object.fromEntries(supply.map((s) => [s._id, s.count]));
  const categories = CATEGORIES.map((c) => {
    const views = actMap[c]?.views || 0;
    const demand = actMap[c]?.demand || 0;
    const available = supplyMap[c] || 0;
    const interest = views + demand * 4;
    return { category: c, views, demand, available, gap: Math.round((interest / Math.max(1, available)) * 10) / 10 };
  }).sort((a, b) => b.gap - a.gap);

  const myInterests = Object.entries(profile.catW).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, w]) => ({ category: c, weight: Math.round(w * 10) / 10 }));

  const tips = [];
  const hot = categories.filter((c) => c.gap >= 3).slice(0, 2);
  hot.forEach((h) => tips.push(`${h.category} is in high demand (${h.demand} requests, only ${h.available} listed). Listing one now gets noticed fast.`));
  const stale = myListings.filter((l) => l.status === 'Available' && l.views < 5 && Date.now() - l.createdAt > 7 * 864e5);
  if (stale.length) tips.push(`${stale.length} of your listings have fewer than 5 views after a week. Add clearer photos, tags or try a lower price.`);
  const sells = myListings.filter((l) => l.listingType === 'Sell').length;
  if (sells >= 2) tips.push('Switching an idle item to Lend or Donate earns 2-3x more green points than selling.');
  if (!req.user.interests?.length) tips.push('Add interests to your profile to sharpen your recommendations.');
  if (!tips.length) tips.push('Your marketplace activity looks healthy. Keep your listings fresh to stay on top of search.');

  const myExchanges = await Exchange.aggregate([
    { $match: { $or: [{ owner: req.user._id }, { requester: req.user._id }] } },
    { $group: { _id: '$status', n: { $sum: 1 } } }
  ]);

  res.json({
    categories,
    topSearches,
    myInterests,
    myListings: myListings.sort((a, b) => b.views - a.views).slice(0, 8),
    myExchanges: Object.fromEntries(myExchanges.map((e) => [e._id, e.n])),
    tips
  });
});
