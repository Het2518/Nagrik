'use strict';

const jwt = require('jsonwebtoken');
const { createApiError } = require('../utils/apiResponse');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(createApiError(401, 'No token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    req.clientIp = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip || '127.0.0.1').trim();
    req.clientAgent = req.headers['user-agent'] || 'Nagrik-Client/2.0';
    next();
  } catch (err) {
    // Distinguish expired from tampered — helps client decide whether to refresh or re-login
    if (err.name === 'TokenExpiredError') {
      return next(createApiError(401, 'Token expired — please log in again'));
    }
    next(createApiError(401, 'Invalid token'));
  }
};

module.exports = { authenticate };
