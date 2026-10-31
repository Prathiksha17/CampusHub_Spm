const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    studentId: { type: String, trim: true },
    department: { type: String, default: 'Other' },
    year: { type: Number, min: 1, max: 6, default: 1 },
    phone: { type: String, trim: true },
    avatar: { type: String, default: '' },
    bio: { type: String, maxlength: 300, default: '' },
    hostel: { type: String, default: '' },
    interests: [{ type: String, trim: true }],
    isVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    greenPoints: { type: Number, default: 0 },
    badges: [{ type: String }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }],
    trustScore: { type: Number, default: 50 },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedExchanges: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
