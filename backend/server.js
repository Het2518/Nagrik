'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/authRoutes');
const familyRoutes = require('./src/routes/familyRoutes');
const eligibilityRoutes = require('./src/routes/eligibilityRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const schemeRoutes = require('./src/routes/schemeRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const auditLogRoutes = require('./src/routes/auditLogRoutes');
const integrationRoutes = require('./src/routes/integrationRoutes');
const uploadRoutes      = require('./src/routes/uploadRoutes');
const v2Routes          = require('./src/routes/v2Routes');
const cronService       = require('./src/services/cronService');

const app = express();

// Trust reverse proxy on Render / Cloud platforms for accurate rate limiting and IP detection
app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or local development
    if (!origin) return callback(null, true);
    if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS === '*') {
      return callback(null, true);
    }
    const origins = process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const lowerOrigin = origin.toLowerCase();
    if (origins.includes(lowerOrigin) || origins.some((o) => lowerOrigin.endsWith(o.replace(/^\*/, '')))) {
      return callback(null, true);
    }
    // Always permit Vercel deployment URLs by default
    if (lowerOrigin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Brute-force protection on login/register endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 60 : 200, // accommodate multi-tab officer usage
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests — please try again in 15 minutes' },
});

// Global API rate limiter (protects against general DoS)
const globalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 2000,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' }
});

// Apply global rate limiter to all API routes
app.use('/api', globalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRateLimiter, authRoutes);
app.use('/api/v1/families', familyRoutes);
app.use('/api/v1/eligibility', eligibilityRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/schemes', schemeRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/auditlogs',    auditLogRoutes);
app.use('/api/v1/integrations', integrationRoutes);
app.use('/api/v1/uploads',      uploadRoutes);
app.use('/api/v1',              v2Routes);

// Root & Health check endpoints for Render and uptime monitors
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Nagrik API', version: '2.0.0' }));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Nagrik API' }));
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Nagrik API running on port ${PORT}`);
    cronService.initScheduledJobs();
  });
});
