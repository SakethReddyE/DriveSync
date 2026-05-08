const express = require('express');
const {
  getStats,
  getPendingDrivers,
  getActiveDrivers,
  approveDriver,
  rejectDriver,
  removeDriver,
  getAllUsers,
  getAllRides,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require a valid JWT with role === 'admin'
router.use(protect, requireRole('admin'));

router.get('/stats', getStats);
router.get('/drivers/pending', getPendingDrivers);
router.get('/drivers/active', getActiveDrivers);
router.patch('/drivers/:id/approve', approveDriver);
router.patch('/drivers/:id/reject', rejectDriver);
router.delete('/drivers/:id', removeDriver);
router.get('/users', getAllUsers);
router.get('/rides', getAllRides);

module.exports = router;
