const { validationResult } = require('express-validator');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const DriverDocument = require('../models/DriverDocument');
const { verifyMagicBytes, generateStoredName } = require('../middleware/upload');

// Avatar colours cycled for new drivers
const COLORS = ['#0071e3', '#28cd41', '#ff9500', '#ff3b30', '#5856d6', '#af52de'];

// Vehicle categories offered on the application form.
const VEHICLE_CATEGORIES = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury', 'Electric', 'Other'];

/**
 * Sanitise a Driver application for client consumption — strips secrets and
 * binary data, keeping only the fields an applicant or admin needs to see.
 */
const sanitizeApplication = (d) => ({
  id: d._id,
  name: d.name,
  age: d.age,
  phone: d.phone,
  email: d.email,
  licence: d.licence,
  experience: d.experience,
  location: d.location,
  pastExperience: d.pastExperience,
  vehicleNumber: d.vehicleNumber,
  vehicleMake: d.vehicleMake,
  vehicleModel: d.vehicleModel,
  vehicleCategory: d.vehicleCategory,
  hasRc: Boolean(d.rcDocument),
  rcContentType: d.rcContentType || null,
  status: d.status,
  online: d.online,
  rating: d.rating,
  totalRides: d.totalRides,
  color: d.color,
  rejectionReason: d.rejectionReason || '',
  reviewedBy: d.reviewedBy || '',
  reviewedAt: d.reviewedAt || null,
  submittedAt: d.createdAt,
});

/**
 * POST /api/drivers/apply
 * Submit (or re-submit) a driver application with vehicle details and an RC
 * document. The logged-in rider's email is used as the driver email — the
 * applicant identity always comes from the trusted session, never the client.
 *
 * The route accepts multipart/form-data so the RC file travels with the form.
 * Status defaults to 'pending' until an admin approves.
 */
exports.applyAsDriver = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const {
      name,
      age,
      phone,
      licence,
      experience,
      location,
      pastExperience,
      vehicleNumber,
      vehicleMake,
      vehicleModel,
      vehicleCategory,
    } = req.body;

    // Identity is derived from the authenticated rider session (requireRole('user')).
    const email = req.user.user.email;

    // Verify the RC file's actual content via magic bytes (not the browser claim).
    let detectedMime;
    try {
      detectedMime = verifyMagicBytes(req.file);
    } catch (e) {
      return res.status(e.statusCode || 400).json({ success: false, message: e.message });
    }

    // Reject unsupported vehicle categories if provided.
    if (vehicleCategory && !VEHICLE_CATEGORIES.includes(vehicleCategory)) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle category.' });
    }

    // Check for an existing application under the same trusted email.
    const existing = await Driver.findOne({ email });

    if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
      return res.status(409).json({
        success: false,
        message:
          existing.status === 'approved'
            ? 'You are already an approved driver. Log in with your driver credentials.'
            : 'A driver application with this email is already under review.',
      });
    }

    const count = await Driver.countDocuments();
    const color = COLORS[count % COLORS.length];
    const ext = detectedMime === 'application/pdf' ? 'pdf' : detectedMime === 'image/png' ? 'png' : 'jpg';

    // Build the document payload once (reused for new + re-apply).
    const docFields = {
      field: 'rc',
      filename: req.file.originalname || 'rc-document',
      storedName: generateStoredName(ext),
      contentType: detectedMime,
      size: req.file.size,
      data: req.file.buffer,
    };

    if (existing && existing.status === 'rejected') {
      // Re-application after rejection: create a fresh RC document, then update
      // the existing record and reset review state. Uses updateOne (not save) to
      // avoid re-selecting/re-hashing the password.
      const doc = await DriverDocument.create({ ...docFields, applicant: existing._id });
      const oldDocId = existing.rcDocument;

      await Driver.findByIdAndUpdate(existing._id, {
        $set: {
          name,
          age: Number(age),
          phone,
          licence,
          experience,
          location,
          pastExperience: pastExperience || '',
          vehicleNumber,
          vehicleMake,
          vehicleModel,
          vehicleCategory,
          rcDocument: doc._id,
          rcContentType: detectedMime,
          color,
          status: 'pending',
          rejectionReason: '',
          reviewedBy: '',
          reviewedAt: null,
        },
      });

      if (oldDocId) await DriverDocument.findByIdAndDelete(oldDocId);

      return res.status(200).json({
        success: true,
        message: 'Application re-submitted. An admin will review it within 24–48 hours.',
        driverId: existing._id,
      });
    }

    // New application: create the Driver first (so the RC document has a valid
    // applicant reference), then store the RC document and link it back.
    const driver = await Driver.create({
      name,
      age: Number(age),
      phone,
      email,
      password: 'Drv@1234', // hashed by pre-save hook; temporary password
      licence,
      experience,
      location,
      pastExperience: pastExperience || '',
      vehicleNumber,
      vehicleMake,
      vehicleModel,
      vehicleCategory,
      rcContentType: detectedMime,
      color,
      status: 'pending',
    });

    const doc = await DriverDocument.create({ ...docFields, applicant: driver._id });
    await Driver.findByIdAndUpdate(driver._id, { $set: { rcDocument: doc._id } });

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
 * GET /api/drivers/my-application
 * Returns the authenticated rider's own driver application (if any) and its
 * current verification status. No binary document data is returned.
 */
exports.getMyApplication = async (req, res, next) => {
  try {
    const email = req.user.user.email;
    const driver = await Driver.findOne({ email }).select('-password');
    if (!driver) {
      return res.json({ success: true, application: null });
    }
    res.json({ success: true, application: sanitizeApplication(driver) });
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
