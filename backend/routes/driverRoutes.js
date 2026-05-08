const express = require('express');
const { body } = require('express-validator');
const {
  applyAsDriver,
  getAvailableDrivers,
  getMyProfile,
  toggleOnline,
} = require('../controllers/driverController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/drivers/available  — public, used by the booking page
router.get('/available', getAvailableDrivers);

// POST /api/drivers/apply  — authenticated user submits a driver application
router.post(
  '/apply',
  protect,
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('age')
      .isInt({ min: 18, max: 70 })
      .withMessage('Age must be between 18 and 70'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('licence').trim().notEmpty().withMessage('Licence number is required'),
    body('experience').notEmpty().withMessage('Experience is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
  ],
  applyAsDriver
);

// GET /api/drivers/me  — driver's own profile + rides
router.get('/me', protect, requireRole('driver', 'driver-pending'), getMyProfile);

// PATCH /api/drivers/toggle-online  — toggle availability
router.patch('/toggle-online', protect, requireRole('driver'), toggleOnline);

module.exports = router;
