const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['Resource', 'User', 'Post', 'LostFound'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
    details: { type: String, default: '' },
    status: { type: String, enum: ['Open', 'Resolved', 'Dismissed'], default: 'Open' },
    actionNote: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
