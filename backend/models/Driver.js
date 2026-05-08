const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Driver model — represents a driver on the platform.
 * A driver can be in one of three states: pending, approved, or rejected.
 * Passwords are hashed via a pre-save hook.
 */
const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [18, 'Minimum age is 18'],
      max: [70, 'Maximum age is 70'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    licence: {
      type: String,
      required: [true, 'Licence number is required'],
      trim: true,
    },
    experience: {
      type: String,
      required: [true, 'Experience is required'],
      enum: ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    pastExperience: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    online: {
      type: Boolean,
      default: false,
    },
    // Computed/cached rating — updated whenever a ride is rated
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRides: {
      type: Number,
      default: 0,
    },
    // Avatar colour used in the frontend
    color: {
      type: String,
      default: '#6e6e73',
    },
  },
  { timestamps: true }
);

// Hash password before saving
driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare passwords
driverSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Driver', driverSchema);
