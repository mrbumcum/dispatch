const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const logger = require('./utils/logger');

// Middleware
const authenticate = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Routes
const healthRoutes = require('./routes/health.routes');
const radioRoutes = require('./routes/radio.routes');

// Initialize Express app
const app = express();

// Middleware setup
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(rateLimiter);

// Routes
app.use('/health', healthRoutes);
app.use('/api/radio', authenticate, radioRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = env.PORT;
app.listen(PORT, () => {
  logger.info(`🚀 FieldReady Backend Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🌐 CORS enabled for: ${env.FRONTEND_URL}`);
  logger.info(`✅ Server ready to accept requests`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
