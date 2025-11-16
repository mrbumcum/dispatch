import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Radio, Mic, MicOff, Play, Pause } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { CONFIG } from "@/config";
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

interface RadioCall {
  unitNumber: string;
  address: string;
  age: string;
  gender: "Male" | "Female";
  complaint: string;
}

interface CallResult {
  call: RadioCall;
  userResponse: string;
  feedback: string;
  score: number;
  timestamp: Date;
}

const GEMINI_API_KEY = CONFIG?.GEMINI_API_KEY || '';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const ELEVENLABS_API_KEY = CONFIG?.ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

const RadioSimulation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [currentCall, setCurrentCall] = useState<RadioCall | null>(null);
  const [callResults, setCallResults] = useState<CallResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userResponse, setUserResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dispatcherPlaying, setDispatcherPlaying] = useState(false);
  const [callCount, setCallCount] = useState(0);
  const [currentLocation, setCurrentLocation] = useState('Station 1');
  const [lastAssessment, setLastAssessment] = useState<{ feedback: string; score: number } | null>(null);
  const [revealDispatch, setRevealDispatch] = useState(false);
  const [dispatcherFinished, setDispatcherFinished] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);
  const [prefetchedAudioUrl, setPrefetchedAudioUrl] = useState<string | null>(null);
  const [isPrefetchingAudio, setIsPrefetchingAudio] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptBufferRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  // Initialize speech recognition on mount (only once)
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionClass = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognitionClass() as SpeechRecognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
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

        const fullTranscript = (finalTranscript + interimTranscript).trim();
        if (fullTranscript) {
          transcriptBufferRef.current = fullTranscript;
          setUserResponse(fullTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        // Only show error toast for actual errors, not timeout
        if (event.error !== 'no-speech' && event.error !== 'aborted' && event.error !== 'network') {
          toast({
            title: "Speech Recognition Error",
            description: `Error: ${event.error}`,
            variant: "destructive"
          });
        }
      };

      recognition.onend = () => {
        // Use ref to check if we should keep listening
        if (isListeningRef.current) {
          // User is still listening, restart recognition
          try {
            recognition.start();
          } catch (error) {
            console.error('Error restarting speech recognition:', error);
            setIsListening(false);
            isListeningRef.current = false;
          }
        } else {
          // User stopped listening, send the transcript
          const finalTranscript = transcriptBufferRef.current.trim();
          if (finalTranscript) {
            const event = new CustomEvent('radioTranscribed', { detail: finalTranscript });
            window.dispatchEvent(event);
            transcriptBufferRef.current = '';
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []); // Empty dependency array - only initialize once on mount

  // Listen for transcribed speech
  useEffect(() => {
    const handleRadioTranscribed = (event: CustomEvent) => {
      const transcript = event.detail;
      if (transcript && currentCall && !isLoading) {
        // Stop listening when we get a final transcript
        isListeningRef.current = false;
        setIsListening(false);
        processUserResponse(transcript);
      }
    };

    window.addEventListener('radioTranscribed', handleRadioTranscribed as EventListener);
    return () => {
      window.removeEventListener('radioTranscribed', handleRadioTranscribed as EventListener);
    };
  }, [currentCall, isLoading]); // Remove processUserResponse from deps to avoid circular dependency

  // Generate random call
  const generateCall = (): RadioCall => {
    const addresses = [
      '123 Main Street',
      '456 Oak Avenue',
      '789 Elm Drive',
      '321 Pine Road',
      '654 Maple Lane',
      '987 Cedar Boulevard'
    ];

    const complaints = [
      'chest pain',
      'difficulty breathing',
      'severe headache',
      'abdominal pain',
      'altered mental status',
      'minor laceration',
      'unconscious patient',
      'fall from height'
    ];

    const unitNum = Math.floor(Math.random() * 20) + 1;
    const address = addresses[Math.floor(Math.random() * addresses.length)];
    const age = (Math.floor(Math.random() * 60) + 18).toString();
    const gender = Math.random() > 0.5 ? 'Male' : 'Female';
    const complaint = complaints[Math.floor(Math.random() * complaints.length)];

    return { unitNumber: `Unit ${unitNum}`, address, age, gender, complaint };
  };

  // Text to speech using ElevenLabs
  const textToSpeech = async (text: string, voiceId: string = '21m00Tcm4TlvDq8ikWAM'): Promise<string> => {
    try {
      if (!ELEVENLABS_API_KEY) {
        throw new Error('ElevenLabs API key not configured');
      }

      const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
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
        throw new Error(`TTS failed: ${response.status} ${errorText}`);
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Text to speech error:', error);
      throw error;
    }
  };

  // Play dispatcher call with dispatcher voice
  const playDispatcherCall = async (callParam?: RadioCall) => {
    if (!currentCall) return;
    const callToPlay = callParam ?? currentCall;
    if (!callToPlay) return;

    const dispatchTextLocal = `${callToPlay.unitNumber}, respond to ${callToPlay.address} for a ${callToPlay.age} year old ${callToPlay.gender} patient for a report of ${callToPlay.complaint}`;

    // mark that dispatch is playing and not yet finished
    setDispatcherPlaying(true);
    setDispatcherFinished(false);
    try {
      // Use dispatcher voice ID (professional, authoritative)
      const dispatcherVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Professional voice for dispatcher

      // If we prefetched audio for this call, use it to avoid network latency clipping the start.
      const audioUrl = prefetchedAudioUrl ?? await textToSpeech(dispatchTextLocal, dispatcherVoiceId);
      // if we used the prefetched URL, clear the stored value so we don't reuse a stale blob
      if (prefetchedAudioUrl) setPrefetchedAudioUrl(null);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsSpeaking(true);

      // play first audio; after it ends, play a second time and then mark finished
      audio.onended = async () => {
        try {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);

          // small pause then play again
          await new Promise(resolve => setTimeout(resolve, 1000));

          const audioUrl2 = await textToSpeech(dispatchTextLocal, dispatcherVoiceId);
          const audio2 = new Audio(audioUrl2);
          audioRef.current = audio2;
          setIsSpeaking(true);
          setDispatcherPlaying(true);

          audio2.onended = () => {
            setIsSpeaking(false);
            setDispatcherPlaying(false);
            setDispatcherFinished(true); // mark that dispatch finished and user may respond
            URL.revokeObjectURL(audioUrl2);
          };

          await audio2.play();
        } catch (error) {
          console.error('Error replaying call:', error);
          setDispatcherPlaying(false);
          setDispatcherFinished(true);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing dispatcher call:', error);
      setDispatcherPlaying(false);
      setDispatcherFinished(true);
      toast({
        title: "Audio Error",
        description: error instanceof Error ? error.message : 'Failed to play dispatcher call',
        variant: "destructive"
      });
    }
  };

  // Precompute dispatch text for UI (hidden until reveal)
  const dispatchText = currentCall
    ? `${currentCall.unitNumber}, respond to ${currentCall.address} for a ${currentCall.age} year old ${currentCall.gender} patient for a report of ${currentCall.complaint}`
    : '';

  // Call Gemini to assess response
  const assessResponse = async (call: RadioCall, response: string): Promise<{ feedback: string; score: number }> => {
    try {
      if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
      }

      const expectedFormat = `"${call.unitNumber} responding emergently/non-emergently from [current location] to ${call.address} for a ${call.age} year old ${call.gender} patient with a report of ${call.complaint}"`;

      const assessmentPrompt = `You are an EMT radio protocol instructor evaluating a student's radio response to a dispatcher call.

DISPATCHER CALL:
"${call.unitNumber} respond to ${call.address} for a ${call.age} year old ${call.gender} patient for a report of ${call.complaint}"

STUDENT'S CURRENT LOCATION:
"${currentLocation}"

STUDENT RESPONSE:
"${response}"

EXPECTED RESPONSE FORMAT (approximate):
${expectedFormat}

Evaluate the student's response on these criteria:
1. Did they acknowledge their unit number correctly? (${call.unitNumber})
2. Did they include "responding" status (emergently or non-emergently)?
3. Did they mention their current location or starting point? (Should be "${currentLocation}" or similar)
4. Did they reiterate the destination/street address correctly? (${call.address})
5. Did they reiterate the patient information correctly? (${call.age} year old ${call.gender} patient)
6. Did they reiterate the general complaint/reason correctly? Do not require verbatim and be lenient of different expressions of the same complaint. For example, altered mental status and unconcious patient can be considered the same. (${call.complaint})
7. Did they follow proper radio protocol (professional, concise, clear)?

Provide ONLY a JSON response in this exact format (no markdown, no code blocks):
{
  "feedback": "Brief 1-2 sentence feedback on their performance",
  "score": <number from 0-100 based on how well they followed protocol and reiterated information>
}

Score guidelines:
- 90-100: Excellent - perfect protocol, all info reiterated correctly including location
- 70-89: Good - proper format, minor issues with info reiteration
- 50-69: Adequate - recognized most info, but protocol could be better or missing location
- 0-49: Needs improvement - significant protocol or information errors`;

      const messages = [
        {
          role: 'user',
          parts: [{ text: assessmentPrompt }]
        }
      ];

      const resp = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${resp.status}`);
      }

      const data = await resp.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          feedback: result.feedback || 'No feedback',
          score: result.score || 0
        };
      }

      throw new Error('Invalid response format from Gemini');
    } catch (error) {
      console.error('Assessment error:', error);
      throw error;
    }
  };

  // Process user response
  const processUserResponse = async (response: string) => {
    if (!currentCall || isLoading) return;

    setIsLoading(true);
    setUserResponse(response);

    try {
      const { feedback, score } = await assessResponse(currentCall, response);

      const result: CallResult = {
        call: currentCall,
        userResponse: response,
        feedback,
        score,
        timestamp: new Date()
      };

      setCallResults(prev => [...prev, result]);
      setTotalScore(prev => prev + score);
      setLastAssessment({ feedback, score });

      toast({
        title: "Response Assessed",
        description: `Score: ${score}/100`,
      });
    } catch (error) {
      console.error('Error processing response:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to assess response',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Start new call
  const startNewCall = () => {
    const newCall = generateCall();
    const locations = ['Station 1', 'Station 2', 'Station 3', 'Highway 101', 'Downtown Station'];
    const newLocation = locations[Math.floor(Math.random() * locations.length)];
    
    // Stop and cleanup any previous audio/recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current = null;
    }

    // Set up new call but DO NOT auto-play. User must press Play Call to hear it.
    setCurrentCall(newCall);
    setCurrentLocation(newLocation);
    setUserResponse('');
    setRevealDispatch(false);
    setDispatcherPlaying(false);
    setDispatcherFinished(false);
    setCallCount(prev => prev + 1);
    setLastAssessment(null);
    transcriptBufferRef.current = '';
    // Clear any previously prefetched audio and start prefetch for the new call
    try {
      if (prefetchedAudioUrl) {
        try { URL.revokeObjectURL(prefetchedAudioUrl); } catch {}
        setPrefetchedAudioUrl(null);
      }

      // Kick off background prefetch of dispatcher audio so Play Call starts immediately
      const dispatcherVoiceId = '21m00Tcm4TlvDq8ikWAM';
      const dispatchTextLocal = `${newCall.unitNumber}, respond to ${newCall.address} for a ${newCall.age} year old ${newCall.gender} patient for a report of ${newCall.complaint}`;
      setIsPrefetchingAudio(true);
      textToSpeech(dispatchTextLocal, dispatcherVoiceId)
        .then(url => {
          setPrefetchedAudioUrl(url);
        })
        .catch(err => {
          console.debug('Prefetch audio failed:', err);
        })
        .finally(() => setIsPrefetchingAudio(false));
    } catch (e) {
      // ignore prefetch errors
    }
    // UX hint: tell user to press Play Call
    toast({
      title: 'New call ready',
      description: 'Press Play Call to hear the dispatch',
    });
  };

  // Mic toggle
  const handleMicToggle = () => {
    if (!currentCall) {
      toast({
        title: "Start a call first",
        description: "Click 'Start Training' to begin",
      });
      return;
    }

    // Do not allow responding until dispatch audio has finished
    if (!dispatcherFinished) {
      toast({
        title: "Wait for dispatcher",
        description: "Please wait until the dispatcher finishes the call before responding",
      });
      return;
    }

    if (isListening) {
      // Stop listening
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      toast({
        title: "Recording Stopped",
        description: "Processing your response...",
      });
    } else {
      // Start listening
      if (!recognitionRef.current) {
        toast({
          title: "Microphone Error",
          description: "Speech recognition not available in your browser",
          variant: "destructive"
        });
        return;
      }

      // Clear previous transcript
      transcriptBufferRef.current = '';
      setUserResponse('');
      
      try {
        isListeningRef.current = true;
        setIsListening(true);
        recognitionRef.current.start();
        toast({
          title: "Recording...",
          description: "Speak your response now",
        });
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        isListeningRef.current = false;
        setIsListening(false);
        toast({
          title: "Error",
          description: "Failed to start microphone. Please check permissions.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <header className="glass border-b border-border/50 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-lg">
                <Radio className="w-6 h-6" />
              </div>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Radio Simulation
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                size="sm"
                className="hover:scale-105 transition-transform duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Score Card */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Calls Completed</p>
                  <p className="text-2xl font-bold">{callCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Score</p>
                  <p className="text-2xl font-bold">{callCount > 0 ? Math.round(totalScore / callCount) : 0}/100</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Protocol reference (toggled) */}
          <Card className="glass border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Protocol</CardTitle>
                <div>
                  <Button size="sm" variant="outline" onClick={() => setShowProtocol(p => !p)}>
                    {showProtocol ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showProtocol && (
              <CardContent>
                <p className="text-sm font-mono">[Unit #] respond [emergently/non-emergently] from [current location] to [incidient location] for a [p.t. info] for a report of [complaint].</p>
              </CardContent>
            )}
          </Card>

          {/* Current Call */}
          {currentCall ? (
            <Card className="glass border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <CardTitle className="text-lg">📡 Incoming Dispatch</CardTitle>
                    {currentCall && (
                      <CardDescription className="mt-1">
                        <span className="text-xs text-muted-foreground">Unit / Location: </span>
                        <span className="font-mono">{currentCall.unitNumber} — {currentLocation}</span>
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Audio Playing Indicator */}
                {dispatcherPlaying && (
                  <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-1 h-6 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                      <div className="w-1 h-6 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1 h-6 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      <div className="w-1 h-6 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    </div>
                    <p className="text-sm font-semibold text-primary">Dispatcher calling...</p>
                  </div>
                )}

                {/* Dispatcher Controls */}
                <div className="flex gap-2 items-center">
                  <Button
                    onClick={() => playDispatcherCall(currentCall)}
                    variant="outline"
                    disabled={dispatcherPlaying || isLoading}
                  >
                    {dispatcherPlaying ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Listening...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Play Call
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setRevealDispatch(prev => !prev)}
                    variant="outline"
                    disabled={isLoading || (!userResponse?.trim() && !lastAssessment)}
                  >
                    {revealDispatch ? 'Hide Dispatch' : 'Reveal Answer'}
                  </Button>

                  <p className="text-xs text-muted-foreground self-center">
                    {dispatcherPlaying ? '(Will repeat)' : (!dispatcherFinished ? '(New call ready — press Play Call)' : '(Click to hear dispatch)')}
                  </p>
                </div>

                {/* Mic Button */}
                <Button
                  onClick={handleMicToggle}
                  className={isListening ? 'bg-red-500 hover:bg-red-600' : ''}
                  disabled={isLoading || !dispatcherFinished}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Respond
                    </>
                  )}
                </Button>

                {/* User Response */}
                {userResponse && (
                  <div className="bg-muted/40 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Your Response:</p>
                    <p className="text-sm font-mono">{userResponse}</p>
                  </div>
                )}

                {/* Revealed Dispatch Text */}
                {revealDispatch && dispatchText && (
                  <div className="bg-muted/20 p-4 rounded-lg mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Dispatch Text (answer):</p>
                    <p className="text-sm font-mono">{dispatchText}</p>
                  </div>
                )}

                {/* Assessment Results */}
                {lastAssessment && (
                  <div className={`p-4 rounded-lg border-l-4 ${lastAssessment.score >= 70 ? 'bg-green-500/10 border-green-500' : lastAssessment.score >= 50 ? 'bg-yellow-500/10 border-yellow-500' : 'bg-red-500/10 border-red-500'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-semibold">Assessment Feedback</p>
                      <span className={`text-2xl font-bold ${lastAssessment.score >= 70 ? 'text-green-600 dark:text-green-400' : lastAssessment.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {lastAssessment.score}/100
                      </span>
                    </div>
                    <p className="text-sm">{lastAssessment.feedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="glass border-border/50">
              <CardContent className="py-12 text-center">
                <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground mb-4">Ready to start radio simulation?</p>
                <Button onClick={startNewCall} size="lg">
                  Start Training
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent Results */}
          {callResults.length > 0 && (
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Recent Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[...callResults].reverse().map((result, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 p-3 bg-card/50 rounded-lg hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-sm">
                          {result.call.unitNumber.replace('Unit ', 'U')}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{result.call.unitNumber} <span className="text-xs text-muted-foreground ml-2">{new Date(result.timestamp).toLocaleString()}</span></p>
                            <p className="text-xs text-muted-foreground truncate">{result.call.age}yo {result.call.gender} — {result.call.complaint}</p>
                          </div>

                          <div className="ml-3 flex-shrink-0">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${result.score >= 70 ? 'bg-green-600 text-white' : result.score >= 50 ? 'bg-yellow-500 text-white' : 'bg-red-600 text-white'}`}>
                              {result.score}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm mt-2 text-muted-foreground truncate">📢 Your response: {result.userResponse}</p>
                        <p className="text-sm mt-1 text-muted-foreground italic truncate">💭 {result.feedback}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Start Button */}
          {currentCall && (
            <Button
              onClick={startNewCall}
              variant="outline"
              className="w-full"
              disabled={isLoading || dispatcherPlaying}
            >
              Next Call
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default RadioSimulation;

