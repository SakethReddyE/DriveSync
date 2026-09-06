const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Driver = require('../models/Driver');

// Google OAuth — the Client ID is public (also embedded in the frontend), so a
// fallback keeps sign-in working even if the env var isn't set on the host.
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  '522069871211-83ap5f2vd9euhed3ailr6mp127u8l480.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ─── Helper: sign a JWT ───────────────────────────────────────────────────────
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ─── Helper: send validation errors ──────────────────────────────────────────
const sendValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  return null;
};

/**
 * POST /api/auth/signup
 * Register a new customer account.
 */
exports.signup = async (req, res, next) => {
  try {
    const validationError = sendValidationErrors(req, res);
    if (validationError) return;

    const { name, email, phone, password } = req.body;

    // Check for existing user
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({ name, email, phone, password });

    const token = signToken({ id: user._id, role: 'user' });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: 'user',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Unified login for users, drivers, and admin.
 * Returns a JWT and a role so the frontend can route to the correct dashboard.
 */
exports.login = async (req, res, next) => {
  try {
    const validationError = sendValidationErrors(req, res);
    if (validationError) return;

    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // ── Admin check ──────────────────────────────────────────────────────────
    if (
      normalizedEmail === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = signToken({ role: 'admin', email: normalizedEmail, id: 'admin' });
      return res.json({
        success: true,
        token,
        role: 'admin',
        user: { id: 'admin', email: normalizedEmail, name: 'Admin', role: 'admin' },
      });
    }

    // ── Driver check ─────────────────────────────────────────────────────────
    const driver = await Driver.findOne({ email: normalizedEmail }).select('+password');
    if (driver) {
      const match = await driver.matchPassword(password);
      if (!match) {
        return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
      }

      const role = driver.status === 'pending' ? 'driver-pending' : 'driver';
      const token = signToken({ id: driver._id, role });

      return res.json({
        success: true,
        token,
        role,
        user: {
          id: driver._id,
          name: driver.name,
          email: driver.email,
          role,
          status: driver.status,
          online: driver.online,
          rating: driver.rating,
          totalRides: driver.totalRides,
          location: driver.location,
          experience: driver.experience,
          color: driver.color,
        },
      });
    }

    // ── Regular user check ───────────────────────────────────────────────────
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (user) {
      const match = await user.matchPassword(password);
      if (!match) {
        return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
      }

      const token = signToken({ id: user._id, role: 'user' });
      return res.json({
        success: true,
        token,
        role: 'user',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: 'user',
        },
      });
    }

    // Nothing matched
    return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Protected route — requires a valid JWT.
 */
exports.getMe = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({
        success: true,
        user: { email: req.user.email, name: 'Admin', role: 'admin' },
      });
    }

    if (req.user.role === 'driver' || req.user.role === 'driver-pending') {
      const driver = await Driver.findById(req.user.id);
      return res.json({ success: true, user: { ...driver.toObject(), role: req.user.role } });
    }

    const user = await User.findById(req.user.id);
    return res.json({ success: true, user: { ...user.toObject(), role: 'user' } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/google
 * Verifies a Google ID token (from Google Identity Services), finds or creates
 * the matching user, and returns a DriveSync JWT — same shape as login.
 */
exports.googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential)
      return res.status(400).json({ success: false, message: 'Missing Google credential' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = (payload.email || '').toLowerCase().trim();
    if (!email)
      return res.status(400).json({ success: false, message: 'Google account has no email' });

    const name = payload.name || payload.given_name || email.split('@')[0];

    let user = await User.findOne({ email });
    if (!user) {
      // Google users don't use password login — store a random one to satisfy the schema.
      user = await User.create({
        name,
        email,
        phone: 'Google account',
        password: crypto.randomBytes(24).toString('hex'),
      });
    }

    const token = signToken({ id: user._id, role: 'user' });
    return res.json({
      success: true,
      token,
      role: 'user',
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: 'user' },
    });
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: 'Google sign-in failed. Please try again.' });
  }
};
