const User = require('../models/User');
const Review = require('../models/Review');
const Report = require('../models/Report');

const BADGE_RULES = [
  { name: 'First Exchange', test: (u) => u.completedExchanges >= 1 },
  { name: 'Eco Starter', test: (u) => u.greenPoints >= 50 },
  { name: 'Green Champion', test: (u) => u.greenPoints >= 200 },
  { name: 'Circular Hero', test: (u) => u.greenPoints >= 500 },
  { name: 'Trusted Trader', test: (u) => u.trustScore >= 80 && u.completedExchanges >= 5 },
  { name: 'Top Rated', test: (u) => u.ratingAvg >= 4.5 && u.ratingCount >= 3 },
  { name: 'Verified Student', test: (u) => u.isVerified }
];

// Trust score (0-100): base + verification + confidence-weighted rating + activity - upheld reports
async function recomputeTrust(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  const ratings = await Review.find({ reviewee: user._id }).select('rating').lean();
  const count = ratings.length;
  const avg = count ? ratings.reduce((a, r) => a + r.rating, 0) / count : 0;
  const upheld = await Report.countDocuments({ targetType: 'User', targetId: user._id, status: 'Resolved' });

  const confidence = Math.min(count, 5) / 5;
  let score = 25;
  if (user.isVerified) score += 10;
  score += confidence * (avg / 5) * 45 + (1 - confidence) * 22; // unknown users sit near neutral
  score += Math.min(user.completedExchanges, 10) * 2;
  score -= upheld * 15;

  user.trustScore = Math.round(Math.max(0, Math.min(100, score)));
  user.ratingAvg = Math.round(avg * 10) / 10;
  user.ratingCount = count;
  user.badges = BADGE_RULES.filter((r) => r.test(user)).map((r) => r.name);
  await user.save();
  return user;
}

module.exports = { recomputeTrust, BADGE_RULES };
