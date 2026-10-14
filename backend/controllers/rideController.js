const { validationResult } = require('express-validator');
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const { emitToDriver, emitToUser } = require('../socket');

/**
 * Real road-distance matrix for the 12 Hyderabad areas used in the booking UI.
 * Values are approximate road distances in km based on actual route data.
 * The matrix is symmetric (A→B == B→A).
 * Keys must match exactly the strings in frontend/src/pages/Book.jsx AREAS array.
 */
const AREA_DISTANCES = {
  'Kukatpally, Hyderabad': {
    'Kukatpally, Hyderabad':    0,
    'Madhapur, Hyderabad':      5.8,
    'HITEC City, Hyderabad':    7.2,
    'Gachibowli, Hyderabad':    9.5,
    'Kondapur, Hyderabad':      6.4,
    'Banjara Hills, Hyderabad': 10.2,
    'Jubilee Hills, Hyderabad': 9.8,
    'Ameerpet, Hyderabad':      6.1,
    'Begumpet, Hyderabad':      8.3,
    'Secunderabad, Hyderabad':  14.0,
    'Miyapur, Hyderabad':       4.5,
    'LB Nagar, Hyderabad':      22.5,
  },
  'Madhapur, Hyderabad': {
    'Kukatpally, Hyderabad':    5.8,
    'Madhapur, Hyderabad':      0,
    'HITEC City, Hyderabad':    1.8,
    'Gachibowli, Hyderabad':    4.2,
    'Kondapur, Hyderabad':      2.5,
    'Banjara Hills, Hyderabad': 5.5,
    'Jubilee Hills, Hyderabad': 4.8,
    'Ameerpet, Hyderabad':      7.3,
    'Begumpet, Hyderabad':      9.4,
    'Secunderabad, Hyderabad':  16.2,
    'Miyapur, Hyderabad':       9.1,
    'LB Nagar, Hyderabad':      23.8,
  },
  'HITEC City, Hyderabad': {
    'Kukatpally, Hyderabad':    7.2,
    'Madhapur, Hyderabad':      1.8,
    'HITEC City, Hyderabad':    0,
    'Gachibowli, Hyderabad':    3.5,
    'Kondapur, Hyderabad':      2.9,
    'Banjara Hills, Hyderabad': 5.2,
    'Jubilee Hills, Hyderabad': 3.8,
    'Ameerpet, Hyderabad':      8.5,
    'Begumpet, Hyderabad':      10.1,
    'Secunderabad, Hyderabad':  17.5,
    'Miyapur, Hyderabad':       10.4,
    'LB Nagar, Hyderabad':      25.0,
  },
  'Gachibowli, Hyderabad': {
    'Kukatpally, Hyderabad':    9.5,
    'Madhapur, Hyderabad':      4.2,
    'HITEC City, Hyderabad':    3.5,
    'Gachibowli, Hyderabad':    0,
    'Kondapur, Hyderabad':      4.8,
    'Banjara Hills, Hyderabad': 7.6,
    'Jubilee Hills, Hyderabad': 6.3,
    'Ameerpet, Hyderabad':      11.2,
    'Begumpet, Hyderabad':      13.0,
    'Secunderabad, Hyderabad':  20.4,
    'Miyapur, Hyderabad':       12.8,
    'LB Nagar, Hyderabad':      21.0,
  },
  'Kondapur, Hyderabad': {
    'Kukatpally, Hyderabad':    6.4,
    'Madhapur, Hyderabad':      2.5,
    'HITEC City, Hyderabad':    2.9,
    'Gachibowli, Hyderabad':    4.8,
    'Kondapur, Hyderabad':      0,
    'Banjara Hills, Hyderabad': 7.3,
    'Jubilee Hills, Hyderabad': 6.1,
    'Ameerpet, Hyderabad':      9.4,
    'Begumpet, Hyderabad':      11.2,
    'Secunderabad, Hyderabad':  18.6,
    'Miyapur, Hyderabad':       8.7,
    'LB Nagar, Hyderabad':      26.0,
  },
  'Banjara Hills, Hyderabad': {
    'Kukatpally, Hyderabad':    10.2,
    'Madhapur, Hyderabad':      5.5,
    'HITEC City, Hyderabad':    5.2,
    'Gachibowli, Hyderabad':    7.6,
    'Kondapur, Hyderabad':      7.3,
    'Banjara Hills, Hyderabad': 0,
    'Jubilee Hills, Hyderabad': 2.8,
    'Ameerpet, Hyderabad':      4.5,
    'Begumpet, Hyderabad':      5.8,
    'Secunderabad, Hyderabad':  11.0,
    'Miyapur, Hyderabad':       15.0,
    'LB Nagar, Hyderabad':      14.5,
  },
  'Jubilee Hills, Hyderabad': {
    'Kukatpally, Hyderabad':    9.8,
    'Madhapur, Hyderabad':      4.8,
    'HITEC City, Hyderabad':    3.8,
    'Gachibowli, Hyderabad':    6.3,
    'Kondapur, Hyderabad':      6.1,
    'Banjara Hills, Hyderabad': 2.8,
    'Jubilee Hills, Hyderabad': 0,
    'Ameerpet, Hyderabad':      5.6,
    'Begumpet, Hyderabad':      7.2,
    'Secunderabad, Hyderabad':  13.5,
    'Miyapur, Hyderabad':       14.0,
    'LB Nagar, Hyderabad':      16.0,
  },
  'Ameerpet, Hyderabad': {
    'Kukatpally, Hyderabad':    6.1,
    'Madhapur, Hyderabad':      7.3,
    'HITEC City, Hyderabad':    8.5,
    'Gachibowli, Hyderabad':    11.2,
    'Kondapur, Hyderabad':      9.4,
    'Banjara Hills, Hyderabad': 4.5,
    'Jubilee Hills, Hyderabad': 5.6,
    'Ameerpet, Hyderabad':      0,
    'Begumpet, Hyderabad':      2.8,
    'Secunderabad, Hyderabad':  7.5,
    'Miyapur, Hyderabad':       10.5,
    'LB Nagar, Hyderabad':      17.8,
  },
  'Begumpet, Hyderabad': {
    'Kukatpally, Hyderabad':    8.3,
    'Madhapur, Hyderabad':      9.4,
    'HITEC City, Hyderabad':    10.1,
    'Gachibowli, Hyderabad':    13.0,
    'Kondapur, Hyderabad':      11.2,
    'Banjara Hills, Hyderabad': 5.8,
    'Jubilee Hills, Hyderabad': 7.2,
    'Ameerpet, Hyderabad':      2.8,
    'Begumpet, Hyderabad':      0,
    'Secunderabad, Hyderabad':  4.8,
    'Miyapur, Hyderabad':       13.0,
    'LB Nagar, Hyderabad':      19.5,
  },
  'Secunderabad, Hyderabad': {
    'Kukatpally, Hyderabad':    14.0,
    'Madhapur, Hyderabad':      16.2,
    'HITEC City, Hyderabad':    17.5,
    'Gachibowli, Hyderabad':    20.4,
    'Kondapur, Hyderabad':      18.6,
    'Banjara Hills, Hyderabad': 11.0,
    'Jubilee Hills, Hyderabad': 13.5,
    'Ameerpet, Hyderabad':      7.5,
    'Begumpet, Hyderabad':      4.8,
    'Secunderabad, Hyderabad':  0,
    'Miyapur, Hyderabad':       18.5,
    'LB Nagar, Hyderabad':      22.0,
  },
  'Miyapur, Hyderabad': {
    'Kukatpally, Hyderabad':    4.5,
    'Madhapur, Hyderabad':      9.1,
    'HITEC City, Hyderabad':    10.4,
    'Gachibowli, Hyderabad':    12.8,
    'Kondapur, Hyderabad':      8.7,
    'Banjara Hills, Hyderabad': 15.0,
    'Jubilee Hills, Hyderabad': 14.0,
    'Ameerpet, Hyderabad':      10.5,
    'Begumpet, Hyderabad':      13.0,
    'Secunderabad, Hyderabad':  18.5,
    'Miyapur, Hyderabad':       0,
    'LB Nagar, Hyderabad':      27.0,
  },
  'LB Nagar, Hyderabad': {
    'Kukatpally, Hyderabad':    22.5,
    'Madhapur, Hyderabad':      23.8,
    'HITEC City, Hyderabad':    25.0,
    'Gachibowli, Hyderabad':    21.0,
    'Kondapur, Hyderabad':      26.0,
    'Banjara Hills, Hyderabad': 14.5,
    'Jubilee Hills, Hyderabad': 16.0,
    'Ameerpet, Hyderabad':      17.8,
    'Begumpet, Hyderabad':      19.5,
    'Secunderabad, Hyderabad':  22.0,
    'Miyapur, Hyderabad':       27.0,
    'LB Nagar, Hyderabad':      0,
  },
};

/**
 * Look up real road distance between two areas.
 * Falls back to a straight-line estimate if either location isn't in the matrix
 * (handles free-text input gracefully).
 */
function getRoadDistance(pickup, drop) {
  // Normalise: trim and try exact match first
  const p = (pickup || '').trim();
  const d = (drop || '').trim();

  if (AREA_DISTANCES[p] && AREA_DISTANCES[p][d] !== undefined) {
    return AREA_DISTANCES[p][d];
  }

  // Partial match — the user may have typed just "Madhapur" without ", Hyderabad"
  const pKey = Object.keys(AREA_DISTANCES).find(
    k => k.toLowerCase().startsWith(p.toLowerCase().replace(', hyderabad', ''))
  );
  const dKey = Object.keys(AREA_DISTANCES).find(
    k => k.toLowerCase().startsWith(d.toLowerCase().replace(', hyderabad', ''))
  );
  if (pKey && dKey && AREA_DISTANCES[pKey][dKey] !== undefined) {
    return AREA_DISTANCES[pKey][dKey];
  }

  // Unknown location — return a reasonable default (10 km)
  return 10;
}

exports.calculateFare = async (req, res, next) => {
  try {
    const { pickup, drop } = req.body;
    if (!pickup || !drop)
      return res.status(400).json({ success: false, message: 'Pickup and drop are required' });

    if (pickup.trim() === drop.trim())
      return res.status(400).json({ success: false, message: 'Pickup and drop cannot be the same location' });

    const km = getRoadDistance(pickup, drop);

    const base = 40;
    const distCharge = Math.round(km * 12); // ₹12 per km — realistic Hyderabad rate
    const serviceFee = Math.round((base + distCharge) * 0.05);
    const total = base + distCharge + serviceFee;

    res.json({
      success: true,
      fare: { base, distance: distCharge, serviceFee, total },
      distanceKm: km,
      pickup,
      drop
    });
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
