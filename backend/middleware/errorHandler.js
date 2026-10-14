/**
 * Global error handler middleware.
 * Catches errors thrown by controllers and returns a consistent JSON response.
 */
const errorHandler = (err, req, res, next) => {
  console.error('🔴 Error:', err.message);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Multer file-size limit exceeded
  if (err.code === 'LIMIT_FILE_SIZE') {
    message = 'File too large. Maximum allowed size is 5 MB.';
    statusCode = 413;
  }
  // Multer unexpected field / wrong count errors
  if (err.code && typeof err.code === 'string' && err.code.startsWith('LIMIT_')) {
    statusCode = statusCode === 500 ? 400 : statusCode;
  }

  // Mongoose cast error (e.g. malformed ObjectId in a URL param)
  if (err.name === 'CastError') {
    message = `Invalid ${err.path || 'value'} provided.`;
    statusCode = 400;
  }

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
