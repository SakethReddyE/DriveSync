/**
 * DriveSync — Express + MongoDB + Socket.io backend
 * Entry point: server.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const socketManager = require('./socket');

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const driverRoutes = require('./routes/driverRoutes');
const rideRoutes = require('./routes/rideRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app); // wrap express in http.Server for socket.io

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow any origin — required because Vercel generates multiple preview URLs
app.use(
  cors({
    origin: true, // reflects the request origin, allowing all
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
// Handle preflight requests explicitly
app.options('*', cors());

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'DriveSync API is running 🚗', timestamp: new Date() });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/admin', adminRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// Only connect to the DB, bind Socket.io, and start listening when run directly
// (e.g. `node server.js` on Render). When required by tests, the caller controls
// the database connection and uses the exported app directly.
if (require.main === module) {
  // ── Connect to MongoDB ──────────────────────────────────────────────────────
  connectDB();

  // ── Socket.io ───────────────────────────────────────────────────────────────
  socketManager.init(server);

  // ── Start server ──────────────────────────────────────────────────────────────
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀  DriveSync API running on http://localhost:${PORT}`);
  });
}

module.exports = { app, server };
