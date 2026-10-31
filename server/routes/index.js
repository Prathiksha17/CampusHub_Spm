const express = require('express');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const resources = require('../controllers/resourceController');
const exchanges = require('../controllers/exchangeController');
const messages = require('../controllers/messageController');
const lf = require('../controllers/lostFoundController');
const community = require('../controllers/communityController');
const reviews = require('../controllers/reviewController');
const notifications = require('../controllers/notificationController');
const ai = require('../controllers/aiController');
const impact = require('../controllers/impactController');
const admin = require('../controllers/adminController');
const reports = require('../controllers/reportController');
const C = require('../utils/constants');

const r = express.Router();

// 1. Authentication & profile
r.post('/auth/register', auth.register);
r.post('/auth/login', auth.login);
r.get('/auth/me', protect, auth.me);
r.put('/auth/profile', protect, upload.single('avatar'), auth.updateProfile);
r.put('/auth/password', protect, auth.changePassword);

r.get('/meta', (req, res) => res.json({ categories: C.CATEGORIES, conditions: C.CONDITIONS, listingTypes: C.LISTING_TYPES, departments: C.DEPARTMENTS }));

r.get('/users/leaderboard', users.leaderboard);
r.get('/users/wishlist', protect, users.getWishlist);
r.post('/users/wishlist/:resourceId', protect, users.toggleWishlist);
r.get('/users/:id', users.getProfile);

// 2-3. Listings + smart search
r.get('/resources', optionalAuth, resources.list);
r.get('/resources/suggest', resources.suggestions);
r.get('/resources/mine', protect, resources.mine);
r.post('/resources', protect, upload.array('images', 6), resources.create);
r.get('/resources/:id', optionalAuth, resources.get);
r.get('/resources/:id/similar', resources.similar);
r.put('/resources/:id', protect, upload.array('images', 6), resources.update);
r.delete('/resources/:id', protect, resources.remove);
r.post('/resources/:id/report', protect, resources.report);

// 4. Exchanges
r.post('/exchanges', protect, exchanges.create);
r.get('/exchanges', protect, exchanges.list);
r.get('/exchanges/:id', protect, exchanges.get);
r.patch('/exchanges/:id/status', protect, exchanges.updateStatus);
r.patch('/exchanges/:id/confirm', protect, exchanges.confirm);

// 5. Communication & negotiation
r.get('/messages', protect, messages.list);
r.get('/messages/unread', protect, messages.unreadCount);
r.post('/messages/start', protect, messages.start);
r.get('/messages/:id', protect, messages.messages);
r.post('/messages/:id', protect, messages.send);
r.patch('/messages/offer/:messageId', protect, messages.respondOffer);

// 6. Lost & found
r.get('/lostfound', lf.list);
r.post('/lostfound', protect, upload.single('image'), lf.create);
r.get('/lostfound/:id', lf.get);
r.post('/lostfound/:id/claim', protect, lf.claim);
r.patch('/lostfound/:id/status', protect, lf.updateStatus);
r.delete('/lostfound/:id', protect, lf.remove);

// 7. Community hub
r.get('/community', community.list);
r.post('/community', protect, community.create);
r.post('/community/:id/like', protect, community.like);
r.post('/community/:id/comments', protect, community.comment);
r.delete('/community/:id/comments/:commentId', protect, community.deleteComment);
r.delete('/community/:id', protect, community.remove);
r.patch('/community/:id/pin', protect, adminOnly, community.pin);

// 8. AI recommendations & analytics
r.get('/ai/recommendations', protect, ai.recommendations);
r.get('/ai/price-suggest', ai.priceSuggest);
r.get('/ai/insights', protect, ai.insights);

// 9. Reviews & trust
r.post('/reviews', protect, reviews.create);
r.get('/reviews/user/:userId', reviews.forUser);
r.post('/reports', protect, reports.create);

// Notifications
r.get('/notifications', protect, notifications.list);
r.patch('/notifications/read-all', protect, notifications.markAll);
r.patch('/notifications/:id/read', protect, notifications.markRead);
r.delete('/notifications', protect, notifications.clear);

// 10. Admin
r.get('/admin/stats', protect, adminOnly, admin.stats);
r.get('/admin/users', protect, adminOnly, admin.users);
r.patch('/admin/users/:id', protect, adminOnly, admin.updateUser);
r.get('/admin/resources', protect, adminOnly, admin.resources);
r.patch('/admin/resources/:id', protect, adminOnly, admin.updateResource);
r.delete('/admin/resources/:id', protect, adminOnly, admin.deleteResource);
r.get('/admin/reports', protect, adminOnly, admin.reports);
r.patch('/admin/reports/:id', protect, adminOnly, admin.resolveReport);
r.get('/admin/exchanges', protect, adminOnly, admin.exchanges);
r.post('/admin/broadcast', protect, adminOnly, admin.broadcast);

// 11. Circular economy
r.get('/impact/campus', impact.campus);
r.get('/impact/me', protect, impact.mine);

module.exports = r;
