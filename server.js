const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const healthRoutes = require('./routes/healthRoutes');
const projectRoutes = require('./routes/projectRoutes');
const parcelRoutes = require('./routes/parcelRoutes');
const issueRoutes = require('./routes/issueRoutes');
const auditRoutes = require('./routes/auditRoutes');
const documentRoutes = require('./routes/documentRoutes');
const landownerRoutes = require('./routes/landownerRoutes');
const officerRoutes = require('./routes/officerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables from .env
dotenv.config();

// Connect to MongoDB Atlas
connectDB();

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration - dynamic origin support for local dev & Vercel deployment
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body and cookie parsers with payload size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Static folder for uploaded legal deeds & identity proofs
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes - Mounted on both '/api' and root for full proxy/direct compatibility
const registerRoutes = (prefix = '') => {
  app.use(`${prefix}/health`, healthRoutes);
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/projects`, projectRoutes);
  app.use(`${prefix}/parcels`, parcelRoutes);
  app.use(`${prefix}/issues`, issueRoutes);
  app.use(`${prefix}/audit-logs`, auditRoutes);
  app.use(`${prefix}/documents`, documentRoutes);
  app.use(`${prefix}/landowner`, landownerRoutes);
  app.use(`${prefix}/officer`, officerRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
};

// Register routes under /api and root
registerRoutes('/api');
registerRoutes('');

// Fallback 404 handler for undefined endpoints
app.use(notFound);

// Global centralized error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `BHOOMI-SETU Backend Server running in ${
      process.env.NODE_ENV || 'development'
    } mode on port ${PORT}`
  );
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Keep server running in dev or exit safely
});

module.exports = app;
