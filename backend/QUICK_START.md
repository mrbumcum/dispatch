# Quick Start Guide - RadioSimulation Backend Integration

## Prerequisites
- Node.js installed (v18+ recommended)
- Supabase account with project created
- Google AI Studio API key (Gemini)
- ElevenLabs API key

## 🚀 Quick Setup (5 minutes)

### Step 1: Database Setup (1 min)
```sql
-- In Supabase SQL Editor, run:
-- Copy contents from: backend/database-schema.sql
```

### Step 2: Storage Setup (30 sec)
1. Supabase Dashboard → Storage → New Bucket
2. Name: `radio-audio`
3. Public: ✅ Yes
4. Click Create

### Step 3: Backend Environment (1 min)
```bash
cd backend
copy .env.example .env
# Edit .env with your keys:
# - SUPABASE_URL (Supabase Dashboard → Settings → API → Project URL)
# - SUPABASE_SERVICE_KEY (Supabase Dashboard → Settings → API → service_role key)
# - GEMINI_API_KEY (Google AI Studio)
# - ELEVENLABS_API_KEY (ElevenLabs Dashboard)
```

### Step 4: Install & Start Backend (2 min)
```bash
cd backend
npm install
npm run dev
```
✅ Should see: "Server running on port 3001"

### Step 5: Start Frontend (1 min)
```bash
cd frontend
npm run dev
```
✅ Should see: "Local: http://localhost:5173"

## ✅ Test It!

1. **Open app**: http://localhost:5173
2. **Sign in** with your Supabase account
3. **Go to Radio Simulation** page
4. **Click "Start Training"** - should generate a call from backend
5. **Click "Play Call"** - should hear dispatcher audio
6. **Click "Respond"** - speak your response
7. **Get feedback** - should receive AI assessment

## 🔍 Troubleshooting

### Backend won't start
- ❌ Missing dependencies: Run `npm install`
- ❌ Port 3001 in use: Change PORT in `.env`
- ❌ Missing env vars: Check `.env` file exists and has all keys

### Frontend can't connect
- ❌ Backend not running: Start with `npm run dev` in backend folder
- ❌ Wrong URL: Check `frontend/src/config.ts` has `BACKEND_URL = 'http://localhost:3001'`
- ❌ CORS error: Check backend `.env` has `FRONTEND_URL=http://localhost:5173`

### No audio playing
- ❌ Storage bucket missing: Create `radio-audio` bucket in Supabase
- ❌ Bucket not public: Make bucket public in Supabase Storage settings
- ❌ Invalid ElevenLabs key: Check API key in `.env`

### Call generation fails
- ❌ No seed data: Run `backend/database-schema.sql` again
- ❌ RLS policies blocking: Check you're signed in to the app
- ❌ JWT invalid: Sign out and sign in again

### Assessment not working
- ❌ Invalid Gemini key: Check API key in backend `.env`
- ❌ Call ID missing: Make sure call was generated from backend first

## 📊 Verify It's Working

### Check Backend Logs
```bash
# You should see:
✅ Server running on port 3001
✅ Supabase connected

# When you use the app:
✅ POST /api/radio/session/create 200
✅ POST /api/radio/generate-call 200
✅ POST /api/radio/get-audio 200
✅ POST /api/radio/assess-response 200
```

### Check Database
```sql
-- Should have data after using app:
SELECT COUNT(*) FROM radio_sessions;  -- At least 1
SELECT COUNT(*) FROM radio_calls;     -- At least 1
SELECT COUNT(*) FROM radio_results;   -- At least 1 (after assessment)
SELECT COUNT(*) FROM audio_cache;     -- At least 1 (after playing audio)
```

### Check Browser Console
```javascript
// Should NOT see:
❌ CORS errors
❌ 401 Unauthorized
❌ Failed to fetch
❌ API key not found

// Should see:
✅ Session created: {id: "..."}
✅ Call generated: {unitNumber: "Unit 1", ...}
✅ Audio cached: {audioUrl: "https://..."}
✅ Assessment received: {score: 85, feedback: "..."}
```

## 🎉 Success Indicators

- ✅ Backend server starts without errors
- ✅ Health check responds: `curl http://localhost:3001/health`
- ✅ Session auto-creates when you open Radio Simulation
- ✅ "Start Training" generates a call from backend
- ✅ "Play Call" plays audio twice (as designed)
- ✅ "Respond" records your voice
- ✅ Assessment gives feedback and score
- ✅ "Recent Calls" section shows your completed calls
- ✅ Calls persist in database (check Supabase)
- ✅ Audio caching works (same text = instant playback on 2nd call)

## 📝 What Changed

### Before (Frontend-Only)
- API keys exposed in frontend
- Direct Gemini API calls from browser
- Direct ElevenLabs API calls from browser
- Hardcoded locations and complaints
- No session tracking
- No data persistence

### After (Backend Integration)
- All API keys secure in backend
- Backend handles all external API calls
- Database stores locations, complaints, sessions, results
- Session lifecycle tracked automatically
- User progress persists
- Audio caching reduces API costs
- Proper authentication with JWT

## 🔗 Next Steps

1. ✅ Test all features thoroughly
2. ✅ Verify database is populating correctly
3. ✅ Check audio caching is working (less ElevenLabs calls)
4. ✅ Ensure session completion works on page exit
5. 📖 Review `INTEGRATION_STATUS.md` for detailed info
6. 🚀 Deploy when ready (see production deployment section)

## 📚 Documentation

- **Backend API**: See `backend/README.md`
- **Database Schema**: See `backend/database-schema.sql`
- **Integration Status**: See `INTEGRATION_STATUS.md`
- **Backend Plan**: See `backend/BACKEND_PLAN.md`

## 🆘 Need Help?

Check these files:
1. `INTEGRATION_STATUS.md` - Detailed setup and testing
2. `backend/README.md` - Backend API documentation
3. Backend logs in terminal - Shows all requests and errors
4. Browser console - Shows frontend errors and network requests
5. Supabase logs - Shows database queries and errors
