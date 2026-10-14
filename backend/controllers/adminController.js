const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const DriverDocument = require('../models/DriverDocument');

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
    const drivers = await Driver.find({ status: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });
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
    const drivers = await Driver.find({ status: 'approved' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ success: true, drivers });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/drivers/rejected
 * List all rejected driver applications (kept for review history + resubmission).
 */
exports.getRejectedDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find({ status: 'rejected' })
      .select('-password')
      .sort({ reviewedAt: -1 });
    res.json({ success: true, drivers });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/drivers/:id
 * Detailed single application for admin review (no secrets, no binary).
 */
exports.getDriverApplication = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.params.id).select('-password');
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, driver });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/drivers/:id/rc-document
 * Privately streams the applicant's RC document to an authorized admin only.
 * Never exposed through a public URL — requires the admin JWT.
 */
exports.getDriverRcDocument = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.params.id).select('rcDocument rcContentType name');
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (!driver.rcDocument) {
      return res.status(404).json({ success: false, message: 'No RC document on file' });
    }
    const doc = await DriverDocument.findById(driver.rcDocument);
    if (!doc || !doc.data) {
      return res.status(404).json({ success: false, message: 'RC document not found' });
    }
    res.set('Content-Type', doc.contentType || driver.rcContentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="rc-${driver.name.replace(/\s+/g, '-')}"`);
    res.set('Cache-Control', 'no-store');
    return res.send(doc.data);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/drivers/:id/approve
 * Approve a pending driver application.
 *
 * Uses a conditional update ({ status: 'pending' }) so the operation is atomic
 * and idempotent — concurrent or repeated approve requests cannot create an
 * inconsistent state or duplicate driver records.
 */
exports.approveDriver = async (req, res, next) => {
  try {
    const reviewer = req.user.email || 'admin';
    const driver = await Driver.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'approved', reviewedBy: reviewer, reviewedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!driver) {
      const exists = await Driver.findById(req.params.id);
      if (!exists) return res.status(404).json({ success: false, message: 'Driver not found' });
      return res
        .status(400)
        .json({ success: false, message: `Application is not pending (current: ${exists.status})` });
    }

    res.json({ success: true, message: `Driver approved: ${driver.name}`, driver });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/drivers/:id/reject
 * Reject a pending driver application. Non-destructive: the record is kept so
 * the applicant can see the reason and re-apply; the applicant's rider account
 * is untouched and a rejected application never grants driver privileges.
 *
 * Body: { rejectionReason }
 */
exports.rejectDriver = async (req, res, next) => {
  try {
    const reviewer = req.user.email || 'admin';
    const rejectionReason = (req.body && req.body.rejectionReason ? String(req.body.rejectionReason) : '').trim();

    const driver = await Driver.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        status: 'rejected',
        rejectionReason: rejectionReason.slice(0, 500),
        reviewedBy: reviewer,
        reviewedAt: new Date(),
      },
      { new: true }
    ).select('-password');

    if (!driver) {
      const exists = await Driver.findById(req.params.id);
      if (!exists) return res.status(404).json({ success: false, message: 'Driver not found' });
      return res
        .status(400)
        .json({ success: false, message: `Application is not pending (current: ${exists.status})` });
    }

    res.json({ success: true, message: `Application rejected: ${driver.name}`, driver });
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
