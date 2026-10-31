const Post = require('../models/Post');
const notify = require('../utils/notify');
const { escapeRegex } = require('../utils/text');
const { asyncHandler, httpError } = require('../middleware/error');

const POP = [
  { path: 'author', select: 'name avatar department role' },
  { path: 'comments.user', select: 'name avatar' }
];

exports.list = asyncHandler(async (req, res) => {
  const { type, q, tag } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (tag) filter.tags = tag.toLowerCase();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { content: rx }, { tags: rx }];
  }
  const posts = await Post.find(filter).sort({ pinned: -1, createdAt: -1 }).limit(100).populate(POP);
  if (req.query.sort === 'top') posts.sort((a, b) => b.pinned - a.pinned || b.likes.length - a.likes.length || b.createdAt - a.createdAt);
  res.json(posts.slice(0, 60));
});

exports.create = asyncHandler(async (req, res) => {
  const { type, title, content, tags, eventDate } = req.body;
  if (type === 'Announcement' && req.user.role !== 'admin') throw httpError(403, 'Only admins can post announcements');
  const post = await Post.create({
    author: req.user._id,
    type, title, content, eventDate: eventDate || undefined,
    tags: (Array.isArray(tags) ? tags : String(tags || '').split(',')).map((t) => t.trim()).filter(Boolean).slice(0, 6)
  });
  res.status(201).json(await post.populate(POP));
});

exports.like = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw httpError(404, 'Post not found');
  const i = post.likes.findIndex((u) => u.equals(req.user._id));
  if (i >= 0) post.likes.splice(i, 1);
  else post.likes.push(req.user._id);
  await post.save();
  res.json({ likes: post.likes });
});

exports.comment = asyncHandler(async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) throw httpError(400, 'Comment cannot be empty');
  const post = await Post.findById(req.params.id);
  if (!post) throw httpError(404, 'Post not found');
  post.comments.push({ user: req.user._id, text: text.slice(0, 1000) });
  await post.save();
  if (!post.author.equals(req.user._id)) {
    await notify(req, post.author, { type: 'community', message: `${req.user.name} commented on "${post.title}"`, link: '/community' });
  }
  res.json(await post.populate(POP));
});

exports.deleteComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw httpError(404, 'Post not found');
  const c = post.comments.id(req.params.commentId);
  if (!c) throw httpError(404, 'Comment not found');
  if (!c.user.equals(req.user._id) && req.user.role !== 'admin') throw httpError(403, 'Not allowed');
  c.deleteOne();
  await post.save();
  res.json(await post.populate(POP));
});

exports.remove = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw httpError(404, 'Post not found');
  if (!post.author.equals(req.user._id) && req.user.role !== 'admin') throw httpError(403, 'Not allowed');
  await post.deleteOne();
  res.json({ message: 'Deleted' });
});

exports.pin = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw httpError(404, 'Post not found');
  post.pinned = !post.pinned;
  await post.save();
  res.json(post);
});
