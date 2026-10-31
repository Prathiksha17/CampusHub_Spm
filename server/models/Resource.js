const mongoose = require('mongoose');
const { CATEGORIES, CONDITIONS, LISTING_TYPES } = require('../utils/constants');

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, required: true },
    condition: { type: String, enum: CONDITIONS, default: 'Good' },
    listingType: { type: String, enum: LISTING_TYPES, required: true },
    price: { type: Number, default: 0, min: 0 },
    rentPerDay: { type: Number, default: 0, min: 0 },
    swapFor: { type: String, default: '' },
    images: [{ type: String }],
    tags: [{ type: String, lowercase: true, trim: true }],
    location: { type: String, default: 'Main Campus' },
    department: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Available', 'Reserved', 'Exchanged', 'Inactive'], default: 'Available' },
    views: { type: Number, default: 0 },
    wishlistCount: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false }
  },
  { timestamps: true }
);

resourceSchema.index({ title: 'text', description: 'text', tags: 'text' }, { weights: { title: 5, tags: 3, description: 1 } });
resourceSchema.index({ category: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Resource', resourceSchema);
