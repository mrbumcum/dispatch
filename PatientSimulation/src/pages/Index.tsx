import { useState, useRef, useEffect, useCallback } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ViewToggle } from "@/components/ViewToggle";
import { VisualView } from "@/components/VisualView";
import { TranscriptView } from "@/components/TranscriptView";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SkipForward } from "lucide-react";
import { CONFIG } from "@/config";

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// API Configuration
const GEMINI_API_KEY = CONFIG?.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const ELEVENLABS_API_KEY = CONFIG?.ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

interface Message {
  id: string;
  speaker: "user" | "dispatcher" | "patient" | "system";
  text: string;
  timestamp: Date;
  stageDirections?: string[];
}

interface Scenario {
  type: string;
  description: string;
  details: string;
  question: string;
  answer: string;
  dispatchInfo?: {
    age: string;
    gender: string;
    complaint: string;
    location: string;
    unitNumber: string;
  };
}

const Index = () => {
  const [view, setView] = useState<"visual" | "transcript">("visual");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scenarioStarted, setScenarioStarted] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dispatchSoundRef = useRef<HTMLAudioElement | null>(null);
  const hasAutoPlayedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptBufferRef = useRef<string>('');

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

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionClass = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognitionClass() as SpeechRecognition;
      recognition.continuous = true; // Keep recording until manually stopped
      recognition.interimResults = true; // Get interim results for better UX
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Collect all results (including interim)
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript + ' ';
          }
        }
        
        // Update buffer with all transcribed text (use ref for immediate access)
        const fullTranscript = (finalTranscript + interimTranscript).trim();
        if (fullTranscript) {
          transcriptBufferRef.current = fullTranscript;
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        // Don't stop on 'no-speech' error in continuous mode - it's normal
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setIsListening(false);
          toast({
            title: "Speech Recognition Error",
            description: `Error: ${event.error}`,
            variant: "destructive"
          });
        }
      };
      
      recognition.onend = () => {
        // In continuous mode, onend fires when recognition stops
        // If user manually stopped (isListening is false), process the transcript
        // Otherwise, it might have stopped due to timeout/error, so restart if still listening
        if (!isListening) {
          // User manually stopped, process the transcript from ref
          const finalTranscript = transcriptBufferRef.current.trim();
          if (finalTranscript) {
            const event = new CustomEvent('speechTranscribed', { detail: finalTranscript });
            window.dispatchEvent(event);
            transcriptBufferRef.current = ''; // Clear buffer after sending
          }
        } else {
          // Recognition ended but we're still in listening mode - restart it
          // This handles cases where recognition stops due to timeout
          try {
            recognitionRef.current?.start();
          } catch (error) {
            // If restart fails, stop listening
            console.error('Error restarting speech recognition:', error);
            setIsListening(false);
          }
        }
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (dispatchSoundRef.current) {
        dispatchSoundRef.current.pause();
        dispatchSoundRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  // Auto-play dispatcher and patient audio when scenario starts
  useEffect(() => {
    // Only auto-play if we have exactly 3 messages (system, dispatcher, patient) and we're on visual view
    // and we haven't auto-played yet for this scenario
    if (messages.length === 3 && view === 'visual' && scenarioStarted && !playingAudio && !hasAutoPlayedRef.current) {
      const dispatcherMessage = messages.find(m => m.speaker === 'dispatcher');
      const patientMessage = messages.find(m => m.speaker === 'patient');
      
      if (dispatcherMessage && patientMessage) {
        hasAutoPlayedRef.current = true;
        // Store patient message and scenario for later playback
        const patientMsg = patientMessage;
        const scenario = currentScenario; // Capture current scenario
        
        // Play dispatcher first (after dispatch sound effect)
        const playDispatcher = async () => {
          try {
            // First, play the dispatch sound effect for 5 seconds
            setIsIncomingCall(true);
            setCurrentSpeaker(null); // Clear speaker during incoming call
            const dispatchSound = new Audio('/dispatch-sound.mp3');
            dispatchSoundRef.current = dispatchSound;
            
            await dispatchSound.play();
            
            // Stop the dispatch sound after 5 seconds
            setTimeout(() => {
              if (dispatchSoundRef.current) {
                dispatchSoundRef.current.pause();
                dispatchSoundRef.current.currentTime = 0;
                dispatchSoundRef.current = null;
              }
              setIsIncomingCall(false);
            }, 5000);
            
            // Wait for dispatch sound to finish (5 seconds) before playing dispatcher voice
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const dispatcherVoiceId = '21m00Tcm4TlvDq8ikWAM';
            const audioUrl = await textToSpeech(
              dispatcherMessage.text, 
              dispatcherVoiceId, 
              'dispatcher', 
              dispatcherMessage.stageDirections || []
            );
            
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            setPlayingAudio(dispatcherMessage.id);
            setCurrentSpeaker('dispatcher');
            setIsSpeaking(true);
            
            // When dispatcher finishes, play patient audio
            audio.onended = () => {
              setIsSpeaking(false);
              setPlayingAudio(null);
              setCurrentSpeaker(null);
              URL.revokeObjectURL(audioUrl);
              
              // Small delay before playing patient
              setTimeout(async () => {
                try {
                  let patientVoiceId;
                  
                  // Use the captured scenario from closure
                  if (scenario?.dispatchInfo) {
                    const { age, gender } = scenario.dispatchInfo;
                    patientVoiceId = selectPatientVoice(age, gender);
                    console.log('Using patient voice for age', age, 'gender', gender, ':', patientVoiceId);
                  } else {
                    patientVoiceId = 'ErXwobaYiN019PkySvjV';
                    console.log('Using default patient voice:', patientVoiceId);
                  }
                  
                  console.log('Generating patient audio for text:', patientMsg.text.substring(0, 50) + '...');
                  
                  const patientAudioUrl = await textToSpeech(
                    patientMsg.text,
                    patientVoiceId,
                    'patient',
                    patientMsg.stageDirections || []
                  );
                  
                  console.log('Patient audio URL generated:', patientAudioUrl ? 'Success' : 'Failed');
                  
                  const patientAudio = new Audio(patientAudioUrl);
                  audioRef.current = patientAudio;
                  setPlayingAudio(patientMsg.id);
                  setCurrentSpeaker('patient');
                  setIsSpeaking(true);
                  
                  patientAudio.onended = () => {
                    console.log('Patient audio finished');
                    setIsSpeaking(false);
                    setPlayingAudio(null);
                    setCurrentSpeaker(null);
                    URL.revokeObjectURL(patientAudioUrl);
                  };
                  
                  patientAudio.onerror = (error) => {
                    console.error('Patient audio playback error:', error);
                    setIsSpeaking(false);
                    setPlayingAudio(null);
                    setCurrentSpeaker(null);
                    URL.revokeObjectURL(patientAudioUrl);
                    toast({
                      title: "Audio Error",
                      description: "Failed to play patient audio",
                      variant: "destructive"
                    });
                  };
                  
                  console.log('Starting patient audio playback...');
                  await patientAudio.play();
                  console.log('Patient audio playback started successfully');
                } catch (error) {
                  console.error('Error in patient audio playback:', error);
                  setIsSpeaking(false);
                  setPlayingAudio(null);
                  setCurrentSpeaker(null);
                  toast({
                    title: "Audio Error",
                    description: error instanceof Error ? error.message : 'Failed to play patient audio',
                    variant: "destructive"
                  });
                }
              }, 500);
            };
            
            audio.onerror = () => {
              setIsSpeaking(false);
              setPlayingAudio(null);
              setCurrentSpeaker(null);
              URL.revokeObjectURL(audioUrl);
            };
            
            await audio.play();
          } catch (error) {
            console.error('Error playing dispatcher audio:', error);
            setIsSpeaking(false);
            setPlayingAudio(null);
            setCurrentSpeaker(null);
          }
        };
        
        playDispatcher();
      }
    }
  }, [messages, view, scenarioStarted, playingAudio, currentScenario]);

  // Function to call Gemini API
  const callGeminiAPI = async (prompt: string, systemPrompt: string, conversationHistory: any[] = []) => {
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

  // Extract stage directions from text
  const extractStageDirections = (text: string): string[] => {
    const stageDirections: string[] = [];
    const stageDirectionRegex = /\(([^)]+)\)/g;
    let match;
    
    while ((match = stageDirectionRegex.exec(text)) !== null) {
      stageDirections.push(match[1]);
    }
    
    return stageDirections;
  };

  // Remove stage directions from text
  const removeStageDirections = (text: string): string => {
    return text.replace(/\([^)]+\)/g, '').trim();
  };

  // Adjust voice settings based on stage directions
  const getVoiceSettingsFromStageDirections = (stageDirections: string[], baseSettings: any) => {
    if (!stageDirections || stageDirections.length === 0) {
      return baseSettings;
    }

    const combinedDirections = stageDirections.join(' ').toLowerCase();
    let adjustedSettings = { ...baseSettings };

    if (combinedDirections.includes('gasp') || 
        combinedDirections.includes('wheez') || 
        combinedDirections.includes('struggl') ||
        combinedDirections.includes('cry') ||
        combinedDirections.includes('whimper') ||
        combinedDirections.includes('pain')) {
      adjustedSettings.stability = Math.max(0.1, baseSettings.stability - 0.1);
      adjustedSettings.style = Math.min(0.8, baseSettings.style + 0.2);
    }

    if (combinedDirections.includes('cough')) {
      adjustedSettings.stability = Math.max(0.1, baseSettings.stability - 0.05);
    }

    return adjustedSettings;
  };

  // Select appropriate voice based on age and gender
  const selectPatientVoice = (age: string, gender: string): string => {
    const ageNum = parseInt(age);
    
    if (ageNum < 13) {
      if (gender === 'F' || gender === 'Female') {
        return 'EXAVITQu4vr4xnSDxMaL'; // Bella - young female
      } else {
        return 'VR6AewLTigWG4xSOukaG'; // Arnold - young male
      }
    }
    
    if (ageNum >= 13 && ageNum <= 25) {
      if (gender === 'F' || gender === 'Female') {
        return 'EXAVITQu4vr4xnSDxMaL'; // Bella
      } else {
        return 'TxGEqnHWrfWFTfGW9XjX'; // Josh
      }
    }
    
    if (gender === 'F' || gender === 'Female') {
      return '21m00Tcm4TlvDq8ikWAM'; // Rachel
    } else {
      return 'ErXwobaYiN019PkySvjV'; // Antoni
    }
  };

  // Convert text to speech using ElevenLabs
  const textToSpeech = async (text: string, voiceId: string, voiceType: string = 'default', stageDirections: string[] = []): Promise<string> => {
    try {
      if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === '') {
        throw new Error('ElevenLabs API key is not configured');
      }

      const cleanText = removeStageDirections(text)
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText || cleanText.length === 0) {
        throw new Error('No text to convert to speech');
      }

      const isChild = voiceType === 'patient' && currentScenario?.dispatchInfo && parseInt(currentScenario.dispatchInfo.age) < 13;
      
      const baseVoiceSettings = voiceType === 'patient' 
        ? isChild
          ? {
              stability: 0.25,
              similarity_boost: 0.7,
              style: 0.65,
              use_speaker_boost: true
            }
          : {
              stability: 0.2,
              similarity_boost: 0.65,
              style: 0.6,
              use_speaker_boost: true
            }
        : {
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true
          };

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

  // Play audio for a message
  const playAudio = async (messageId: string, text: string, speaker: string, stageDirections: string[] = []) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlayingAudio(messageId);
    setCurrentSpeaker(speaker);
    setIsSpeaking(true);

    try {
      const dispatcherVoiceId = '21m00Tcm4TlvDq8ikWAM';
      
      let patientVoiceId;
      if (speaker === 'patient' && currentScenario?.dispatchInfo) {
        const { age, gender } = currentScenario.dispatchInfo;
        patientVoiceId = selectPatientVoice(age, gender);
      } else {
        patientVoiceId = 'ErXwobaYiN019PkySvjV';
      }
      
      const voiceId = speaker === 'dispatcher' ? dispatcherVoiceId : patientVoiceId;
      const voiceType = speaker === 'dispatcher' ? 'dispatcher' : 'patient';
      
      const audioUrl = await textToSpeech(text, voiceId, voiceType, stageDirections);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        setPlayingAudio(null);
        setCurrentSpeaker(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        setPlayingAudio(null);
        setCurrentSpeaker(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsSpeaking(false);
      setPlayingAudio(null);
      setCurrentSpeaker(null);
      toast({
        title: "Audio Error",
        description: error instanceof Error ? error.message : 'Failed to play audio',
        variant: "destructive"
      });
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (dispatchSoundRef.current) {
      dispatchSoundRef.current.pause();
      dispatchSoundRef.current = null;
    }
    setIsSpeaking(false);
    setPlayingAudio(null);
    setCurrentSpeaker(null);
  };

  // Extract dispatch information
  const extractDispatchInfo = (description: string, details: string) => {
    const combinedText = `${description} ${details}`;
    
    let age = 'Unknown';
    const ageMatch1 = combinedText.match(/(\d+)[- ]year[- ]old/i);
    if (ageMatch1) {
      age = ageMatch1[1];
    } else {
      const ageMatch2 = combinedText.match(/age[:\s]+(\d+)/i);
      if (ageMatch2) {
        age = ageMatch2[1];
      } else {
        const ageMatch3 = combinedText.match(/(late|mid|early)\s+(\d+)s/i);
        if (ageMatch3) {
          const decade = parseInt(ageMatch3[2]);
          const offset = ageMatch3[1].toLowerCase() === 'late' ? 7 : 
                        ageMatch3[1].toLowerCase() === 'mid' ? 5 : 2;
          age = (decade + offset).toString();
        } else {
          const ageMatch4 = combinedText.match(/(\d+)[- ](?:year|yo)/i);
          if (ageMatch4) {
            age = ageMatch4[1];
          }
        }
      }
    }
    
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
    
    let complaint = 'medical emergency';
    const lowerText = combinedText.toLowerCase();
    if (lowerText.includes('hypoglycemia')) complaint = 'hypoglycemia';
    else if (lowerText.includes('respiratory distress')) complaint = 'respiratory distress';
    else if (lowerText.includes('sob') || lowerText.includes('shortness of breath')) complaint = 'shortness of breath';
    else if (lowerText.includes('not acting right') || lowerText.includes('altered')) complaint = 'altered mental status';
    
    let location = 'residence';
    const lowerDetails = details.toLowerCase();
    if (lowerDetails.includes('bus stop')) location = 'bus stop downtown';
    else if (lowerDetails.includes('room') || lowerDetails.includes('home')) location = 'residence';
    
    const unitNumber = `Unit ${Math.floor(Math.random() * 10) + 1}`;
    
    return { age, gender: genderCode, complaint, location, unitNumber };
  };

  const startNewScenario = async () => {
    setIsLoading(true);
    setScenarioStarted(true);
    setMessages([]);
    setCurrentScenario(null);
    setIsSpeaking(false);
    setPlayingAudio(null);
    setCurrentSpeaker(null);
    setIsIncomingCall(false);
    if (dispatchSoundRef.current) {
      dispatchSoundRef.current.pause();
      dispatchSoundRef.current = null;
    }
    hasAutoPlayedRef.current = false; // Reset auto-play flag for new scenario

    const scenarios: Scenario[] = [
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
    const dispatchInfo = extractDispatchInfo(scenario.description, scenario.details);
    scenario.dispatchInfo = dispatchInfo;

    try {
      const dispatcherCall = `${dispatchInfo.unitNumber}, respond to ${dispatchInfo.location} for a ${dispatchInfo.age} year old ${dispatchInfo.gender} patient complaining of ${dispatchInfo.complaint}`;

      const patientInitPrompt = `You are the patient in this scenario. 
      Scenario details: ${scenario.details}
      
      The EMT crew has been dispatched and will arrive soon. Begin by describing your current situation and symptoms based on the scenario details. Be realistic - you're in distress. 
      Wait for the EMT student to ask you questions before providing more details. 
      When asked about your condition, provide information that matches the scenario details provided.`;

      const patientResponse = await callGeminiAPI(patientInitPrompt, PATIENT_PROMPT, []);
      const patientStageDirections = extractStageDirections(patientResponse);
      
      setMessages([
        {
          id: 'system-1',
          speaker: 'system',
          text: `🚨 New Scenario Started: ${scenario.type} Emergency\n\n📋 Learning Objective: ${scenario.question}`,
          timestamp: new Date()
        },
        {
          id: 'dispatcher-1',
          speaker: 'dispatcher',
          text: dispatcherCall,
          timestamp: new Date(),
          stageDirections: []
        },
        {
          id: 'patient-1',
          speaker: 'patient',
          text: patientResponse,
          timestamp: new Date(),
          stageDirections: patientStageDirections
        }
      ]);

      setCurrentScenario(scenario);
      toast({
        title: "Scenario Started",
        description: `${scenario.type} - ${scenario.description}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to start scenario',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || !scenarioStarted) return;

        const userMessage: Message = {
      id: `user-${Date.now()}`,
      speaker: 'user',
      text: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.speaker === 'user' || m.speaker === 'patient')
        .slice(-10)
        .map(m => ({
          role: m.speaker === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      const patientPrompt = `The EMT student just asked you: "${text}"
      Respond as the patient. Provide realistic, detailed information based on your symptoms and condition. 
      Remember you're in distress - be natural and consistent with your symptoms.`;

      const patientResponse = await callGeminiAPI(patientPrompt, PATIENT_PROMPT, conversationHistory);
      const patientStageDirections = extractStageDirections(patientResponse);
      
      const patientMessageId = `patient-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: patientMessageId,
          speaker: 'patient',
          text: patientResponse,
          timestamp: new Date(),
          stageDirections: patientStageDirections
        }
      ]);

      // Auto-play patient audio response (always play, regardless of view)
      setTimeout(async () => {
        try {
          let patientVoiceId;
          if (currentScenario?.dispatchInfo) {
            const { age, gender } = currentScenario.dispatchInfo;
            patientVoiceId = selectPatientVoice(age, gender);
          } else {
            patientVoiceId = 'ErXwobaYiN019PkySvjV';
          }
          
          const patientAudioUrl = await textToSpeech(
            patientResponse,
            patientVoiceId,
            'patient',
            patientStageDirections || []
          );
          
          const patientAudio = new Audio(patientAudioUrl);
          audioRef.current = patientAudio;
          setPlayingAudio(patientMessageId);
          setCurrentSpeaker('patient');
          setIsSpeaking(true);
          
          patientAudio.onended = () => {
            setIsSpeaking(false);
            setPlayingAudio(null);
            setCurrentSpeaker(null);
            URL.revokeObjectURL(patientAudioUrl);
          };
          
          patientAudio.onerror = (error) => {
            console.error('Patient audio playback error:', error);
            setIsSpeaking(false);
            setPlayingAudio(null);
            setCurrentSpeaker(null);
            URL.revokeObjectURL(patientAudioUrl);
          };
          
          await patientAudio.play();
        } catch (error) {
          console.error('Error playing patient audio:', error);
          setIsSpeaking(false);
          setPlayingAudio(null);
          setCurrentSpeaker(null);
        }
      }, 500);

      const dispatcherPrompt = `The EMT student just asked the patient: "${text}"
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

      const dispatcherResponse = await callGeminiAPI(dispatcherPrompt, DISPATCHER_PROMPT, []);

      setMessages(prev => [
        ...prev,
        {
          id: `dispatcher-${Date.now()}`,
          speaker: 'dispatcher',
          text: dispatcherResponse,
            timestamp: new Date(),
          stageDirections: []
        }
      ]);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to get response',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentScenario, isLoading, scenarioStarted, view, toast, callGeminiAPI, PATIENT_PROMPT, DISPATCHER_PROMPT, extractStageDirections, textToSpeech, selectPatientVoice]);

  const handleMicToggle = () => {
    // Microphone button for speech recognition
    // Click once to start recording, click again to stop and send to patient AI
    if (!scenarioStarted) {
      // If no scenario started, show a message to use "New Scenario" button instead
      toast({
        title: "Start Scenario First",
        description: "Click 'New Scenario' button to begin a training session",
      });
      return;
    }
    
    // Check if speech recognition is available
    if (!recognitionRef.current) {
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser doesn't support speech recognition. Please use the text input instead.",
        variant: "destructive"
      });
      return;
    }
    
    // Toggle listening state
    if (isListening) {
      // Stop listening and process transcript
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        // Transcript will be processed in onend handler
        toast({
          title: "Recording Stopped",
          description: "Processing your message...",
        });
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        setIsListening(false);
      }
    } else {
      // Start listening (continuous mode - keeps recording until you click again)
      try {
        transcriptBufferRef.current = ''; // Clear previous transcript
        recognitionRef.current.start();
        setIsListening(true);
        toast({
          title: "Recording...",
          description: "Speak your question or assessment. Click microphone again when finished.",
        });
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
        toast({
          title: "Error",
          description: "Failed to start speech recognition. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Listen for transcribed speech and send it as a message
  useEffect(() => {
    const handleSpeechTranscribed = (event: CustomEvent) => {
      const transcript = event.detail;
      if (transcript && scenarioStarted && !isLoading) {
        sendMessage(transcript);
      }
    };

    window.addEventListener('speechTranscribed', handleSpeechTranscribed as EventListener);
    return () => {
      window.removeEventListener('speechTranscribed', handleSpeechTranscribed as EventListener);
    };
  }, [scenarioStarted, isLoading]);

  const handleViewToggle = () => {
    setView((prev) => (prev === "visual" ? "transcript" : "visual"));
  };

  const handleNextScenario = () => {
    startNewScenario();
  };

  return (
    <div className="h-screen bg-background transition-colors duration-500 flex flex-col overflow-hidden">
      <header className="flex-shrink-0 glass border-b border-border/50 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-lg">
                <span className="text-2xl">🚑</span>
              </div>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                EMT Training Simulator
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleNextScenario}
                className="gradient-accent text-white shadow-lg hover:scale-105 transition-transform duration-300"
                size="sm"
                disabled={isLoading}
              >
                <SkipForward className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Scenario</span>
                <span className="sm:hidden">New</span>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {view === "visual" ? (
          <VisualView
            isSpeaking={isSpeaking}
            isListening={isListening}
            onMicToggle={handleMicToggle}
            characterName={isIncomingCall ? 'Incoming Call' : currentSpeaker === 'dispatcher' ? 'Dispatcher' : currentSpeaker === 'patient' ? 'Patient' : 'Patient'}
            characterRole={currentScenario?.type || "Emergency Scene"}
            isIncomingCall={isIncomingCall}
          />
        ) : (
          <TranscriptView
            messages={messages}
            isListening={isListening}
            onMicToggle={handleMicToggle}
            onSendMessage={sendMessage}
            userInput={userInput}
            setUserInput={setUserInput}
            isLoading={isLoading}
            scenarioStarted={scenarioStarted}
            onPlayAudio={playAudio}
            playingAudio={playingAudio}
            stopAudio={stopAudio}
            currentScenario={currentScenario}
          />
        )}
      </main>

      <div className="fixed bottom-4 right-4 z-50">
        <ViewToggle view={view} onToggle={handleViewToggle} />
      </div>
    </div>
  );
};

export default Index;
