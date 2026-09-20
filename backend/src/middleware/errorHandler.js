'use strict';

const { sendError } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message;

  // Mongoose field-level validation errors → 400, not 500
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
  }

  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
  }

  // Mongoose invalid ObjectId cast → 400
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format for field: ${err.path}`;
  }

  // Hide internal details from clients in production
  if (statusCode === 500) {
    console.error(`[ERROR] ${req.method} ${req.path} —`, err);
    if (process.env.NODE_ENV === 'production') {
      message = 'Internal server error';
    }
  }

  sendError(res, message, statusCode);
};

module.exports = errorHandler;
