const logger = require('../utils/logger');

/**
 * ElevenLabsService
 * Handles text-to-speech generation using ElevenLabs API
 */
class ElevenLabsService {
  constructor(apiKey, voiceId) {
    this.apiKey = apiKey;
    this.voiceId = voiceId;
    this.apiUrl = 'https://api.elevenlabs.io/v1/text-to-speech';
  }

  /**
   * Convert text to speech
   * @param {string} text - Text to convert
   * @param {string} voiceId - Optional voice ID override
   * @returns {Promise<Buffer>} Audio buffer
   */
  async textToSpeech(text, voiceId = null) {
    try {
      const voice = voiceId || this.voiceId;
      
      const response = await fetch(`${this.apiUrl}/${voice}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs TTS failed: ${response.status} ${errorText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      logger.debug(`Generated TTS audio: ${audioBuffer.length} bytes`);

      return audioBuffer;
    } catch (error) {
      logger.error('TTS generation failed:', error);
      throw error;
    }
  }

  /**
   * Upload audio buffer to Supabase Storage
   * @param {Buffer} audioBuffer - Audio data
   * @param {string} fileName - File name for storage
   * @param {Object} supabaseClient - Supabase client instance
   * @returns {Promise<string>} Public URL of uploaded audio
   */
  async uploadToStorage(audioBuffer, fileName, supabaseClient) {
    try {
      const filePath = `tts-cache/${fileName}.mp3`;
      
      // Debug logging
      logger.debug(`Attempting to upload to bucket: radio-audio`);
      logger.debug(`File path: ${filePath}`);
      logger.debug(`Buffer size: ${audioBuffer.length} bytes`);

      const { data, error } = await supabaseClient
        .storage
        .from('radio-audio')
        .upload(filePath, audioBuffer, {
          contentType: 'audio/mpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('radio-audio')
        .getPublicUrl(filePath);

      logger.info(`Uploaded audio to storage: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      logger.error('Failed to upload audio to storage:', error);
      throw error;
    }
  }
}

module.exports = ElevenLabsService;
