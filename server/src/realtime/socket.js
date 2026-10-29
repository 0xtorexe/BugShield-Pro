const jwt = require('jsonwebtoken');
const config = require('../config');

let io = null;

/**
 * Attach Socket.io to the HTTP server. Each authenticated client joins a
 * private room keyed by its user id so we can push targeted notifications.
 */
function initSocket(server) {
  // Lazy require to avoid a hard dependency when socket.io is absent in tests.
  // eslint-disable-next-line global-require
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: { origin: config.clientUrl, credentials: true },
  });

  // Authenticate the socket handshake with the same JWT used for REST.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      socket.userId = payload.id;
      return next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.on('disconnect', () => {});
  });

  return io;
}

/** Emit an event to a specific user's room (no-op if socket not initialised). */
function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function getIo() {
  return io;
}

module.exports = { initSocket, emitToUser, getIo };
