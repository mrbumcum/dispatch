const logger = require('../utils/logger');

/**
 * ScenarioService
 * Generates random radio dispatch scenarios using DB content and randomization
 */
class ScenarioService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Generate a random dispatch call
   * @param {string} sessionId - Session ID to associate call with
   * @returns {Promise<Object>} Generated call object
   */
  async generateCall(sessionId) {
    try {
      // Query random station location (destination = false)
      const { data: stations, error: stationError } = await this.supabase
        .from('locations')
        .select('address')
        .eq('destination', false)
        .eq('is_active', true);

      if (stationError) throw stationError;
      if (!stations || stations.length === 0) {
        throw new Error('No active station locations found in database');
      }

      // Query random incident location (destination = true)
      const { data: incidents, error: incidentError } = await this.supabase
        .from('locations')
        .select('address')
        .eq('destination', true)
        .eq('is_active', true);

      if (incidentError) throw incidentError;
      if (!incidents || incidents.length === 0) {
        throw new Error('No active incident locations found in database');
      }

      // Query random complaint
      const { data: complaints, error: complaintError } = await this.supabase
        .from('complaints')
        .select('name')
        .eq('is_active', true);

      if (complaintError) throw complaintError;
      if (!complaints || complaints.length === 0) {
        throw new Error('No active complaints found in database');
      }

      // Randomize selections
      const startingAddress = stations[Math.floor(Math.random() * stations.length)].address;
      const incidentAddress = incidents[Math.floor(Math.random() * incidents.length)].address;
      const complaint = complaints[Math.floor(Math.random() * complaints.length)].name;

      // Randomize demographics
      const unitNum = Math.floor(Math.random() * 20) + 1; // 1-20
      const age = Math.floor(Math.random() * 61) + 18; // 18-78
      const gender = Math.random() > 0.5 ? 'Male' : 'Female';

      // Build dispatch text
      const dispatchText = `Unit ${unitNum}, respond to ${incidentAddress} for a ${age} year old ${gender} patient for a report of ${complaint}`;

      // Insert call into database
      const { data: call, error: insertError } = await this.supabase
        .from('radio_calls')
        .insert({
          session_id: sessionId,
          unit_num: unitNum,
          starting_address: startingAddress,
          incident_address: incidentAddress,
          age: age,
          gender: gender,
          complaint: complaint,
          dispatch_text: dispatchText
        })
        .select()
        .single();

      if (insertError) throw insertError;

      logger.info(`Generated call ${call.id} for session ${sessionId}`);

      return {
        id: call.id,
        unitNumber: `Unit ${unitNum}`,
        startingAddress,
        incidentAddress,
        age,
        gender,
        complaint,
        dispatchText
      };
    } catch (error) {
      logger.error('Failed to generate call:', error);
      throw error;
    }
  }

  /**
   * Update call with user response
   * @param {string} callId - Call ID
   * @param {string} userResponse - User's transcribed response
   */
  async updateCallResponse(callId, userResponse) {
    const { error } = await this.supabase
      .from('radio_calls')
      .update({ user_response: userResponse })
      .eq('id', callId);

    if (error) {
      logger.error('Failed to update call response:', error);
      throw error;
    }
  }
}

module.exports = ScenarioService;
