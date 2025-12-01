require('dotenv').config();

const env = {
  // Server
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

  // APIs
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,

  // Voice Configuration
  DISPATCHER_VOICE_ID: process.env.DISPATCHER_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // CORS
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
};

// Validate required environment variables
const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'GEMINI_API_KEY',
  'ELEVENLABS_API_KEY'
];

const missing = required.filter(key => !env[key]);
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  console.error('Please create a .env file based on .env.example');
  process.exit(1);
}

module.exports = env;
