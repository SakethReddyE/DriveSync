const mongoose = require('mongoose');

/**
 * Ride model — represents a single booking between a user and a driver.
 * Fare breakdown is stored so the confirmation page can display it accurately.
 */
const rideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    pickup: {
      type: String,
      required: [true, 'Pickup location is required'],
      trim: true,
    },
    drop: {
      type: String,
      required: [true, 'Drop location is required'],
      trim: true,
    },
    // Distance in km (randomly estimated on the frontend; stored here for records)
    distanceKm: {
      type: Number,
      required: true,
    },
    // Fare breakdown
    fare: {
      base: { type: Number, required: true },
      distance: { type: Number, required: true },
      serviceFee: { type: Number, required: true },
      total: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected', 'completed', 'cancelled'],
      default: 'pending', // starts as pending until driver accepts
    },
    // Feedback fields — populated when the user rates the ride
    rated: {
      type: Boolean,
      default: false,
    },
    driverRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    serviceRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    feedbackComment: {
      type: String,
      trim: true,
      default: '',
    },
    // Driver's internal note about the rider
    driverFeedback: {
      rating: { type: Number, min: 1, max: 5, default: null },
      note: { type: String, trim: true, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ride', rideSchema);
