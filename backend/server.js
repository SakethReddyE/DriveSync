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

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

const app = express();
const server = http.createServer(app); // wrap express in http.Server for socket.io

// ── Socket.io ─────────────────────────────────────────────────────────────────
socketManager.init(server);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── One-time seed route (remove after seeding) ───────────────────────────────
app.get('/api/seed', async (req, res) => {
  try {
    const Driver = require('./models/Driver');
    const SEED_DRIVERS = [
      { name:'Ramesh Kumar', age:34, phone:'9876543210', email:'ramesh@drv.in', password:'Drv@1234', licence:'TS04 20180034567', experience:'5–10 years', location:'Kukatpally', pastExperience:'Ola Driver — 4 years', status:'approved', online:true, rating:4.9, totalRides:320, color:'#0071e3' },
      { name:'Suresh Babu', age:41, phone:'9876501234', email:'suresh@drv.in', password:'Drv@1234', licence:'TS09 20150021890', experience:'10+ years', location:'Madhapur', pastExperience:'Private employer — 6 years', status:'approved', online:true, rating:4.7, totalRides:512, color:'#28cd41' },
      { name:'Pradeep Varma', age:28, phone:'9871234560', email:'pradeep@drv.in', password:'Drv@1234', licence:'TS12 20200056789', experience:'3–5 years', location:'Hitech City', pastExperience:'Uber Driver — 3 years', status:'approved', online:true, rating:4.8, totalRides:198, color:'#ff9500' },
      { name:'Mohammed Irfan', age:36, phone:'9812345670', email:'irfan@drv.in', password:'Drv@1234', licence:'TS08 20160043210', experience:'5–10 years', location:'Banjara Hills', pastExperience:'Corporate driver — 5 years', status:'approved', online:false, rating:4.6, totalRides:280, color:'#ff3b30' },
    ];
    const results = [];
    for (const d of SEED_DRIVERS) {
      const exists = await Driver.findOne({ email: d.email });
      if (exists) { results.push(`Skipped: ${d.name}`); continue; }
      await Driver.create(d);
      results.push(`Created: ${d.name}`);
    }
    res.json({ success: true, results });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

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

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀  DriveSync API running on http://localhost:${PORT}`);
});
