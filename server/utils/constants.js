const CATEGORIES = ['Books', 'Electronics', 'Lab Equipment', 'Stationery', 'Furniture', 'Clothing', 'Sports', 'Notes', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];
const LISTING_TYPES = ['Sell', 'Rent', 'Lend', 'Swap', 'Donate'];
const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Information Technology', 'Biotechnology', 'Management', 'Arts & Science', 'Other'];

// Rough per-item reuse factors used by the circular economy dashboard.
// co2: kg CO2e avoided by reusing instead of buying new; weight: kg diverted from waste; value: avg new price (INR)
const IMPACT_FACTORS = {
  Books: { co2: 2.5, weight: 0.6, value: 350 },
  Electronics: { co2: 45, weight: 1.2, value: 3000 },
  'Lab Equipment': { co2: 8, weight: 0.8, value: 900 },
  Stationery: { co2: 0.8, weight: 0.2, value: 120 },
  Furniture: { co2: 30, weight: 12, value: 2500 },
  Clothing: { co2: 10, weight: 0.7, value: 700 },
  Sports: { co2: 6, weight: 1.5, value: 800 },
  Notes: { co2: 0.5, weight: 0.3, value: 150 },
  Other: { co2: 3, weight: 1, value: 400 }
};

const CONDITION_MULTIPLIER = { New: 0.85, 'Like New': 0.7, Good: 0.5, Fair: 0.3 };
const GREEN_POINTS = { Donate: 30, Swap: 25, Lend: 20, Rent: 15, Sell: 10 };

module.exports = { CATEGORIES, CONDITIONS, LISTING_TYPES, DEPARTMENTS, IMPACT_FACTORS, CONDITION_MULTIPLIER, GREEN_POINTS };
