const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    kind: { type: String, enum: ['text', 'offer', 'system'], default: 'text' },
    offer: {
      amount: Number,
      status: { type: String, enum: ['Pending', 'Accepted', 'Declined', 'Countered'] }
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
