const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const notify = require('../utils/notify');
const { asyncHandler, httpError } = require('../middleware/error');

const assertMember = async (convId, userId) => {
  const conv = await Conversation.findById(convId);
  if (!conv) throw httpError(404, 'Conversation not found');
  if (!conv.participants.some((p) => p.equals(userId))) throw httpError(403, 'Not part of this conversation');
  return conv;
};

const emitToParticipants = (req, conv, event, payload) => {
  const io = req.app.get('io');
  if (!io) return;
  conv.participants.forEach((p) => io.to(`user:${p}`).emit(event, payload));
};

exports.list = asyncHandler(async (req, res) => {
  const convs = await Conversation.find({ participants: req.user._id })
    .sort('-lastMessageAt')
    .populate('participants', 'name avatar lastActive trustScore')
    .populate('resource', 'title images price listingType');
  const unread = await Message.aggregate([
    { $match: { conversation: { $in: convs.map((c) => c._id) }, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } } },
    { $group: { _id: '$conversation', n: { $sum: 1 } } }
  ]);
  const map = Object.fromEntries(unread.map((u) => [String(u._id), u.n]));
  res.json(convs.map((c) => ({ ...c.toObject(), unread: map[String(c._id)] || 0 })));
});

exports.start = asyncHandler(async (req, res) => {
  const { userId, resourceId } = req.body;
  if (!userId || String(userId) === String(req.user._id)) throw httpError(400, 'Choose another student to message');
  if (!(await User.exists({ _id: userId }))) throw httpError(404, 'User not found');
  const query = { participants: { $all: [req.user._id, userId], $size: 2 } };
  if (resourceId) query.resource = resourceId;
  let conv = await Conversation.findOne(query);
  if (!conv) conv = await Conversation.create({ participants: [req.user._id, userId], resource: resourceId || undefined });
  res.json(await conv.populate([{ path: 'participants', select: 'name avatar lastActive trustScore' }, { path: 'resource', select: 'title images price listingType' }]));
});

exports.messages = asyncHandler(async (req, res) => {
  await assertMember(req.params.id, req.user._id);
  const msgs = await Message.find({ conversation: req.params.id }).sort('createdAt').limit(500).populate('sender', 'name avatar');
  await Message.updateMany({ conversation: req.params.id, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
  res.json(msgs);
});

exports.send = asyncHandler(async (req, res) => {
  const conv = await assertMember(req.params.id, req.user._id);
  const { text, offerAmount } = req.body;
  const isOffer = offerAmount !== undefined && offerAmount !== null && offerAmount !== '';
  if (!isOffer && !String(text || '').trim()) throw httpError(400, 'Message cannot be empty');

  if (isOffer) {
    // a new offer supersedes earlier pending ones in this thread
    await Message.updateMany({ conversation: conv._id, kind: 'offer', 'offer.status': 'Pending' }, { 'offer.status': 'Countered' });
  }
  const msg = await Message.create({
    conversation: conv._id,
    sender: req.user._id,
    kind: isOffer ? 'offer' : 'text',
    text: isOffer ? text || `Offered ₹${Number(offerAmount)}` : String(text).trim().slice(0, 2000),
    offer: isOffer ? { amount: Number(offerAmount), status: 'Pending' } : undefined,
    readBy: [req.user._id]
  });
  conv.lastMessage = isOffer ? `Offer: ₹${Number(offerAmount)}` : msg.text.slice(0, 80);
  conv.lastMessageAt = new Date();
  await conv.save();
  const populated = await msg.populate('sender', 'name avatar');
  emitToParticipants(req, conv, 'message:new', populated);
  const other = conv.participants.find((p) => !p.equals(req.user._id));
  if (isOffer) await notify(req, other, { type: 'offer', message: `${req.user.name} made an offer of ₹${Number(offerAmount)}`, link: `/messages/${conv._id}` });
  res.status(201).json(populated);
});

exports.respondOffer = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.messageId);
  if (!msg || msg.kind !== 'offer') throw httpError(404, 'Offer not found');
  const conv = await assertMember(msg.conversation, req.user._id);
  if (msg.sender.equals(req.user._id)) throw httpError(400, 'You cannot respond to your own offer');
  if (msg.offer.status !== 'Pending') throw httpError(400, 'This offer was already answered');
  const { decision } = req.body;
  if (!['Accepted', 'Declined'].includes(decision)) throw httpError(400, 'Decision must be Accepted or Declined');
  msg.offer.status = decision;
  await msg.save();
  const sys = await Message.create({
    conversation: conv._id,
    sender: req.user._id,
    kind: 'system',
    text: `${req.user.name} ${decision.toLowerCase()} the offer of ₹${msg.offer.amount}`,
    readBy: [req.user._id]
  });
  conv.lastMessage = sys.text;
  conv.lastMessageAt = new Date();
  await conv.save();
  emitToParticipants(req, conv, 'message:update', msg);
  emitToParticipants(req, conv, 'message:new', await sys.populate('sender', 'name avatar'));
  await notify(req, msg.sender, { type: 'offer', message: sys.text, link: `/messages/${conv._id}` });
  res.json(msg);
});

exports.unreadCount = asyncHandler(async (req, res) => {
  const convIds = (await Conversation.find({ participants: req.user._id }).select('_id')).map((c) => c._id);
  const count = await Message.countDocuments({ conversation: { $in: convIds }, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } });
  res.json({ count });
});
