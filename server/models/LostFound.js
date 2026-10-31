const mongoose = require('mongoose');

const lostFoundSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Lost', 'Found'], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, default: 'Other' },
    location: { type: String, required: true },
    date: { type: Date, default: Date.now },
    image: { type: String, default: '' },
    contact: { type: String, default: '' },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Open', 'Claimed', 'Resolved'], default: 'Open' },
    claims: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, message: String, at: { type: Date, default: Date.now } }]
  },
  { timestamps: true }
);

lostFoundSchema.index({ title: 'text', description: 'text', location: 'text' });

module.exports = mongoose.model('LostFound', lostFoundSchema);
