const { validationResult } = require('express-validator');
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const { emitToDriver, emitToUser } = require('../socket');

exports.calculateFare = async (req, res, next) => {
  try {
    const { pickup, drop } = req.body;
    if (!pickup || !drop)
      return res.status(400).json({ success: false, message: 'Pickup and drop are required' });

    // Deterministic distance based on pickup+drop text so the same pair
    // always returns the same fare. Uses a simple hash of the combined string.
    const combined = (pickup + '|' + drop).toLowerCase().trim();
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 31 + combined.charCodeAt(i)) & 0xffffffff;
    }
    // Map hash to 4–19 km range
    const km = 4 + (Math.abs(hash) % 16);

    const base = 40;
    const distCharge = km * 6;
    const serviceFee = Math.round((base + distCharge) * 0.05);
    const total = base + distCharge + serviceFee;

    res.json({ success: true, fare: { base, distance: distCharge, serviceFee, total }, distanceKm: km, pickup, drop });
  } catch (err) { next(err); }
};

exports.bookRide = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: errors.array()[0].msg });

    const { driverId, pickup, drop, distanceKm, fare } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (driver.status !== 'approved' || !driver.online)
      return res.status(400).json({ success: false, message: 'Driver is not available right now' });

    const existing = await Ride.findOne({ driver: driverId, status: 'pending' });
    if (existing)
      return res.status(400).json({ success: false, message: 'Driver already has a pending request. Try again shortly.' });

    const ride = await Ride.create({ user: req.user.id, driver: driverId, pickup, drop, distanceKm, fare, status: 'pending' });
    await ride.populate('driver', 'name color location rating totalRides');
    await ride.populate('user', 'name email phone');

    // 🔴 Real-time: push new ride request to the driver instantly
    emitToDriver(driverId, 'new_ride_request', {
      rideId: ride._id,
      pickup: ride.pickup,
      drop: ride.drop,
      distanceKm: ride.distanceKm,
      fare: ride.fare,
      user: { name: ride.user.name, phone: ride.user.phone },
    });

    res.status(201).json({
      success: true,
      message: `Request sent to ${driver.name}. Waiting for driver to accept...`,
      ride,
    });
  } catch (err) { next(err); }
};

exports.getPendingRidesForDriver = async (req, res, next) => {
  try {
    const rides = await Ride.find({ driver: req.user.id, status: 'pending' })
      .populate('user', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, rides });
  } catch (err) { next(err); }
};

exports.acceptRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id).populate('user', 'name');
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    if (ride.driver.toString() !== req.user.id.toString())
      return res.status(403).json({ success: false, message: 'Not your ride request' });
    if (ride.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Ride is no longer pending' });

    ride.status = 'confirmed';
    await ride.save();
    await Driver.findByIdAndUpdate(req.user.id, { $inc: { totalRides: 1 } });

    // 🔴 Real-time: notify user their ride was accepted
    emitToUser(ride.user._id, 'ride_accepted', { rideId: ride._id });

    res.json({ success: true, message: 'Ride accepted!', ride });
  } catch (err) { next(err); }
};

exports.rejectRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id).populate('user', 'name');
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    if (ride.driver.toString() !== req.user.id.toString())
      return res.status(403).json({ success: false, message: 'Not your ride request' });
    if (ride.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Ride is no longer pending' });

    ride.status = 'rejected';
    await ride.save();

    // 🔴 Real-time: notify user their ride was rejected
    emitToUser(ride.user._id, 'ride_rejected', { rideId: ride._id });

    res.json({ success: true, message: 'Ride declined.' });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/rides/:id/cancel
 * User cancels a pending ride.
 */
exports.cancelRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    if (ride.user.toString() !== req.user.id.toString())
      return res.status(403).json({ success: false, message: 'Not your ride' });
    if (!['pending', 'confirmed'].includes(ride.status))
      return res.status(400).json({ success: false, message: 'This ride cannot be cancelled' });

    ride.status = 'cancelled';
    await ride.save();

    // 🔴 Real-time: notify driver the ride was cancelled
    emitToDriver(ride.driver, 'ride_cancelled', { rideId: ride._id });

    res.json({ success: true, message: 'Ride cancelled.' });
  } catch (err) { next(err); }
};

exports.getMyRides = async (req, res, next) => {
  try {
    const rides = await Ride.find({ user: req.user.id })
      .populate('driver', 'name color location rating')
      .sort({ createdAt: -1 });

    const totalSpent = rides.filter(r => r.status === 'confirmed' || r.status === 'completed')
      .reduce((sum, r) => sum + r.fare.total, 0);
    const ratedRides = rides.filter((r) => r.rated && r.driverRating);
    const avgRating = ratedRides.length
      ? +(ratedRides.reduce((s, r) => s + r.driverRating, 0) / ratedRides.length).toFixed(1)
      : null;

    res.json({ success: true, rides, totalSpent, avgRating });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/rides/:id/driver-feedback
 * Driver leaves an internal note/rating about the rider.
 */
exports.driverFeedback = async (req, res, next) => {
  try {
    const { rating, note } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    if (ride.driver.toString() !== req.user.id.toString())
      return res.status(403).json({ success: false, message: 'Not your ride' });

    ride.driverFeedback = { rating: rating || null, note: note || '' };
    await ride.save();
    res.json({ success: true, message: 'Note saved.' });
  } catch (err) { next(err); }
};

exports.rateRide = async (req, res, next) => {
  try {
    const { driverRating, serviceRating, comment } = req.body;
    if (!driverRating || !serviceRating)
      return res.status(400).json({ success: false, message: 'Please rate both driver and service' });

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    if (ride.user.toString() !== req.user.id.toString())
      return res.status(403).json({ success: false, message: 'Not your ride' });
    if (ride.rated)
      return res.status(400).json({ success: false, message: 'Already rated' });

    ride.rated = true;
    ride.driverRating = driverRating;
    ride.serviceRating = serviceRating;
    ride.feedbackComment = comment || '';
    await ride.save();

    const ratedRides = await Ride.find({ driver: ride.driver, rated: true, driverRating: { $ne: null } });
    if (ratedRides.length) {
      const avg = +(ratedRides.reduce((s, r) => s + r.driverRating, 0) / ratedRides.length).toFixed(1);
      await Driver.findByIdAndUpdate(ride.driver, { rating: avg });
    }

    res.json({ success: true, message: 'Thank you for your feedback! ⭐' });
  } catch (err) { next(err); }
};

/**
 * GET /api/rides/admin-chart-data
 * Returns rides-per-day and revenue-per-day for the last 7 days (admin only).
 */
exports.getChartData = async (req, res, next) => {
  try {
    const days = 7;
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const rides = await Ride.find({
      createdAt: { $gte: since },
      status: { $in: ['confirmed', 'completed'] },
    }).select('createdAt fare');

    // Build label array for last 7 days
    const labels = [];
    const ridesPerDay = [];
    const revenuePerDay = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      labels.push(label);

      const dayRides = rides.filter(r => {
        const rd = new Date(r.createdAt);
        return rd.getDate() === d.getDate() && rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
      });
      ridesPerDay.push(dayRides.length);
      revenuePerDay.push(dayRides.reduce((s, r) => s + r.fare.total, 0));
    }

    res.json({ success: true, labels, ridesPerDay, revenuePerDay });
  } catch (err) { next(err); }
};
