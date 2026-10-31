const mongoose = require('mongoose');

const exchangeSchema = new mongoose.Schema(
  {
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Sell', 'Rent', 'Lend', 'Swap', 'Donate'], required: true },
    category: { type: String, default: 'Other' },
    offeredPrice: { type: Number, default: 0 },
    offeredResource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
    message: { type: String, default: '' },
    startDate: Date,
    endDate: Date,
    meetupLocation: { type: String, default: '' },
    meetupTime: Date,
    status: { type: String, enum: ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Completed'], default: 'Pending' },
    ownerConfirmed: { type: Boolean, default: false },
    requesterConfirmed: { type: Boolean, default: false },
    completedAt: Date,
    reviewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    history: [{ status: String, note: String, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exchange', exchangeSchema);
