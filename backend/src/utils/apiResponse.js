'use strict';

// Standard API envelope: { success, data } or { success, error }
const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({ success: true, data });
};

const sendError = (res, message, statusCode = 500) => {
  res.status(statusCode).json({ success: false, error: message });
};

// Creates a structured error object for use in middleware and controllers
const createApiError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { sendSuccess, sendError, createApiError };
