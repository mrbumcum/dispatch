-- FieldReady Database Schema
-- Minimal schema for Radio Simulation implementation
-- Variables randomized in backend: age (18-78), gender (Male/Female), unit number (1-20)
-- Variables stored in database: addresses, complaints, sessions, assessments

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE CONTENT TABLES (User-customizable training data)
-- ============================================================================

-- Locations table (stores both station and incident addresses)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  address TEXT NOT NULL,
  destination TEXT CHECK (destination IN ('station', 'incident')),
  is_active BOOLEAN DEFAULT true
);

-- Complaints table (chief complaints for scenarios)
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- SESSION & ASSESSMENT TABLES (Track training progress)
-- ============================================================================

-- Radio sessions (training blocks)
CREATE TABLE radio_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_calls INT DEFAULT 0,
  average_score NUMERIC(5,2),
  status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active'
);

-- Radio calls (individual dispatch scenarios)
CREATE TABLE radio_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES radio_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Scenario details (some from DB, some randomized)
  unit_number TEXT NOT NULL,              -- Randomized: "Unit 1" to "Unit 20"
  starting_address TEXT NOT NULL,         -- From locations WHERE type='station'
  incident_address TEXT NOT NULL,         -- From locations WHERE type='incident'
  age INT NOT NULL,                       -- Randomized: 18-78
  gender TEXT CHECK (gender IN ('Male', 'Female')), -- Randomized
  complaint TEXT NOT NULL,                -- From complaints table
  
  -- Generated content
  dispatch_text TEXT NOT NULL,            -- Full dispatcher call text
  
  -- User response
  user_response TEXT
);

-- Radio assessments (AI evaluation of user responses)
CREATE TABLE radio_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES radio_calls(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Assessment results
  score INT CHECK (score >= 0 AND score <= 100),
  feedback TEXT NOT NULL

);

-- ============================================================================
-- CACHING & OPTIMIZATION TABLES
-- ============================================================================

-- Audio cache (stores TTS results to reduce API calls)
CREATE TABLE audio_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  text_hash TEXT NOT NULL UNIQUE,         -- SHA-256 of dispatch text
  audio_url TEXT NOT NULL,                -- Supabase Storage URL or blob URL
  voice_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  access_count INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER PROGRESS TRACKING (Denormalized for fast queries)
-- ============================================================================

CREATE TABLE user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Radio simulation stats
  total_radio_sessions INT DEFAULT 0,
  total_radio_calls INT DEFAULT 0,
  radio_average_score NUMERIC(5,2),
  
  -- Streak tracking
  current_streak_days INT DEFAULT 0,
  longest_streak_days INT DEFAULT 0,
  last_activity_date DATE,
  
  -- Achievements (optional JSONB array)
  achievements JSONB DEFAULT '[]'::JSONB
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Locations indexes
CREATE INDEX idx_locations_destination ON locations(destination) WHERE is_active = true;

-- Complaints indexes
CREATE INDEX idx_complaints_active ON complaints(is_active) WHERE is_active = true;

-- Session indexes
CREATE INDEX idx_radio_sessions_user ON radio_sessions(user_id, started_at DESC);
CREATE INDEX idx_radio_sessions_status ON radio_sessions(status);

-- Call indexes
CREATE INDEX idx_radio_calls_session ON radio_calls(session_id, created_at DESC);

-- Assessment indexes
CREATE INDEX idx_radio_results_call ON radio_results(call_id);

-- Audio cache indexes
CREATE INDEX idx_audio_cache_hash ON audio_cache(text_hash);
CREATE INDEX idx_audio_cache_expires ON audio_cache(expires_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all user-specific tables
ALTER TABLE radio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Radio sessions policies
CREATE POLICY "Users can view own sessions"
  ON radio_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON radio_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON radio_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Radio calls policies
CREATE POLICY "Users can view own calls"
  ON radio_calls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM radio_sessions
      WHERE radio_sessions.id = radio_calls.session_id
      AND radio_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create calls in own sessions"
  ON radio_calls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM radio_sessions
      WHERE radio_sessions.id = radio_calls.session_id
      AND radio_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own calls"
  ON radio_calls FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM radio_sessions
      WHERE radio_sessions.id = radio_calls.session_id
      AND radio_sessions.user_id = auth.uid()
    )
  );

-- Radio assessments policies
CREATE POLICY "Users can view own assessments"
  ON radio_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM radio_calls
      JOIN radio_sessions ON radio_sessions.id = radio_calls.session_id
      WHERE radio_calls.id = radio_results.call_id
      AND radio_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create assessments for own calls"
  ON radio_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM radio_calls
      JOIN radio_sessions ON radio_sessions.id = radio_calls.session_id
      WHERE radio_calls.id = radio_results.call_id
      AND radio_sessions.user_id = auth.uid()
    )
  );

-- User progress policies
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Locations policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view active locations"
  ON locations FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Complaints policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view active complaints"
  ON complaints FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Audio cache is shared (no RLS, managed by backend)

-- ============================================================================
-- SEED DATA (Default content when database is empty)
-- ============================================================================

-- Default station addresses
INSERT INTO locations (address, destination, is_active) VALUES
  ('Station 1', 'station', true),
  ('Station 2', 'station', true),
  ('Station 3', 'station', true),
  ('Highway 101', 'station', true),
  ('Downtown Station', 'station', true);

-- Default incident addresses
INSERT INTO locations (address, destination, is_active) VALUES
  ('123 Main Street', 'incident', true),
  ('456 Oak Avenue', 'incident', true),
  ('789 Elm Drive', 'incident', true),
  ('321 Pine Road', 'incident', true),
  ('654 Maple Lane', 'incident', true),
  ('987 Cedar Boulevard', 'incident', true);

-- Default complaints
INSERT INTO complaints (name, is_active) VALUES
  ('chest pain', true),
  ('difficulty breathing', true),
  ('severe headache', true),
  ('abdominal pain', true),
  ('altered mental status', true),
  ('minor laceration', true),
  ('unconscious patient', true),
  ('fall from height', true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS (Auto-update user_progress)
-- ============================================================================

-- Function to update user_progress when a session is completed
CREATE OR REPLACE FUNCTION update_user_progress_on_session_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO user_progress (user_id, total_radio_sessions, total_radio_calls, radio_average_score, last_activity_date)
    VALUES (
      NEW.user_id,
      1,
      NEW.total_calls,
      NEW.average_score,
      CURRENT_DATE
    )
    ON CONFLICT (user_id) DO UPDATE SET
      total_radio_sessions = user_progress.total_radio_sessions + 1,
      total_radio_calls = user_progress.total_radio_calls + NEW.total_calls,
      radio_average_score = (
        (user_progress.radio_average_score * user_progress.total_radio_sessions + NEW.average_score) /
        (user_progress.total_radio_sessions + 1)
      ),
      last_activity_date = CURRENT_DATE,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user_progress
CREATE TRIGGER trigger_update_user_progress
AFTER UPDATE ON radio_sessions
FOR EACH ROW
EXECUTE FUNCTION update_user_progress_on_session_complete();

-- ============================================================================
-- NOTES
-- ============================================================================

-- RANDOMIZED IN BACKEND (not stored):
-- - Unit number: Random integer 1-20 → "Unit X"
-- - Age: Random integer 18-78
-- - Gender: Random from ['Male', 'Female']

-- STORED IN DATABASE:
-- - Starting address (from locations WHERE destination='station')
-- - Incident address (from locations WHERE destination='incident')
-- - Complaint (from complaints table)
-- - User responses, scores, feedback
-- - Session tracking, progress analytics

-- BACKEND LOGIC:
-- 1. Generate call: Query DB for addresses/complaints, randomize age/gender/unit
-- 2. Generate dispatch text: Build from scenario details
-- 3. TTS: Check audio_cache first, generate if miss, store result
-- 4. Assessment: Send to Gemini, parse response, store in radio_results
-- 5. Update session stats when call completes
