/**
 * DriveSync — Socket.io manager
 * Tracks connected users/drivers by their MongoDB ID so the server
 * can push events directly to a specific client.
 */

let _io = null;

// Map: userId (string) → socket.id
const userSockets = new Map();
// Map: driverId (string) → socket.id
const driverSockets = new Map();

function init(server) {
  const { Server } = require('socket.io');
  _io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  _io.on('connection', (socket) => {
    // Client sends { role: 'user'|'driver'|'admin', id: mongoId } after connecting
    socket.on('register', ({ role, id }) => {
      if (role === 'driver') {
        driverSockets.set(String(id), socket.id);
        console.log(`🟢 Driver connected: ${id}`);
      } else if (role === 'user') {
        userSockets.set(String(id), socket.id);
        console.log(`🔵 User connected: ${id}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean up maps on disconnect
      for (const [id, sid] of driverSockets) {
        if (sid === socket.id) { driverSockets.delete(id); break; }
      }
      for (const [id, sid] of userSockets) {
        if (sid === socket.id) { userSockets.delete(id); break; }
      }
    });
  });

  return _io;
}

function getIO() { return _io; }

/** Emit an event to a specific driver */
function emitToDriver(driverId, event, data) {
  if (!_io) return;
  const sid = driverSockets.get(String(driverId));
  if (sid) _io.to(sid).emit(event, data);
}

/** Emit an event to a specific user */
function emitToUser(userId, event, data) {
  if (!_io) return;
  const sid = userSockets.get(String(userId));
  if (sid) _io.to(sid).emit(event, data);
}

module.exports = { init, getIO, emitToDriver, emitToUser };
