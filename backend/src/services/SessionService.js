const logger = require('../utils/logger');

/**
 * SessionService
 * Manages training sessions and progress tracking
 */
class SessionService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Create a new training session
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created session
   */
  async createSession(userId) {
    try {
      const { data: session, error } = await this.supabase
        .from('radio_sessions')
        .insert({
          user_id: userId,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(`Created session ${session.id} for user ${userId}`);

      return session;
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Complete a training session
   * @param {string} sessionId - Session ID
   * @param {number} totalCalls - Total calls completed
   * @param {number} averageScore - Average score across all calls
   * @returns {Promise<Object>} Updated session and user progress
   */
  async completeSession(sessionId, totalCalls, averageScore) {
    try {
      // Update session
      const { data: session, error: sessionError } = await this.supabase
        .from('radio_sessions')
        .update({
          ended_at: new Date().toISOString(),
          total_calls: totalCalls,
          avg_score: averageScore,
          status: 'complete'
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (sessionError) throw sessionError;

      logger.info(`Completed session ${sessionId}: ${totalCalls} calls, avg score ${averageScore}`);

      // Fetch updated user progress (trigger will update it)
      const { data: progress, error: progressError } = await this.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', session.user_id)
        .single();

      if (progressError) {
        logger.warn('Failed to fetch user progress:', progressError);
      }

      return {
        session,
        userProgress: progress
      };
    } catch (error) {
      logger.error('Failed to complete session:', error);
      throw error;
    }
  }

  /**
   * Get session details with all calls and assessments
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session with calls and results
   */
  async getSession(sessionId) {
    try {
      // Get session
      const { data: session, error: sessionError } = await this.supabase
        .from('radio_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Get calls with results
      const { data: calls, error: callsError } = await this.supabase
        .from('radio_calls')
        .select(`
          *,
          radio_results (*)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (callsError) throw callsError;

      return {
        ...session,
        calls: calls || []
      };
    } catch (error) {
      logger.error('Failed to get session:', error);
      throw error;
    }
  }

  /**
   * Get active session for user (if any)
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Active session or null
   */
  async getActiveSession(userId) {
    try {
      const { data: sessions, error } = await this.supabase
        .from('radio_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      // Return first session or null if array is empty
      return sessions && sessions.length > 0 ? sessions[0] : null;
    } catch (error) {
      logger.error('Failed to get active session:', error);
      throw error;
    }
  }

  /**
   * Update session stats incrementally (for running average)
   * @param {string} sessionId - Session ID
   * @param {number} newScore - Score of the latest call
   */
  async updateSessionStats(sessionId, newScore) {
    try {
      // Get current session stats
      const { data: session, error: fetchError } = await this.supabase
        .from('radio_sessions')
        .select('total_calls, avg_score')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      const currentTotal = session.total_calls || 0;
      const currentAvg = session.avg_score || 0;

      // Calculate new running average
      const newTotal = currentTotal + 1;
      const newAvg = ((currentAvg * currentTotal) + newScore) / newTotal;

      // Update session
      const { error: updateError } = await this.supabase
        .from('radio_sessions')
        .update({
          total_calls: newTotal,
          avg_score: parseFloat(newAvg.toFixed(2))
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      logger.debug(`Updated session ${sessionId} stats: ${newTotal} calls, avg ${newAvg.toFixed(2)}`);
    } catch (error) {
      logger.error('Failed to update session stats:', error);
      throw error;
    }
  }
}

module.exports = SessionService;
