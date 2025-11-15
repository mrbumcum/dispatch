import { useState, useRef, useEffect } from 'react';
import './EMTSimulation.css';
import { CONFIG } from '../../config.js';

const GEMINI_API_KEY = CONFIG?.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const ELEVENLABS_API_KEY = CONFIG?.ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

function EMTSimulation() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scenarioStarted, setScenarioStarted] = useState(false);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null); // Track which message is playing audio
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Patient AI System Prompt
  const PATIENT_PROMPT = `You are a patient in an emergency medical situation. You are experiencing symptoms, pain, or have visible injuries. 
Your role is to:
- Describe your symptoms realistically and in detail when asked
- Respond to questions about your condition, pain level, medical history
- Act as a real patient would - sometimes confused, in pain, or unable to provide complete information
- Only provide information when asked - don't volunteer everything at once
- Be consistent with your symptoms throughout the scenario
- Use a natural, conversational tone

IMPORTANT: Include stage directions in parentheses to describe your physical state, emotions, and actions. Examples:
- (Gasping and wheezing, struggling for air, a little whimper escapes)
- (Coughing, voice trembling with pain)
- (Weakly, barely audible)
- (Panicked, breathing heavily)

These stage directions help convey your distress and will be used to make your voice sound more realistic. Include them naturally in your responses.

Current scenario context will be provided. Stay in character as the patient.`;

  // Dispatcher AI System Prompt
  const DISPATCHER_PROMPT = `You are an experienced EMT dispatcher and instructor evaluating a student's assessment skills. 
Your role is to:
- Provide dispatch information to the EMT crew (age, gender, complaint, location)
- Observe the student's questions and assessment approach
- Provide constructive feedback on their assessment technique
- Ask probing questions to test their understanding
- Guide them toward proper EMT assessment protocols (ABCDE, SAMPLE, etc.)
- Point out what they're doing well and what they might be missing
- Test their knowledge of proper assessment procedures
- Be supportive but thorough in your evaluation

Evaluate the student's performance based on:
1. Proper assessment sequence (scene safety, ABCDE, etc.)
2. Quality of questions asked
3. Identification of critical findings
4. Appropriate use of medical terminology
5. Patient care priorities

Provide feedback after key assessment steps.`;

  const callGeminiAPI = async (prompt, systemPrompt, conversationHistory = []) => {
    try {
      const messages = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        ...conversationHistory,
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  const startNewScenario = async () => {
    setIsLoading(true);
    setScenarioStarted(true);
    setMessages([]);
    setCurrentScenario(null);

    // Generate a random scenario
    const scenarios = [
      {
        type: 'Medical - Hypoglycemia',
        description: '37-year-old female with hypoglycemia',
        details: 'Your patient is a 37-year-old female with hypoglycemia. She is looking at you when you enter the room and mumbles incomprehensible sounds when you call her name. When your partner attempts to start an IV, she pulls her arm away at the pain. Vitals: BP 133/72, P 108, R 14, SpO2 98%, CBG 43.',
        question: 'What is this patient\'s GCS?',
        answer: '10 (Eye opening: 4 - opens eyes, Verbal: 2 - incomprehensible sounds, Motor: 4 - localizes to pain)'
      },
      {
        type: 'Medical - Hypoglycemia',
        description: '34-year-old male with hypoglycemia from insulin overdose',
        details: 'You are assessing a 34-year-old male that isn\'t acting right, according to his family. The patient tells you that he doesn\'t feel well and may have taken too much insulin. The patient\'s CBG is 52.',
        question: 'What is the most appropriate treatment?',
        answer: 'Administer oral glucose, transport'
      },
      {
        type: 'Medical - Pediatric Respiratory',
        description: '5-year-old male in respiratory distress',
        details: 'You have been dispatched for a 5-year-old male in respiratory distress in late January. The patient\'s mother states that she originally thought he just had a head cold but his condition has worsened and he is having trouble breathing now. Assessment of the patient reveals: BP 114/70, HR 90, RR 36 and labored, SpO2 93%. Bilateral wheezing is heard upon auscultation of lung sounds.',
        question: 'What do you think is wrong with your patient?',
        answer: 'Respiratory syncytial virus (RSV)'
      },
      {
        type: 'Medical - Diabetic Emergency',
        description: 'Man in late 50s with SOB and altered mental status',
        details: 'You are called to a bus stop downtown for a man in his late 50s complaining of SOB. Upon arrival, you observe that he is fully responsive but appears to be sluggish and is having Kussmaul respirations. His skin is warm and dry. You notice a small indentation has been left on his skin from where your hand was.',
        question: 'Based on these findings, what would the patient\'s BGL be?',
        answer: '320 mg/dl (signs of hyperglycemia/DKA - Kussmaul respirations, warm dry skin, poor skin turgor)'
      }
    ];

    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    setCurrentScenario(scenario);

    // Extract dispatch information from scenario
    const extractDispatchInfo = (description, details) => {
      // Combine description and details for better extraction
      const combinedText = `${description} ${details}`;
      
      // Extract age - try multiple patterns
      let age = 'Unknown';
      // Pattern 1: "37-year-old" or "37 year old"
      const ageMatch1 = combinedText.match(/(\d+)[- ]year[- ]old/i);
      if (ageMatch1) {
        age = ageMatch1[1];
      } else {
        // Pattern 2: "age 37" or "age: 37"
        const ageMatch2 = combinedText.match(/age[:\s]+(\d+)/i);
        if (ageMatch2) {
          age = ageMatch2[1];
        } else {
          // Pattern 3: "late 50s" or "mid 30s" or "early 20s"
          const ageMatch3 = combinedText.match(/(late|mid|early)\s+(\d+)s/i);
          if (ageMatch3) {
            const decade = parseInt(ageMatch3[2]);
            // Approximate: late = +7, mid = +5, early = +2
            const offset = ageMatch3[1].toLowerCase() === 'late' ? 7 : 
                          ageMatch3[1].toLowerCase() === 'mid' ? 5 : 2;
            age = (decade + offset).toString();
          } else {
            // Pattern 4: Just a number followed by "year" or "yo"
            const ageMatch4 = combinedText.match(/(\d+)[- ](?:year|yo)/i);
            if (ageMatch4) {
              age = ageMatch4[1];
            }
          }
        }
      }
      
      // Extract gender (M/F format) - check both description and details
      let genderCode = 'Unknown';
      const genderMatch = combinedText.match(/\b(female|male|woman|man|girl|boy)\b/i);
      if (genderMatch) {
        const gender = genderMatch[1].toLowerCase();
        if (gender.includes('female') || gender.includes('woman') || gender.includes('girl')) {
          genderCode = 'F';
        } else if (gender.includes('male') || gender.includes('man') || gender.includes('boy')) {
          genderCode = 'M';
        }
      }
      
      // Extract complaint (look for key phrases)
      let complaint = 'medical emergency';
      const lowerText = combinedText.toLowerCase();
      if (lowerText.includes('hypoglycemia')) complaint = 'hypoglycemia';
      else if (lowerText.includes('respiratory distress')) complaint = 'respiratory distress';
      else if (lowerText.includes('sob') || lowerText.includes('shortness of breath')) complaint = 'shortness of breath';
      else if (lowerText.includes('not acting right') || lowerText.includes('altered')) complaint = 'altered mental status';
      
      // Extract location
      let location = 'residence';
      const lowerDetails = details.toLowerCase();
      if (lowerDetails.includes('bus stop')) location = 'bus stop downtown';
      else if (lowerDetails.includes('room') || lowerDetails.includes('home')) location = 'residence';
      
      // Generate random unit number
      const unitNumber = `Unit ${Math.floor(Math.random() * 10) + 1}`;
      
      return { age, gender: genderCode, complaint, location, unitNumber };
    };

    const dispatchInfo = extractDispatchInfo(scenario.description, scenario.details);
    
    // Store dispatch info in scenario for voice selection
    scenario.dispatchInfo = dispatchInfo;

    try {
      // Generate concise dispatch call in the exact format requested
      const dispatcherCall = `**SOUND TONES** ${dispatchInfo.unitNumber}, respond to ${dispatchInfo.location} for a ${dispatchInfo.age} year old ${dispatchInfo.gender} patient complaining of ${dispatchInfo.complaint}`;

      // Use the exact format directly - no need to call AI for this
      const dispatcherResponse = dispatcherCall;

      // Initialize patient AI with scenario
      const patientInitPrompt = `You are the patient in this scenario. 
      Scenario details: ${scenario.details}
      
      The EMT crew has been dispatched and will arrive soon. Begin by describing your current situation and symptoms based on the scenario details. Be realistic - you're in distress. 
      Wait for the EMT student to ask you questions before providing more details. 
      When asked about your condition, provide information that matches the scenario details provided.`;

      const patientResponse = await callGeminiAPI(patientInitPrompt, PATIENT_PROMPT, []);
      
      // Extract stage directions from patient response
      const patientStageDirections = extractStageDirections(patientResponse);
      
      setMessages([
        {
          role: 'system',
          content: `🚨 New Scenario Started: ${scenario.type} Emergency\n\n📋 Learning Objective: ${scenario.question}`,
          type: 'system'
        },
        {
          role: 'dispatcher',
          content: dispatcherResponse,
          type: 'dispatcher',
          stageDirections: []
        },
        {
          role: 'patient',
          content: patientResponse,
          type: 'patient',
          stageDirections: patientStageDirections
        }
      ]);
    } catch (error) {
      setMessages([{
        role: 'system',
        content: `Error: ${error.message}. Please check your API key in config.js`,
        type: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim() || isLoading || !scenarioStarted) return;

    const userMessage = {
      role: 'user',
      content: userInput,
      type: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      // Get conversation history for context
      const conversationHistory = messages
        .filter(m => m.type === 'user' || m.type === 'patient')
        .slice(-10)
        .map(m => ({
          role: m.type === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

      // Patient responds to user's question
      const patientPrompt = `The EMT student just asked you: "${userInput}"
      Respond as the patient. Provide realistic, detailed information based on your symptoms and condition. 
      Remember you're in distress - be natural and consistent with your symptoms.`;

      const patientResponse = await callGeminiAPI(
        patientPrompt,
        PATIENT_PROMPT,
        conversationHistory
      );

      // Extract stage directions from patient response
      const patientStageDirections = extractStageDirections(patientResponse);
      
      setMessages(prev => [
        ...prev,
        {
          role: 'patient',
          content: patientResponse,
          type: 'patient',
          stageDirections: patientStageDirections
        }
      ]);

      // Dispatcher evaluates the user's question
      const dispatcherPrompt = `The EMT student just asked the patient: "${userInput}"
      The patient responded: "${patientResponse}"
      
      This scenario has a specific learning objective. The student should work toward answering: "${currentScenario?.question}"
      The correct answer is: "${currentScenario?.answer}"
      
      As the dispatcher/instructor, evaluate the student's question:
      1. Was it appropriate for this stage of assessment?
      2. Does it follow proper EMT protocols?
      3. What should they consider next?
      4. Are they getting closer to understanding the key question: "${currentScenario?.question}"?
      5. Provide brief feedback (1-2 sentences) unless they made a significant error or missed something critical.
      
      If this is a good assessment question, acknowledge it briefly. If they're missing something important or asking inappropriate questions, guide them.
      If the student mentions or gets close to the answer "${currentScenario?.answer}", acknowledge their progress but encourage them to explain their reasoning.
      DO NOT give away the answer directly - guide them to discover it through proper assessment.`;

      const dispatcherResponse = await callGeminiAPI(
        dispatcherPrompt,
        DISPATCHER_PROMPT,
        []
      );

      setMessages(prev => [
        ...prev,
        {
          role: 'dispatcher',
          content: dispatcherResponse,
          type: 'dispatcher',
          stageDirections: []
        }
      ]);

    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          content: `Error: ${error.message}`,
          type: 'error'
        }
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  // Function to extract stage directions from text
  const extractStageDirections = (text) => {
    const stageDirections = [];
    const stageDirectionRegex = /\(([^)]+)\)/g;
    let match;
    
    while ((match = stageDirectionRegex.exec(text)) !== null) {
      stageDirections.push(match[1]);
    }
    
    return stageDirections;
  };

  // Function to remove stage directions from text
  const removeStageDirections = (text) => {
    return text.replace(/\([^)]+\)/g, '').trim();
  };

  // Function to adjust voice settings based on stage directions
  const getVoiceSettingsFromStageDirections = (stageDirections, baseSettings) => {
    if (!stageDirections || stageDirections.length === 0) {
      return baseSettings;
    }

    const combinedDirections = stageDirections.join(' ').toLowerCase();
    let adjustedSettings = { ...baseSettings };

    // If there's gasping, wheezing, struggling, crying, etc. - make it more distressed
    if (combinedDirections.includes('gasp') || 
        combinedDirections.includes('wheez') || 
        combinedDirections.includes('struggl') ||
        combinedDirections.includes('cry') ||
        combinedDirections.includes('whimper') ||
        combinedDirections.includes('pain')) {
      adjustedSettings.stability = Math.max(0.1, baseSettings.stability - 0.1); // Even more unstable
      adjustedSettings.style = Math.min(0.8, baseSettings.style + 0.2); // More expressive
    }

    // If there's coughing - add more variation
    if (combinedDirections.includes('cough')) {
      adjustedSettings.stability = Math.max(0.1, baseSettings.stability - 0.05);
    }

    return adjustedSettings;
  };

  const formatMessage = (text, stageDirections = []) => {
    if (!text) return '';
    
    // Remove stage directions from display text
    let displayText = removeStageDirections(text);
    
    // Format the text
    displayText = displayText
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
    
    return displayText;
  };

  // Function to convert text to speech using ElevenLabs
  const textToSpeech = async (text, voiceId = '21m00Tcm4TlvDq8ikWAM', voiceType = 'default', stageDirections = []) => {
    try {
      // Check if API key is set
      if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === '') {
        throw new Error('ElevenLabs API key is not configured');
      }

      // Clean text - remove stage directions (they're handled separately)
      const cleanText = removeStageDirections(text)
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();

      if (!cleanText || cleanText.length === 0) {
        throw new Error('No text to convert to speech');
      }

      // Base voice settings for patient (stressed, in pain, sad) vs dispatcher (professional but natural)
      // Also adjust for children vs adults
      const isChild = voiceType === 'patient' && currentScenario?.dispatchInfo && parseInt(currentScenario.dispatchInfo.age) < 13;
      
      const baseVoiceSettings = voiceType === 'patient' 
        ? isChild
          ? {
              stability: 0.25, // Slightly higher for children but still emotional
              similarity_boost: 0.7,
              style: 0.65, // Very expressive for scared/distressed children
              use_speaker_boost: true
            }
          : {
              stability: 0.2, // Very low = maximum variation, stress, and emotion
              similarity_boost: 0.65, // Slightly lower for more natural distress
              style: 0.6, // Higher style = more expressive, emotional, pained
              use_speaker_boost: true
            }
        : {
            stability: 0.4, // Slightly more stable for professional dispatcher
            similarity_boost: 0.75,
            style: 0.35, // Natural but professional
            use_speaker_boost: true
          };

      // Adjust voice settings based on stage directions
      const voiceSettings = getVoiceSettingsFromStageDirections(stageDirections, baseVoiceSettings);

      const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: voiceSettings
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `ElevenLabs API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail?.message || errorJson.message || errorMessage;
        } catch (e) {
          // If not JSON, use the text as is
          if (errorText) errorMessage += ` - ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      return audioUrl;
    } catch (error) {
      console.error('Error converting text to speech:', error);
      throw error;
    }
  };

  // Function to select appropriate voice based on age and gender
  const selectPatientVoice = (age, gender) => {
    const ageNum = parseInt(age);
    
    // Child voices (under 13 years old) - use higher-pitched, younger-sounding voices
    if (ageNum < 13) {
      if (gender === 'F' || gender === 'Female') {
        return 'EXAVITQu4vr4xnSDxMaL'; // Bella - young female voice, good for children
      } else {
        return 'VR6AewLTigWG4xSOukaG'; // Arnold - can work for young boys
      }
    }
    
    // Teen/Young Adult (13-25)
    if (ageNum >= 13 && ageNum <= 25) {
      if (gender === 'F' || gender === 'Female') {
        return 'EXAVITQu4vr4xnSDxMaL'; // Bella - young female
      } else {
        return 'TxGEqnHWrfWFTfGW9XjX'; // Josh - young male voice
      }
    }
    
    // Adult voices (26+)
    if (gender === 'F' || gender === 'Female') {
      return '21m00Tcm4TlvDq8ikWAM'; // Rachel - professional female
    } else {
      return 'ErXwobaYiN019PkySvjV'; // Antoni - clear, natural male voice
    }
  };

  // Function to play audio for a message
  const playAudio = async (messageIndex, text, voiceType = 'default', stageDirections = []) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Set loading state
    setPlayingAudio(messageIndex);

    try {
      // Use different voices for dispatcher vs patient
      const dispatcherVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel - professional female
      
      let patientVoiceId;
      if (voiceType === 'patient' && currentScenario?.dispatchInfo) {
        // Select voice based on age and gender from dispatch
        const { age, gender } = currentScenario.dispatchInfo;
        patientVoiceId = selectPatientVoice(age, gender);
      } else {
        // Default adult male voice
        patientVoiceId = 'ErXwobaYiN019PkySvjV'; // Antoni - clear male voice
      }
      
      const voiceId = voiceType === 'dispatcher' ? dispatcherVoiceId : patientVoiceId;
      
      const audioUrl = await textToSpeech(text, voiceId, voiceType, stageDirections);
      
      // Create audio element and play
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setPlayingAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingAudio(null);
      const errorMessage = error.message || 'Unknown error';
      alert(`Failed to play audio: ${errorMessage}\n\nPlease check:\n1. Your ElevenLabs API key in config.js\n2. Your internet connection\n3. Browser console for more details`);
    }
  };

  // Stop audio playback
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAudio(null);
  };

  return (
    <div className="emt-simulation">
      <div className="simulation-header">
        <h1>🚑 EMT Assessment Simulation</h1>
        <p>Practice your assessment skills with AI-powered patient scenarios</p>
        {!scenarioStarted && (
          <button onClick={startNewScenario} className="start-scenario-btn">
            Start New Scenario
          </button>
        )}
        {scenarioStarted && (
          <button onClick={startNewScenario} className="new-scenario-btn">
            New Scenario
          </button>
        )}
      </div>

      <div className="messages-container">
        {messages.length === 0 && !isLoading && (
          <div className="welcome-message">
            <h2>Welcome to EMT Simulation</h2>
            <p>Click "Start New Scenario" to begin a new patient assessment scenario.</p>
            <div className="instructions">
              <h3>How it works:</h3>
              <ul>
                <li><strong>Dispatcher:</strong> Provides dispatch information (age, gender, complaint, location) and evaluates your assessment</li>
                <li><strong>Patient AI:</strong> Simulates a patient with symptoms/injuries</li>
                <li><strong>Your role:</strong> You're in the ambulance responding to the dispatch. Ask questions, assess the situation, and demonstrate proper EMT protocols</li>
              </ul>
              <h3>Assessment Tips:</h3>
              <ul>
                <li>Start with scene safety and BSI</li>
                <li>Follow ABCDE assessment protocol</li>
                <li>Use SAMPLE history when appropriate</li>
                <li>Ask focused, relevant questions</li>
                <li>Identify critical findings</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          const stageDirections = msg.stageDirections || [];
          return (
            <div key={index} className={`message ${msg.type}`}>
              <div className="message-header">
                <div className="header-left">
                  {msg.type === 'patient' && <span className="badge patient-badge">👤 Patient</span>}
                  {msg.type === 'dispatcher' && <span className="badge dispatcher-badge">📻 Dispatcher</span>}
                  {msg.type === 'user' && <span className="badge user-badge">You</span>}
                  {msg.type === 'system' && <span className="badge system-badge">System</span>}
                </div>
                {(msg.type === 'patient' || msg.type === 'dispatcher') && (
                  <button
                    className="play-audio-btn"
                    onClick={() => {
                      if (playingAudio === index) {
                        stopAudio();
                      } else {
                        playAudio(index, msg.content, msg.type, stageDirections);
                      }
                    }}
                    disabled={isLoading}
                    title={playingAudio === index ? 'Stop audio' : 'Play audio'}
                  >
                    {playingAudio === index ? '⏸️' : '🔊'}
                  </button>
                )}
              </div>
              {stageDirections.length > 0 && (
                <div className="stage-directions">
                  <em>💬 {stageDirections.join(' • ')}</em>
                </div>
              )}
              <div 
                className="message-content"
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content, stageDirections) }}
              />
            </div>
          );
        })}

        {isLoading && (
          <div className="message loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {scenarioStarted && (
        <div className="input-container">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask the patient a question or describe your assessment..."
            disabled={isLoading}
            className="message-input"
          />
          <button 
            onClick={sendMessage} 
            disabled={isLoading || !userInput.trim()}
            className="send-button"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

export default EMTSimulation;

