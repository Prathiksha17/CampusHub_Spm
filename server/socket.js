const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Conversation = require('./models/Conversation');

const online = new Map(); // userId -> socket count

exports.initSocket = (server) => {
  const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || '*', credentials: true } });

  io.use((socket, next) => {
    try {
      const { id } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      socket.userId = String(id);
      next();
    } catch (e) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.userId;
    socket.join(`user:${uid}`);
    online.set(uid, (online.get(uid) || 0) + 1);
    io.emit('presence', { userId: uid, online: true });
    socket.emit('presence:list', [...online.keys()]);

    socket.on('typing', async ({ conversationId, typing }) => {
      const conv = await Conversation.findById(conversationId).select('participants').catch(() => null);
      if (!conv || !conv.participants.some((p) => String(p) === uid)) return;
      conv.participants.filter((p) => String(p) !== uid).forEach((p) => io.to(`user:${p}`).emit('typing', { conversationId, userId: uid, typing }));
    });

    socket.on('disconnect', () => {
      const n = (online.get(uid) || 1) - 1;
      if (n <= 0) {
        online.delete(uid);
        io.emit('presence', { userId: uid, online: false });
      } else online.set(uid, n);
    });
  });

  return io;
};
