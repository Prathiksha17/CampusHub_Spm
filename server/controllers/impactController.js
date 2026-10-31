const Exchange = require('../models/Exchange');
const Resource = require('../models/Resource');
const User = require('../models/User');
const LostFound = require('../models/LostFound');
const { IMPACT_FACTORS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/error');

// Lend/rent avoids a purchase less often than a permanent transfer, so it counts at half weight
const reuseWeight = (type) => (['Rent', 'Lend'].includes(type) ? 0.5 : 1);

function summarize(exchanges) {
  const totals = { exchanges: exchanges.length, itemsReused: 0, co2: 0, waste: 0, moneySaved: 0, donations: 0 };
  const byCategory = {};
  const byType = {};
  exchanges.forEach((e) => {
    const f = IMPACT_FACTORS[e.category] || IMPACT_FACTORS.Other;
    const w = reuseWeight(e.type);
    const co2 = f.co2 * w;
    const waste = f.weight * w;
    const saved = Math.max(0, f.value * w - (e.offeredPrice || 0));
    totals.itemsReused += e.type === 'Swap' ? 2 : 1;
    totals.co2 += co2;
    totals.waste += waste;
    totals.moneySaved += saved;
    if (e.type === 'Donate') totals.donations += 1;
    byCategory[e.category] = byCategory[e.category] || { category: e.category, count: 0, co2: 0, waste: 0 };
    byCategory[e.category].count += 1;
    byCategory[e.category].co2 += co2;
    byCategory[e.category].waste += waste;
    byType[e.type] = (byType[e.type] || 0) + 1;
  });
  const round = (n) => Math.round(n * 10) / 10;
  totals.co2 = round(totals.co2);
  totals.waste = round(totals.waste);
  totals.moneySaved = Math.round(totals.moneySaved);
  totals.treesEquivalent = round(totals.co2 / 21); // ~21 kg CO2 absorbed per tree per year
  return {
    totals,
    byCategory: Object.values(byCategory).map((c) => ({ ...c, co2: round(c.co2), waste: round(c.waste) })).sort((a, b) => b.co2 - a.co2),
    byType: Object.entries(byType).map(([type, count]) => ({ type, count }))
  };
}

exports.campus = asyncHandler(async (req, res) => {
  const exchanges = await Exchange.find({ status: 'Completed' })
    .select('type category offeredPrice completedAt owner')
    .populate('owner', 'department');
  const base = summarize(exchanges);

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en', { month: 'short' }), exchanges: 0, co2: 0 });
  }
  exchanges.forEach((e) => {
    const d = new Date(e.completedAt || Date.now());
    const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) {
      m.exchanges += 1;
      m.co2 = Math.round((m.co2 + (IMPACT_FACTORS[e.category] || IMPACT_FACTORS.Other).co2 * reuseWeight(e.type)) * 10) / 10;
    }
  });

  const deptMap = {};
  exchanges.forEach((e) => {
    const d = e.owner?.department || 'Other';
    deptMap[d] = deptMap[d] || { department: d, exchanges: 0, co2: 0 };
    deptMap[d].exchanges += 1;
    deptMap[d].co2 += (IMPACT_FACTORS[e.category] || IMPACT_FACTORS.Other).co2 * reuseWeight(e.type);
  });

  const [activeListings, participants, leaders, recovered] = await Promise.all([
    Resource.countDocuments({ status: 'Available' }),
    User.countDocuments({ completedExchanges: { $gt: 0 } }),
    User.find({ role: 'student', isBanned: false }).sort('-greenPoints').limit(10).select('name avatar department greenPoints badges completedExchanges'),
    LostFound.countDocuments({ status: 'Resolved' })
  ]);

  res.json({
    ...base,
    totals: { ...base.totals, activeListings, participants, itemsRecovered: recovered },
    monthly: months.map(({ key, ...m }) => m),
    departments: Object.values(deptMap).map((d) => ({ ...d, co2: Math.round(d.co2 * 10) / 10 })).sort((a, b) => b.co2 - a.co2),
    leaders
  });
});

exports.mine = asyncHandler(async (req, res) => {
  const exchanges = await Exchange.find({ status: 'Completed', $or: [{ owner: req.user._id }, { requester: req.user._id }] }).select('type category offeredPrice completedAt');
  const rank = (await User.countDocuments({ role: 'student', greenPoints: { $gt: req.user.greenPoints } })) + 1;
  res.json({ ...summarize(exchanges), greenPoints: req.user.greenPoints, badges: req.user.badges, rank });
});
