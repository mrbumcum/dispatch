# FieldReady Backend

Node.js/Express backend for FieldReady EMT training platform.

## Features

- ✅ Scenario generation with DB content + randomization
- ✅ Text-to-Speech via ElevenLabs with caching
- ✅ AI assessment via Google Gemini
- ✅ Session & progress tracking
- ✅ JWT authentication with Supabase
- ✅ Rate limiting & error handling
- ✅ Audio caching to reduce API costs

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (from project settings)
- `GEMINI_API_KEY` - Google Gemini API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key

### 3. Set Up Database

Run the SQL schema in Supabase SQL Editor:

```bash
# Execute database-schema.sql in Supabase dashboard
```

### 4. Create Supabase Storage Bucket

In Supabase dashboard:
1. Go to Storage
2. Create a new bucket named `audio-cache`
3. Set to **Public** access
4. Enable RLS if needed

### 5. Start Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will run on `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health
```

### Radio Simulation

#### Create Session
```
POST /api/radio/session/create
Headers: Authorization: Bearer <jwt-token>
Response: { session: { id, started_at, ... } }
```

#### Generate Call
```
POST /api/radio/generate-call
Headers: Authorization: Bearer <jwt-token>
Body: { sessionId: "uuid" }
Response: { call: { id, unitNumber, dispatchText, ... } }
```

#### Get Audio
```
POST /api/radio/get-audio
Headers: Authorization: Bearer <jwt-token>
Body: { text: "Unit 5, respond to...", voiceId: "optional" }
Response: { audioUrl: "https://...", cached: true }
```

#### Assess Response
```
POST /api/radio/assess-response
Headers: Authorization: Bearer <jwt-token>
Body: {
  callId: "uuid",
  userResponse: "Unit 5 responding...",
  callDetails: { unitNumber, startingAddress, ... }
}
Response: { resultId: "uuid", score: 85, feedback: "..." }
```

#### Complete Session
```
POST /api/radio/session/complete
Headers: Authorization: Bearer <jwt-token>
Body: { sessionId: "uuid", totalCalls: 5, averageScore: 82.5 }
Response: { session: {...}, userProgress: {...} }
```

## Project Structure

```
backend/
├── src/
│   ├── index.js              # Express app entry
│   ├── config/
│   │   ├── env.js           # Environment config
│   │   ├── supabase.js      # Supabase client
│   │   └── prompts.js       # AI prompt templates
│   ├── services/
│   │   ├── ScenarioService.js
│   │   ├── GeminiService.js
│   │   ├── ElevenLabsService.js
│   │   ├── AudioCacheService.js
│   │   └── SessionService.js
│   ├── routes/
│   │   ├── radio.routes.js
│   │   └── health.routes.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   └── utils/
│       ├── hash.js
│       └── logger.js
├── .env.example
├── package.json
└── README.md
```

## Testing

Test health endpoint:
```bash
curl http://localhost:3001/health
```

Test with authentication (replace with your JWT):
```bash
curl -X POST http://localhost:3001/api/radio/session/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Deployment

### Environment Variables
Set all required env vars in your deployment platform.

### Database
Ensure database schema is deployed to production Supabase.

### Storage
Create `audio-cache` storage bucket in production Supabase.

### CORS
Update `FRONTEND_URL` to your production frontend URL.

## Security

- ✅ API keys stored server-side only
- ✅ JWT validation on all protected routes
- ✅ RLS policies enforce data isolation
- ✅ Rate limiting: 100 req/min per IP
- ✅ Input validation on all endpoints
- ✅ CORS restricted to frontend origin

## Caching Strategy

Audio cache reduces ElevenLabs API costs:
1. Hash dispatch text + voice ID
2. Check `audio_cache` table
3. If cached: return URL, increment access count
4. If not: generate TTS, upload to storage, cache
5. TTL: 30 days

## Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env file
PORT=3002
```

**Authentication errors:**
- Verify Supabase service key is correct
- Check JWT token is valid and not expired
- Ensure RLS policies are set up correctly

**TTS generation fails:**
- Verify ElevenLabs API key
- Check voice ID is valid
- Ensure storage bucket exists and is public

**Database errors:**
- Verify database schema is deployed
- Check RLS policies allow operations
- Ensure service role key has admin access

## Next Steps

1. Test all endpoints with Postman
2. Update frontend to call backend
3. Deploy to production
4. Set up monitoring/logging
5. Add admin endpoints for content management
