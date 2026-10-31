const mongoose = require('mongoose');

// Behaviour log used by the recommendation engine and analytics
const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['view', 'wishlist', 'request', 'search'], required: true },
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
    category: String,
    query: String
  },
  { timestamps: true }
);

activitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
