const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    exchange: { type: mongoose.Schema.Types.ObjectId, ref: 'Exchange', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 500, default: '' },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

reviewSchema.index({ reviewer: 1, exchange: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
