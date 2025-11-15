const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
require('dotenv').config();

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Default voice ID (you can make this configurable)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

async function generateVoice(text) {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text is empty, cannot generate voice');
    }

    console.log(`[ElevenLabs] Generating voice for text: "${text.substring(0, 50)}..."`);
    console.log(`[ElevenLabs] Using voice ID: ${DEFAULT_VOICE_ID}`);
    
    const audioStream = await client.textToSpeech.convert(DEFAULT_VOICE_ID, {
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    });

    console.log('[ElevenLabs] Voice generation successful');
    return audioStream;
  } catch (error) {
    console.error('[ElevenLabs] Voice generation error:', error);
    console.error('[ElevenLabs] Error details:', {
      message: error.message,
      status: error.status,
      code: error.code
    });
    
    if (error.status === 401) {
      throw new Error('ElevenLabs API key is invalid. Please check your ELEVENLABS_API_KEY.');
    } else if (error.status === 429) {
      throw new Error('ElevenLabs API rate limit exceeded. Please try again later.');
    } else if (error.message.includes('API key') || error.message.includes('ELEVENLABS_API_KEY')) {
      throw new Error('ElevenLabs API key is missing or invalid.');
    }
    
    throw new Error(`Voice generation failed: ${error.message}`);
  }
}

module.exports = { generateVoice };

