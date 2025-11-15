const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB, closeDB } = require('./database/connection');
const voiceRoutes = require('./routes/voiceRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/voice', voiceRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Express server is running!' });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Try to connect to MongoDB, but don't fail if it's not available
    try {
      await connectDB();
      console.log('✓ MongoDB connected');
    } catch (dbError) {
      console.warn('⚠ MongoDB connection failed. Server will start but database features will be unavailable.');
      console.warn('  To fix: Start MongoDB with "mongod" or "brew services start mongodb-community"');
      console.warn('  Error:', dbError.message);
    }
    
    app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await closeDB();
  process.exit(0);
});

startServer();

