const express = require('express');
const { body } = require('express-validator');
const {
  calculateFare, bookRide, getMyRides, rateRide,
  getPendingRidesForDriver, acceptRide, rejectRide,
  cancelRide, getChartData, driverFeedback,
} = require('../controllers/rideController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/fare', calculateFare);

router.post('/book', protect, requireRole('user'),
  [
    body('driverId').notEmpty().withMessage('Driver ID is required'),
    body('pickup').trim().notEmpty().withMessage('Pickup location is required'),
    body('drop').trim().notEmpty().withMessage('Drop location is required'),
    body('distanceKm').isNumeric().withMessage('Distance must be a number'),
    body('fare').isObject().withMessage('Fare breakdown is required'),
  ],
  bookRide
);

router.get('/my', protect, requireRole('user'), getMyRides);
router.get('/pending-for-driver', protect, requireRole('driver'), getPendingRidesForDriver);
router.get('/chart-data', protect, requireRole('admin'), getChartData);

router.patch('/:id/accept', protect, requireRole('driver'), acceptRide);
router.patch('/:id/reject', protect, requireRole('driver'), rejectRide);
router.patch('/:id/cancel', protect, requireRole('user'), cancelRide);
router.patch('/:id/driver-feedback', protect, requireRole('driver'), driverFeedback);

router.post('/:id/rate', protect, requireRole('user'),
  [
    body('driverRating').isInt({ min: 1, max: 5 }).withMessage('Driver rating must be 1–5'),
    body('serviceRating').isInt({ min: 1, max: 5 }).withMessage('Service rating must be 1–5'),
  ],
  rateRide
);

module.exports = router;
