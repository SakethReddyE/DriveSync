const express = require('express');
const { body } = require('express-validator');
const {
  applyAsDriver,
  getAvailableDrivers,
  getMyProfile,
  getMyApplication,
  toggleOnline,
} = require('../controllers/driverController');
const { protect, requireRole } = require('../middleware/auth');
const { rcUpload } = require('../middleware/upload');

const router = express.Router();

// GET /api/drivers/available  — public, used by the booking page
router.get('/available', getAvailableDrivers);

// POST /api/drivers/apply  — authenticated rider submits a driver application
// multipart/form-data: text fields + an RC file (field name "rcDocument").
// multer runs before the validators so it can populate req.body from the form.
router.post(
  '/apply',
  protect,
  requireRole('user'),
  rcUpload.single('rcDocument'),
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('age')
      .isInt({ min: 18, max: 70 })
      .withMessage('Age must be between 18 and 70'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('licence').trim().notEmpty().withMessage('Licence number is required'),
    body('experience').notEmpty().withMessage('Experience is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('vehicleNumber').trim().notEmpty().withMessage('Vehicle registration number is required'),
    body('vehicleMake').trim().notEmpty().withMessage('Vehicle make is required'),
    body('vehicleModel').trim().notEmpty().withMessage('Vehicle model is required'),
    body('vehicleCategory').trim().notEmpty().withMessage('Vehicle category is required'),
  ],
  applyAsDriver
);

// GET /api/drivers/my-application  — applicant (rider) views their own status
router.get('/my-application', protect, requireRole('user'), getMyApplication);

// GET /api/drivers/me  — driver's own profile + rides
router.get('/me', protect, requireRole('driver', 'driver-pending'), getMyProfile);

// PATCH /api/drivers/toggle-online  — toggle availability
router.patch('/toggle-online', protect, requireRole('driver'), toggleOnline);

module.exports = router;
