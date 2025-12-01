# Backend Implementation Plan

## Overview
Node.js/Express backend for FieldReady Radio Simulation that handles:
- Scenario generation (randomization + DB queries)
- Text-to-Speech via ElevenLabs
- AI assessment via Gemini
- Session/progress tracking
- Audio caching

## Tech Stack
- **Runtime**: Node.js with Express
- **Database**: Supabase (PostgreSQL with RLS)
- **AI**: Google Gemini 2.5-flash
- **TTS**: ElevenLabs API
- **Auth**: Supabase JWT validation

## Project Structure
```
backend/
├── src/
│   ├── index.js                  # Express app entry point
│   ├── config/
│   │   ├── env.js               # Environment variable loader
│   │   ├── supabase.js          # Supabase client config
│   │   └── prompts.js           # Assessment prompt templates
│   ├── services/
│   │   ├── ScenarioService.js   # Generate random calls from DB
│   │   ├── GeminiService.js     # AI assessment
│   │   ├── ElevenLabsService.js # Text-to-Speech
│   │   ├── AudioCacheService.js # TTS caching logic
│   │   └── SessionService.js    # Session/progress tracking
│   ├── routes/
│   │   ├── radio.routes.js      # /api/radio/* endpoints
│   │   └── health.routes.js     # /health endpoint
│   ├── middleware/
│   │   ├── auth.js              # JWT validation
│   │   ├── errorHandler.js      # Global error handler
│   │   └── rateLimiter.js       # Rate limiting
│   └── utils/
│       ├── hash.js              # Text hashing for cache
│       └── logger.js            # Logging utility
├── .env.example                 # Environment template
└── package.json
```

## API Endpoints

### Radio Simulation Endpoints

#### POST /api/radio/generate-call
Generate a new dispatch scenario
```json
Request: {
  "sessionId": "uuid",
  "userId": "uuid"
}
Response: {
  "call": {
    "id": "uuid",
    "unitNumber": "Unit 5",
    "startingAddress": "Station 1",
    "incidentAddress": "123 Main Street",
    "age": 45,
    "gender": "Male",
    "complaint": "chest pain",
    "dispatchText": "Unit 5, respond to 123 Main Street for a 45 year old Male patient for a report of chest pain"
  }
}
```

#### POST /api/radio/get-audio
Get TTS audio for dispatch call (with caching)
```json
Request: {
  "callId": "uuid",
  "text": "Unit 5, respond to..."
}
Response: {
  "audioUrl": "https://...",
  "cached": true
}
```

#### POST /api/radio/assess-response
Assess user's radio response
```json
Request: {
  "callId": "uuid",
  "userResponse": "Unit 5 responding emergently...",
  "callDetails": {
    "unitNumber": "Unit 5",
    "startingAddress": "Station 1",
    "incidentAddress": "123 Main Street",
    "age": 45,
    "gender": "Male",
    "complaint": "chest pain"
  }
}
Response: {
  "resultId": "uuid",
  "score": 85,
  "feedback": "Good protocol, but remember to state response priority"
}
```

#### POST /api/radio/session/create
Start a new training session
```json
Request: {
  "userId": "uuid"
}
Response: {
  "sessionId": "uuid",
  "startedAt": "2025-12-01T10:00:00Z"
}
```

#### POST /api/radio/session/complete
End a training session
```json
Request: {
  "sessionId": "uuid",
  "totalCalls": 5,
  "averageScore": 82.5
}
Response: {
  "sessionId": "uuid",
  "status": "completed",
  "userProgress": {
    "totalSessions": 10,
    "averageScore": 80.2
  }
}
```

#### GET /api/radio/session/:sessionId
Get session details with all calls and assessments
```json
Response: {
  "session": {
    "id": "uuid",
    "startedAt": "...",
    "endedAt": "...",
    "totalCalls": 5,
    "averageScore": 82.5,
    "calls": [...]
  }
}
```

## Service Modules

### ScenarioService
```javascript
class ScenarioService {
  constructor(supabaseClient)
  
  async generateCall(userId)
  // 1. Query random station from locations WHERE type='station'
  // 2. Query random incident from locations WHERE type='incident'
  // 3. Query random complaint from complaints
  // 4. Randomize: unitNumber (1-20), age (18-78), gender (Male/Female)
  // 5. Build dispatch text
  // 6. Insert into radio_calls table
  // 7. Return call object
}
```

### GeminiService
```javascript
class GeminiService {
  constructor(apiKey)
  
  async assessResponse(callDetails, userResponse, currentLocation)
  // 1. Build prompt with template from config/prompts.js
  // 2. Call Gemini API
  // 3. Parse JSON response { feedback, score }
  // 4. Return assessment
}
```

### ElevenLabsService
```javascript
class ElevenLabsService {
  constructor(apiKey)
  
  async textToSpeech(text, voiceId = 'dispatcher')
  // 1. Call ElevenLabs API
  // 2. Return audio buffer/URL
  
  async uploadToStorage(audioBuffer, textHash)
  // 1. Upload to Supabase Storage
  // 2. Return public URL
}
```

### AudioCacheService
```javascript
class AudioCacheService {
  constructor(supabaseClient, elevenLabsService)
  
  async getOrGenerateAudio(dispatchText, voiceId)
  // 1. Hash the text
  // 2. Check audio_cache table
  // 3. If hit: return cached URL, update access_count
  // 4. If miss: generate TTS, upload to storage, insert to cache
  // 5. Return audio URL
}
```

### SessionService
```javascript
class SessionService {
  constructor(supabaseClient)
  
  async createSession(userId)
  async completeSession(sessionId, totalCalls, averageScore)
  async getSession(sessionId)
  async updateSessionStats(sessionId, newScore)
  // Auto-calculates running average for average_score
}
```

## Environment Variables (.env.example)
```bash
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# APIs
GEMINI_API_KEY=your-gemini-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# Voice IDs
DISPATCHER_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## Middleware

### auth.js
```javascript
// Validates Supabase JWT from Authorization header
// Extracts userId from token
// Attaches to req.user
```

### errorHandler.js
```javascript
// Catches all errors
// Returns consistent JSON error format
// Logs to console (or external service)
```

### rateLimiter.js
```javascript
// Express rate limiter
// 100 requests per minute per IP
// 429 status on exceed
```

## Implementation Steps

1. **Setup base Express server** (src/index.js)
   - CORS, JSON parsing, error handling
   - Health check endpoint

2. **Configure Supabase client** (config/supabase.js)
   - Use service role key for admin operations
   - Configure for server-side use

3. **Create ScenarioService** (services/ScenarioService.js)
   - Random call generation
   - DB queries for locations/complaints

4. **Create AudioCacheService** (services/AudioCacheService.js)
   - Implement caching logic
   - Integration with ElevenLabs

5. **Create GeminiService** (services/GeminiService.js)
   - Assessment prompt template
   - JSON parsing from Gemini

6. **Create SessionService** (services/SessionService.js)
   - CRUD for sessions
   - Progress tracking updates

7. **Build radio.routes.js**
   - Wire up all endpoints
   - Add auth middleware

8. **Add rate limiting & security**
   - Rate limiter middleware
   - Input validation
   - Error handling

9. **Testing**
   - Test each endpoint with Postman/curl
   - Verify RLS policies work correctly
   - Test audio caching

10. **Frontend integration**
    - Update RadioSimulation.tsx to call backend
    - Remove direct API calls to Gemini/ElevenLabs
    - Handle loading/error states

## Security Considerations

- ✅ API keys server-side only (never exposed to frontend)
- ✅ JWT validation on all protected endpoints
- ✅ RLS policies enforce user data isolation
- ✅ Rate limiting prevents abuse
- ✅ Input validation on all endpoints
- ✅ CORS configured for frontend origin only
- ✅ Service role key used carefully (only for backend operations)

## Caching Strategy

**Audio Cache Flow:**
1. Frontend requests audio for dispatch call
2. Backend hashes dispatch text
3. Check `audio_cache` table for existing audio
4. If exists: return cached URL, increment `access_count`
5. If not: generate TTS, upload to Supabase Storage, insert cache record
6. Return audio URL to frontend

**Benefits:**
- Reduce ElevenLabs API costs
- Faster response times for repeated text
- TTL expiration for cache cleanup

## Error Handling

All endpoints return consistent error format:
```json
{
  "error": {
    "code": "SCENARIO_GENERATION_FAILED",
    "message": "Failed to generate scenario",
    "details": "No active locations found in database"
  }
}
```

## Next Steps

1. Create all service files
2. Implement radio.routes.js
3. Setup Express server with middleware
4. Test endpoints
5. Update frontend to use backend
