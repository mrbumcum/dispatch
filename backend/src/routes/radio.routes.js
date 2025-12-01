const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const env = require('../config/env');
const logger = require('../utils/logger');

// Services
const ScenarioService = require('../services/ScenarioService');
const GeminiService = require('../services/GeminiService');
const ElevenLabsService = require('../services/ElevenLabsService');
const AudioCacheService = require('../services/AudioCacheService');
const SessionService = require('../services/SessionService');

// Initialize services
const scenarioService = new ScenarioService(supabase);
const geminiService = new GeminiService(env.GEMINI_API_KEY);
const elevenLabsService = new ElevenLabsService(env.ELEVENLABS_API_KEY, env.DISPATCHER_VOICE_ID);
const audioCacheService = new AudioCacheService(supabase, elevenLabsService);
const sessionService = new SessionService(supabase);

/**
 * POST /api/radio/session/create
 * Create a new training session
 */
router.post('/session/create', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const session = await sessionService.createSession(userId);
    
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/radio/session/complete
 * Complete a training session
 */
router.post('/session/complete', async (req, res, next) => {
  try {
    const { sessionId, totalCalls, averageScore } = req.body;

    if (!sessionId || typeof totalCalls !== 'number' || typeof averageScore !== 'number') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing or invalid parameters',
          details: 'Required: sessionId (string), totalCalls (number), averageScore (number)'
        }
      });
    }

    const result = await sessionService.completeSession(sessionId, totalCalls, averageScore);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/radio/session/:sessionId
 * Get session details
 */
router.get('/session/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionService.getSession(sessionId);
    
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/radio/session/active
 * Get user's active session (if any)
 */
router.get('/session/active', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const session = await sessionService.getActiveSession(userId);
    
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/radio/generate-call
 * Generate a new dispatch scenario
 */
router.post('/generate-call', async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing sessionId',
          details: 'sessionId is required'
        }
      });
    }

    const call = await scenarioService.generateCall(sessionId);
    
    res.json({ call });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/radio/get-audio
 * Get TTS audio for dispatch call (with caching)
 */
router.post('/get-audio', async (req, res, next) => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing text parameter',
          details: 'text is required'
        }
      });
    }

    const voice = voiceId || env.DISPATCHER_VOICE_ID;
    const result = await audioCacheService.getOrGenerateAudio(text, voice);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/radio/assess-response
 * Assess user's radio response
 */
router.post('/assess-response', async (req, res, next) => {
  try {
    const { callId, userResponse, callDetails } = req.body;

    if (!callId || !userResponse || !callDetails) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required parameters',
          details: 'Required: callId, userResponse, callDetails'
        }
      });
    }

    // Validate callDetails structure
    const required = ['unitNumber', 'startingAddress', 'incidentAddress', 'age', 'gender', 'complaint'];
    const missing = required.filter(key => !callDetails[key]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid callDetails structure',
          details: `Missing fields: ${missing.join(', ')}`
        }
      });
    }

    // Get AI assessment
    const assessment = await geminiService.assessResponse(callDetails, userResponse);

    // Update call with user response
    await scenarioService.updateCallResponse(callId, userResponse);

    // Store assessment in database
    const { data: result, error: insertError } = await supabase
      .from('radio_results')
      .insert({
        call_id: callId,
        score: assessment.score,
        feedback: assessment.feedback
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update session stats
    const { data: call, error: callError } = await supabase
      .from('radio_calls')
      .select('session_id')
      .eq('id', callId)
      .single();

    if (!callError && call) {
      await sessionService.updateSessionStats(call.session_id, assessment.score);
    }

    res.json({
      resultId: result.id,
      score: assessment.score,
      feedback: assessment.feedback
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/radio/cache/cleanup
 * Clean up expired cache entries (admin/cron job)
 */
router.post('/cache/cleanup', async (req, res, next) => {
  try {
    const count = await audioCacheService.cleanExpiredCache();
    
    res.json({
      message: 'Cache cleanup completed',
      deletedCount: count
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
