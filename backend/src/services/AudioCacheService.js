const { hashText } = require('../utils/hash');
const logger = require('../utils/logger');

/**
 * AudioCacheService
 * Manages TTS audio caching to reduce API costs
 */
class AudioCacheService {
  constructor(supabaseClient, elevenLabsService) {
    this.supabase = supabaseClient;
    this.elevenLabsService = elevenLabsService;
  }

  /**
   * Get cached audio or generate new TTS
   * @param {string} text - Dispatch text
   * @param {string} voiceId - Voice ID
   * @returns {Promise<Object>} { audioUrl, cached }
   */
  async getOrGenerateAudio(text, voiceId) {
    try {
      const textHash = hashText(text + voiceId);

      // Check cache
      const { data: cached, error: cacheError } = await this.supabase
        .from('audio_cache')
        .select('audio_url, id, access_count')
        .eq('text_hash', textHash)
        .single();

      if (!cacheError && cached) {
        // Cache hit - update access stats
        await this.supabase
          .from('audio_cache')
          .update({
            access_count: cached.access_count + 1,
            last_accessed_at: new Date().toISOString()
          })
          .eq('id', cached.id);

        logger.info(`Audio cache HIT for hash ${textHash}`);
        return { audioUrl: cached.audio_url, cached: true };
      }

      // Cache miss - generate new TTS
      logger.info(`Audio cache MISS for hash ${textHash} - generating TTS`);
      
      const audioBuffer = await this.elevenLabsService.textToSpeech(text, voiceId);
      const audioUrl = await this.elevenLabsService.uploadToStorage(
        audioBuffer,
        textHash,
        this.supabase
      );

      // Store in cache
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 day TTL

      await this.supabase
        .from('audio_cache')
        .insert({
          text_hash: textHash,
          audio_url: audioUrl,
          voice_id: voiceId,
          expires_at: expiresAt.toISOString(),
          access_count: 1
        });

      logger.info(`Cached new audio: ${audioUrl}`);

      return { audioUrl, cached: false };
    } catch (error) {
      logger.error('Audio cache operation failed:', error);
      throw error;
    }
  }

  /**
   * Clean up expired cache entries
   * @returns {Promise<number>} Number of entries deleted
   */
  async cleanExpiredCache() {
    try {
      const { data, error } = await this.supabase
        .from('audio_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) throw error;

      const count = data ? data.length : 0;
      logger.info(`Cleaned up ${count} expired cache entries`);

      return count;
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = AudioCacheService;
