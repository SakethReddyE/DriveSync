const express = require('express');
const { body } = require('express-validator');
const { signup, login, getMe, googleAuth } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  signup
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

// POST /api/auth/google  — sign in / sign up with a Google ID token
router.post('/google', googleAuth);

// GET /api/auth/me  (protected)
router.get('/me', protect, getMe);

module.exports = router;
