const { buildAssessmentPrompt } = require('../config/prompts');
const logger = require('../utils/logger');

/**
 * GeminiService
 * Handles AI assessment of user responses using Google Gemini API
 */
class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  }

  /**
   * Assess user's radio response
   * @param {Object} callDetails - Details of the dispatch call
   * @param {string} userResponse - User's transcribed response
   * @returns {Promise<Object>} Assessment with feedback and score
   */
  async assessResponse(callDetails, userResponse) {
    try {
      // Build prompt from template
      const prompt = buildAssessmentPrompt(callDetails, userResponse);

      // Call Gemini API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini - no JSON found');
      }

      const assessment = JSON.parse(jsonMatch[0]);

      // Validate assessment structure
      if (typeof assessment.score !== 'number' || typeof assessment.feedback !== 'string') {
        throw new Error('Invalid assessment format - missing score or feedback');
      }

      // Clamp score to 0-100 range
      assessment.score = Math.max(0, Math.min(100, assessment.score));

      logger.debug(`Assessment completed: score=${assessment.score}`);

      return {
        feedback: assessment.feedback,
        score: assessment.score
      };
    } catch (error) {
      logger.error('Gemini assessment failed:', error);
      throw error;
    }
  }
}

module.exports = GeminiService;
