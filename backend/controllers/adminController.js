const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');

/**
 * GET /api/admin/stats
 * Dashboard summary counts.
 */
exports.getStats = async (req, res, next) => {
  try {
    const [totalUsers, activeDrivers, pendingDrivers, totalRides] = await Promise.all([
      User.countDocuments(),
      Driver.countDocuments({ status: 'approved' }),
      Driver.countDocuments({ status: 'pending' }),
      Ride.countDocuments(),
    ]);

    res.json({ success: true, stats: { totalUsers, activeDrivers, pendingDrivers, totalRides } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/drivers/pending
 * List all driver applications awaiting review.
 */
exports.getPendingDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json({ success: true, drivers });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/drivers/active
 * List all approved drivers.
 */
exports.getActiveDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find({ status: 'approved' }).sort({ createdAt: -1 });
    res.json({ success: true, drivers });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/drivers/:id/approve
 * Approve a pending driver application.
 */
exports.approveDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (driver.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Driver is not in pending state' });
    }

    driver.status = 'approved';
    await driver.save();

    res.json({ success: true, message: `Driver approved: ${driver.name}`, driver });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/drivers/:id/reject
 * Reject a pending driver application.
 */
exports.rejectDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    res.json({ success: true, message: `Application rejected for: ${driver.name}` });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/drivers/:id
 * Remove an approved driver from the platform.
 */
exports.removeDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    res.json({ success: true, message: `Driver removed: ${driver.name}` });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/users
 * List all registered users.
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/rides
 * List all rides across the platform.
 */
exports.getAllRides = async (req, res, next) => {
  try {
    const rides = await Ride.find()
      .populate('user', 'name email')
      .populate('driver', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, rides });
  } catch (err) {
    next(err);
  }
};
