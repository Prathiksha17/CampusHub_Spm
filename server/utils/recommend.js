const Resource = require('../models/Resource');
const Activity = require('../models/Activity');
const LostFound = require('../models/LostFound');
const { tokenize, jaccard } = require('./text');
const { CATEGORIES, IMPACT_FACTORS, CONDITION_MULTIPLIER } = require('./constants');

const ACTION_WEIGHT = { view: 1, search: 2, wishlist: 3, request: 4 };

// Builds a weighted interest profile from the user's recent behaviour and stated interests
async function buildProfile(user) {
  const acts = await Activity.find({ user: user._id }).sort('-createdAt').limit(150).populate('resource', 'category tags title');
  const catW = {};
  const tagW = {};
  acts.forEach((a, i) => {
    const w = (ACTION_WEIGHT[a.action] || 1) * (1 - i / 200); // recency decay
    const cat = a.resource?.category || a.category;
    if (cat) catW[cat] = (catW[cat] || 0) + w;
    const terms = [...(a.resource?.tags || []), ...tokenize(a.resource?.title), ...tokenize(a.query)];
    terms.forEach((t) => (tagW[t] = (tagW[t] || 0) + w));
  });
  (user.interests || []).forEach((raw) => {
    const t = raw.toLowerCase();
    if (CATEGORIES.includes(raw)) catW[raw] = (catW[raw] || 0) + 3;
    tokenize(t).forEach((tok) => (tagW[tok] = (tagW[tok] || 0) + 2));
  });
  return { catW, tagW };
}

async function recommendFor(user, limit = 12) {
  const { catW, tagW } = await buildProfile(user);
  const candidates = await Resource.find({ status: 'Available', owner: { $ne: user._id }, isFlagged: false })
    .sort('-createdAt')
    .limit(400)
    .populate('owner', 'name avatar trustScore department ratingAvg');

  const maxCat = Math.max(1, ...Object.values(catW));
  const maxTag = Math.max(1, ...Object.values(tagW));

  const scored = candidates.map((r) => {
    let s = 0;
    const reasons = [];
    if (catW[r.category]) {
      s += 3 * (catW[r.category] / maxCat);
      reasons.push(`Because you browse ${r.category}`);
    }
    const terms = new Set([...r.tags, ...tokenize(r.title)]);
    let tagScore = 0;
    terms.forEach((t) => tagW[t] && (tagScore += tagW[t]));
    if (tagScore) {
      s += 2.5 * Math.min(1, tagScore / maxTag);
      reasons.unshift('Matches your interests');
    }
    if (user.department && r.owner?.department === user.department) {
      s += 0.8;
      reasons.push(`From your department`);
    }
    if ((r.owner?.trustScore || 0) >= 75) s += 0.4;
    s += Math.min(r.views + r.wishlistCount * 3, 120) / 200;
    const ageDays = (Date.now() - new Date(r.createdAt)) / 864e5;
    s += Math.max(0, 1 - ageDays / 30) * 0.7;
    if (['Donate', 'Lend', 'Swap'].includes(r.listingType)) s += 0.3;
    return { resource: r, score: Math.round(s * 100) / 100, reason: reasons[0] || 'Trending on campus' };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

async function similarTo(resource, limit = 6) {
  const pool = await Resource.find({ _id: { $ne: resource._id }, status: 'Available', isFlagged: false })
    .limit(300)
    .populate('owner', 'name avatar trustScore');
  const base = [...resource.tags, ...tokenize(resource.title), ...tokenize(resource.description)];
  return pool
    .map((r) => {
      let s = jaccard(base, [...r.tags, ...tokenize(r.title), ...tokenize(r.description)]);
      if (r.category === resource.category) s += 0.25;
      return { r, s };
    })
    .filter((x) => x.s > 0.2)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);
}

// Suggests a fair price from comparable listings; falls back to category baselines
async function suggestPrice({ category, condition = 'Good', title = '' }) {
  const comps = await Resource.find({ category, listingType: 'Sell', price: { $gt: 0 } }).select('price condition title').limit(200);
  const words = tokenize(title);
  const mult = CONDITION_MULTIPLIER[condition] || 0.5;
  let prices = comps
    .map((c) => ({ p: c.price / (CONDITION_MULTIPLIER[c.condition] || 0.5), sim: jaccard(words, tokenize(c.title)) }))
    .sort((a, b) => b.sim - a.sim);
  const close = prices.filter((x) => x.sim > 0.15);
  if (close.length >= 2) prices = close;
  prices = prices.slice(0, 15).map((x) => x.p).sort((a, b) => a - b);

  let basis = 'category average';
  let newValue = (IMPACT_FACTORS[category] || IMPACT_FACTORS.Other).value / 0.85;
  if (prices.length >= 2) {
    newValue = prices[Math.floor(prices.length / 2)];
    basis = `${prices.length} similar listings`;
  }
  const suggested = Math.round((newValue * mult) / 10) * 10;
  return {
    suggested,
    low: Math.round((suggested * 0.8) / 10) * 10,
    high: Math.round((suggested * 1.2) / 10) * 10,
    rentPerDay: Math.max(5, Math.round((suggested * 0.03) / 5) * 5),
    basis
  };
}

// Scores opposite-type lost & found items for likely matches
async function findLostFoundMatches(item, limit = 5) {
  const opposite = item.type === 'Lost' ? 'Found' : 'Lost';
  const pool = await LostFound.find({ type: opposite, status: 'Open', _id: { $ne: item._id } })
    .limit(300)
    .populate('reporter', 'name avatar');
  const base = tokenize(`${item.title} ${item.description}`);
  const loc = tokenize(item.location);
  return pool
    .map((o) => {
      let s = jaccard(base, tokenize(`${o.title} ${o.description}`)) * 0.65;
      if (o.category === item.category) s += 0.15;
      s += jaccard(loc, tokenize(o.location)) * 0.12;
      const days = Math.abs(new Date(o.date) - new Date(item.date)) / 864e5;
      s += Math.max(0, 1 - days / 14) * 0.08;
      return { item: o, score: Math.round(s * 100) };
    })
    .filter((m) => m.score >= 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { recommendFor, similarTo, suggestPrice, findLostFoundMatches, buildProfile };
