const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Tip', 'Question', 'Event', 'Request', 'Announcement'], default: 'Tip' },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    content: { type: String, required: true, maxlength: 3000 },
    tags: [{ type: String, lowercase: true, trim: true }],
    eventDate: Date,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    pinned: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
