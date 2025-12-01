import { CONFIG } from '@/config';
import { supabase } from '@/supabase-client';

const BACKEND_URL = CONFIG.BACKEND_URL;

// Helper to get auth token
async function getAuthToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
}

// Helper for API calls
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  return response.json();
}

export interface RadioCall {
  id: string;
  unitNumber: string;
  startingAddress: string;
  incidentAddress: string;
  age: number;
  gender: 'Male' | 'Female';
  complaint: string;
  dispatchText: string;
}

export interface Session {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  total_calls: number;
  average_score: number;
  status: 'active' | 'completed' | 'abandoned';
}

export interface AssessmentResult {
  resultId: string;
  score: number;
  feedback: string;
}

/**
 * Radio Simulation API Client
 */
export class RadioSimulationAPI {
  /**
   * Create a new training session
   */
  static async createSession(): Promise<Session> {
    const response = await apiCall<{ session: Session }>('/api/radio/session/create', {
      method: 'POST',
    });
    return response.session;
  }

  /**
   * Get active session for current user
   */
  static async getActiveSession(): Promise<Session | null> {
    const response = await apiCall<{ session: Session | null }>('/api/radio/session/active', {
      method: 'GET',
    });
    return response.session;
  }

  /**
   * Generate a new dispatch call
   */
  static async generateCall(sessionId: string): Promise<RadioCall> {
    const response = await apiCall<{ call: RadioCall }>('/api/radio/generate-call', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
    return response.call;
  }

  /**
   * Get TTS audio for dispatch text (with caching)
   */
  static async getAudio(text: string, voiceId?: string): Promise<{ audioUrl: string; cached: boolean }> {
    return apiCall('/api/radio/get-audio', {
      method: 'POST',
      body: JSON.stringify({ text, voiceId }),
    });
  }

  /**
   * Assess user's radio response
   */
  static async assessResponse(
    callId: string,
    userResponse: string,
    callDetails: {
      unitNumber: string;
      startingAddress: string;
      incidentAddress: string;
      age: number;
      gender: string;
      complaint: string;
    }
  ): Promise<AssessmentResult> {
    return apiCall('/api/radio/assess-response', {
      method: 'POST',
      body: JSON.stringify({ callId, userResponse, callDetails }),
    });
  }

  /**
   * Complete a training session
   */
  static async completeSession(
    sessionId: string,
    totalCalls: number,
    averageScore: number
  ): Promise<{ session: Session; userProgress: any }> {
    return apiCall('/api/radio/session/complete', {
      method: 'POST',
      body: JSON.stringify({ sessionId, totalCalls, averageScore }),
    });
  }

  /**
   * Get session details
   */
  static async getSession(sessionId: string): Promise<Session> {
    const response = await apiCall<{ session: Session }>(`/api/radio/session/${sessionId}`, {
      method: 'GET',
    });
    return response.session;
  }
}
