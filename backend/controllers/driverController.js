const { validationResult } = require('express-validator');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');

// Avatar colours cycled for new drivers
const COLORS = ['#0071e3', '#28cd41', '#ff9500', '#ff3b30', '#5856d6', '#af52de'];

/**
 * POST /api/drivers/apply
 * Submit a driver application. The logged-in user's email is used as the driver email.
 * Status defaults to 'pending' until an admin approves.
 */
exports.applyAsDriver = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, age, phone, licence, experience, location, pastExperience } = req.body;

    // Use the authenticated user's email so the driver can log in with the same credentials
    const email = req.user.role === 'user' ? req.user.user.email : req.body.email;

    // Prevent duplicate applications
    const existing = await Driver.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A driver application with this email already exists.',
      });
    }

    // Assign a colour from the palette
    const count = await Driver.countDocuments();
    const color = COLORS[count % COLORS.length];

    // Default password is set to a placeholder; driver must reset via admin flow
    // In a real app you'd send a password-reset email after approval
    const driver = await Driver.create({
      name,
      age: Number(age),
      phone,
      email,
      password: 'Drv@1234', // hashed by pre-save hook
      licence,
      experience,
      location,
      pastExperience: pastExperience || '',
      color,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted. You will be notified within 24–48 hours.',
      driverId: driver._id,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/drivers/available
 * Returns all approved, online drivers for the booking page.
 * Public route — no auth required.
 */
exports.getAvailableDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find({ status: 'approved', online: true }).select(
      'name age location experience rating totalRides color online'
    );
    res.json({ success: true, drivers });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/drivers/me
 * Returns the authenticated driver's own profile + ride history.
 */
exports.getMyProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const rides = await Ride.find({ driver: driver._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    const totalIncome = rides.reduce((sum, r) => sum + r.fare.total, 0);

    res.json({
      success: true,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        location: driver.location,
        experience: driver.experience,
        rating: driver.rating,
        totalRides: driver.totalRides,
        online: driver.online,
        status: driver.status,
        color: driver.color,
        joinedAt: driver.createdAt,
      },
      rides,
      totalIncome,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/drivers/toggle-online
 * Toggle the driver's online/offline status.
 */
exports.toggleOnline = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (driver.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Only approved drivers can go online' });
    }

    driver.online = !driver.online;
    await driver.save();

    res.json({
      success: true,
      online: driver.online,
      message: driver.online ? 'You are now Online' : 'You are now Offline',
    });
  } catch (err) {
    next(err);
  }
};
