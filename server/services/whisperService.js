const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function transcribeAudio(audioBuffer) {
  let tempFilePath = null;
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty');
    }

    console.log(`[Whisper] Transcribing audio: ${audioBuffer.length} bytes`);
    
    // Create a temporary file for the audio buffer
    tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, audioBuffer);
    console.log(`[Whisper] Temporary file created: ${tempFilePath}`);
    
    // OpenAI SDK v4 in Node.js accepts ReadableStream
    const fileStream = fs.createReadStream(tempFilePath);
    
    console.log('[Whisper] Calling OpenAI API...');
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: 'en',
    });

    console.log(`[Whisper] Transcription successful: "${transcription.text}"`);
    return transcription.text;
  } catch (error) {
    console.error('[Whisper] Transcription error:', error);
    console.error('[Whisper] Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });
    
    if (error.status === 401) {
      throw new Error('OpenAI API key is invalid. Please check your OPENAI_API_KEY.');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.message.includes('API key')) {
      throw new Error('OpenAI API key is missing or invalid.');
    }
    
    throw new Error(`Transcription failed: ${error.message}`);
  } finally {
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`[Whisper] Temporary file deleted: ${tempFilePath}`);
      } catch (unlinkError) {
        console.warn('[Whisper] Failed to delete temp file:', unlinkError);
      }
    }
  }
}

module.exports = { transcribeAudio };

