/**
 * Global error handler middleware.
 * Catches errors thrown by controllers and returns a consistent JSON response.
 */
const errorHandler = (err, req, res, next) => {
  console.error('🔴 Error:', err.message);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose duplicate key error (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `An account with this ${field} already exists.`;
    statusCode = 409;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token expired — please sign in again';
    statusCode = 401;
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
