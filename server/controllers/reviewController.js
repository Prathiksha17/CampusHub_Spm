const Review = require('../models/Review');
const Exchange = require('../models/Exchange');
const notify = require('../utils/notify');
const { recomputeTrust } = require('../utils/trust');
const { asyncHandler, httpError } = require('../middleware/error');

exports.create = asyncHandler(async (req, res) => {
  const { exchangeId, rating, comment, tags } = req.body;
  const ex = await Exchange.findById(exchangeId).populate('resource', 'title');
  if (!ex) throw httpError(404, 'Exchange not found');
  if (ex.status !== 'Completed') throw httpError(400, 'You can review only after the exchange is completed');
  const isOwner = ex.owner.equals(req.user._id);
  const isRequester = ex.requester.equals(req.user._id);
  if (!isOwner && !isRequester) throw httpError(403, 'You were not part of this exchange');
  const r = Number(rating);
  if (!(r >= 1 && r <= 5)) throw httpError(400, 'Rating must be between 1 and 5');
  const reviewee = isOwner ? ex.requester : ex.owner;
  if (await Review.exists({ reviewer: req.user._id, exchange: ex._id })) throw httpError(400, 'You already reviewed this exchange');

  const review = await Review.create({ reviewer: req.user._id, reviewee, exchange: ex._id, rating: r, comment, tags: (tags || []).slice(0, 5) });
  ex.reviewedBy.push(req.user._id);
  await ex.save();
  await recomputeTrust(reviewee);
  await notify(req, reviewee, { type: 'review', message: `${req.user.name} rated you ${r}★ for "${ex.resource?.title}"`, link: `/profile/${reviewee}` });
  res.status(201).json(review);
});

exports.forUser = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ reviewee: req.params.userId }).sort('-createdAt').populate('reviewer', 'name avatar');
  const dist = [1, 2, 3, 4, 5].map((s) => reviews.filter((r) => r.rating === s).length);
  const tagCounts = {};
  reviews.forEach((r) => r.tags.forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));
  res.json({ reviews, distribution: dist, tags: tagCounts });
});
