const express = require('express');
const router = express.Router();
const { upload, validateAudioUpload, validateSessionId } = require('../validators/audioValidator');
const { transcribeAudio } = require('../services/whisperService');
const { generatePersonality, generateScript } = require('../services/geminiService');
const { generateVoice } = require('../services/elevenlabsService');
const { Conversation, Session } = require('../database/models');

// POST /api/voice/transcribe - Transcribe audio to text
router.post('/transcribe', upload.single('audio'), validateAudioUpload, async (req, res) => {
  try {
    const audioBuffer = req.file.buffer;
    const transcription = await transcribeAudio(audioBuffer);
    
    res.json({ 
      transcription,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio', details: error.message });
  }
});

// POST /api/voice/process - Full pipeline: transcribe → generate response → voice
router.post('/process', upload.single('audio'), validateAudioUpload, validateSessionId, async (req, res) => {
  try {
    console.log('[Backend] /process endpoint called');
    const { sessionId, questionPrompt } = req.body;
    const audioBuffer = req.file.buffer;
    
    console.log(`[Backend] Audio received: ${audioBuffer.length} bytes, sessionId: ${sessionId}`);

    // Step 1: Transcribe audio
    console.log('[Backend] Step 1: Transcribing audio...');
    let userInput;
    try {
      userInput = await transcribeAudio(audioBuffer);
      console.log(`[Backend] Transcription successful: "${userInput}"`);
    } catch (error) {
      console.error('[Backend] Transcription failed:', error);
      return res.status(500).json({ 
        error: 'Transcription failed', 
        details: error.message,
        step: 'transcription'
      });
    }
    
    // Step 2: Get or create session
    console.log('[Backend] Step 2: Getting/creating session...');
    let session;
    try {
      session = await Session.findBySessionId(sessionId);
      if (!session) {
        console.log('[Backend] Creating new session...');
        await Session.create({
          sessionId,
          questionPrompt: questionPrompt || null,
          personality: null,
          messages: [],
        });
        session = await Session.findBySessionId(sessionId);
        console.log('[Backend] Session created');
      } else {
        console.log('[Backend] Existing session found');
      }
    } catch (error) {
      console.error('[Backend] Session error:', error);
      return res.status(500).json({ 
        error: 'Session error', 
        details: error.message,
        step: 'session'
      });
    }

    // Step 3: Generate personality if not exists
    if (!session.personality && questionPrompt) {
      console.log('[Backend] Step 3: Generating personality...');
      try {
        const personality = await generatePersonality(questionPrompt);
        await Session.updateBySessionId(sessionId, { personality });
        session.personality = personality;
        console.log('[Backend] Personality generated');
      } catch (error) {
        console.error('[Backend] Personality generation failed:', error);
        return res.status(500).json({ 
          error: 'Personality generation failed', 
          details: error.message,
          step: 'personality'
        });
      }
    }

    // Step 4: Generate script using personality and user input
    console.log('[Backend] Step 4: Generating script...');
    let script;
    try {
      script = await generateScript({
        personality: session.personality,
        userInput,
        conversationHistory: session.messages || [],
      });
      console.log(`[Backend] Script generated: "${script}"`);
    } catch (error) {
      console.error('[Backend] Script generation failed:', error);
      return res.status(500).json({ 
        error: 'Script generation failed', 
        details: error.message,
        step: 'script_generation'
      });
    }

    // Step 5: Generate voice from script
    console.log('[Backend] Step 5: Generating voice...');
    let audioStream;
    try {
      audioStream = await generateVoice(script);
      console.log('[Backend] Voice generation successful');
    } catch (error) {
      console.error('[Backend] Voice generation failed:', error);
      return res.status(500).json({ 
        error: 'Voice generation failed', 
        details: error.message,
        step: 'voice_generation'
      });
    }

    // Step 6: Save conversation
    console.log('[Backend] Step 6: Saving conversation...');
    try {
      await Conversation.create({
        sessionId,
        userInput,
        script,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[Backend] Failed to save conversation:', error);
      // Don't fail the request if saving fails
    }

    // Step 7: Update session messages
    try {
      const updatedMessages = [...(session.messages || []), { userInput, script }];
      await Session.updateBySessionId(sessionId, { messages: updatedMessages });
    } catch (error) {
      console.error('[Backend] Failed to update session:', error);
      // Don't fail the request if update fails
    }

    // Step 8: Stream audio response
    console.log('[Backend] Step 7: Streaming audio response...');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="response.mp3"');
    
    audioStream.on('error', (error) => {
      console.error('[Backend] Audio stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Audio stream error', details: error.message });
      }
    });
    
    audioStream.pipe(res);
    console.log('[Backend] Audio processing completed successfully');
  } catch (error) {
    console.error('[Backend] Voice processing error:', error);
    console.error('[Backend] Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to process voice request', 
        details: error.message,
        step: 'unknown'
      });
    }
  }
});

// POST /api/voice/stream-response - Stream LLM response as text (for text display)
router.post('/stream-response', upload.single('audio'), validateAudioUpload, validateSessionId, async (req, res) => {
  try {
    console.log('[Backend] /stream-response endpoint called');
    const { sessionId, questionPrompt } = req.body;
    const audioBuffer = req.file.buffer;
    
    console.log(`[Backend] Audio received: ${audioBuffer.length} bytes, sessionId: ${sessionId}`);

    // Step 1: Transcribe audio
    console.log('[Backend] Step 1: Transcribing audio...');
    let userInput;
    try {
      userInput = await transcribeAudio(audioBuffer);
      console.log(`[Backend] Transcription successful: "${userInput}"`);
    } catch (error) {
      console.error('[Backend] Transcription failed:', error);
      return res.status(500).json({ 
        error: 'Transcription failed', 
        details: error.message,
        step: 'transcription'
      });
    }
    
    // Step 2: Get or create session
    console.log('[Backend] Step 2: Getting/creating session...');
    let session;
    try {
      session = await Session.findBySessionId(sessionId);
      if (!session) {
        console.log('[Backend] Creating new session...');
        await Session.create({
          sessionId,
          questionPrompt: questionPrompt || null,
          personality: null,
          messages: [],
        });
        session = await Session.findBySessionId(sessionId);
        console.log('[Backend] Session created');
      }
    } catch (error) {
      console.error('[Backend] Session error:', error);
      return res.status(500).json({ 
        error: 'Session error', 
        details: error.message,
        step: 'session'
      });
    }

    // Step 3: Generate personality if not exists
    if (!session.personality && questionPrompt) {
      console.log('[Backend] Step 3: Generating personality...');
      try {
        const personality = await generatePersonality(questionPrompt);
        await Session.updateBySessionId(sessionId, { personality });
        session.personality = personality;
        console.log('[Backend] Personality generated');
      } catch (error) {
        console.error('[Backend] Personality generation failed:', error);
        return res.status(500).json({ 
          error: 'Personality generation failed', 
          details: error.message,
          step: 'personality'
        });
      }
    }

    // Step 4: Stream script generation
    console.log('[Backend] Step 4: Streaming script generation...');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let result;
    try {
      result = await generateScript({
        personality: session.personality,
        userInput,
        conversationHistory: session.messages || [],
        stream: true,
      });
    } catch (error) {
      console.error('[Backend] Script generation failed:', error);
      res.write(`data: ${JSON.stringify({ error: 'Script generation failed', details: error.message, done: true })}\n\n`);
      res.end();
      return;
    }

    let fullScript = '';
    try {
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullScript += chunkText;
          res.write(`data: ${JSON.stringify({ text: chunkText, done: false })}\n\n`);
        }
      }
      console.log(`[Backend] Script streaming completed: "${fullScript}"`);
    } catch (error) {
      console.error('[Backend] Stream reading error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Stream reading failed', details: error.message, done: true })}\n\n`);
      res.end();
      return;
    }

    // Save conversation
    try {
      await Conversation.create({
        sessionId,
        userInput,
        script: fullScript,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[Backend] Failed to save conversation:', error);
    }

    // Update session
    try {
      const updatedMessages = [...(session.messages || []), { userInput, script: fullScript }];
      await Session.updateBySessionId(sessionId, { messages: updatedMessages });
    } catch (error) {
      console.error('[Backend] Failed to update session:', error);
    }

    res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
    res.end();
    console.log('[Backend] Stream response completed successfully');
  } catch (error) {
    console.error('[Backend] Stream response error:', error);
    console.error('[Backend] Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to stream response', 
        details: error.message,
        step: 'unknown'
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream error', details: error.message, done: true })}\n\n`);
      res.end();
    }
  }
});

// GET /api/voice/session/:sessionId - Get session history
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const conversations = await Conversation.findBySessionId(sessionId);
    res.json({ conversations });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session', details: error.message });
  }
});

module.exports = router;

