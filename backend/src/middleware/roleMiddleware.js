'use strict';

const { createApiError } = require('../utils/apiResponse');

// Restricts a route to users whose role is in the allowedRoles list
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(createApiError(403, 'Access denied: insufficient role'));
    }
    next();
  };
};

module.exports = { requireRole };
