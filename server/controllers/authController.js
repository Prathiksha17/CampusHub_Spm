const User = require('../models/User');
const signToken = require('../utils/token');
const { asyncHandler, httpError } = require('../middleware/error');

const publicUser = (u) => {
  const o = u.toObject();
  delete o.password;
  return o;
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, studentId, department, year, phone, interests } = req.body;
  if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (await User.findOne({ email: email.toLowerCase() })) throw httpError(400, 'An account with this email already exists');

  // Auto-verify students registering with a campus (.edu / .ac.in) address
  const isVerified = /\.(edu|ac\.in|edu\.in)$/i.test(email);
  const user = await User.create({
    name, email, password, studentId, department, year, phone, isVerified,
    interests: Array.isArray(interests) ? interests : []
  });
  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password || ''))) throw httpError(401, 'Email or password is incorrect');
  if (user.isBanned) throw httpError(403, 'Your account has been suspended. Contact the admin team.');
  res.json({ token: signToken(user._id), user: publicUser(user) });
});

exports.me = asyncHandler(async (req, res) => {
  res.json(req.user);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const fields = ['name', 'studentId', 'department', 'year', 'phone', 'bio', 'hostel'];
  fields.forEach((f) => req.body[f] !== undefined && (req.user[f] = req.body[f]));
  if (req.body.interests !== undefined) {
    const list = typeof req.body.interests === 'string' ? JSON.parse(req.body.interests) : req.body.interests;
    req.user.interests = list.filter(Boolean).slice(0, 15);
  }
  if (req.file) req.user.avatar = `/uploads/${req.file.filename}`;
  await req.user.save();
  res.json(req.user);
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword || ''))) throw httpError(400, 'Current password is incorrect');
  if (!newPassword || newPassword.length < 6) throw httpError(400, 'New password must be at least 6 characters');
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});
