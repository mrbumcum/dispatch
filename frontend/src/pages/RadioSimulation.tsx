import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Radio, Mic, MicOff, Play, Pause } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { LogoutButton } from "@/components/LogoutButton";
import { RadioSimulationAPI, type RadioCall as APIRadioCall } from "@/services/RadioSimulationAPI";
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
  id: string;
  unitNumber: string;
  startingAddress: string;
  incidentAddress: string;
  age: number;
  gender: "Male" | "Female";
  complaint: string;
  dispatchText: string;
}

interface CallResult {
  call: RadioCall;
  userResponse: string;
  feedback: string;
  score: number;
  timestamp: Date;
}

const RadioSimulation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
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

  // Initialize or resume session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Try to get active session first
        const activeSession = await RadioSimulationAPI.getActiveSession();
        if (activeSession) {
          setSessionId(activeSession.id);
          setCallCount(activeSession.total_calls || 0);
          setTotalScore(activeSession.average_score || 0);
          toast({
            title: "Session Resumed",
            description: "Continuing your training session",
          });
        } else {
          // Create new session
          const newSession = await RadioSimulationAPI.createSession();
          setSessionId(newSession.id);
          toast({
            title: "Session Started",
            description: "New training session created",
          });
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        toast({
          title: "Session Error",
          description: "Failed to create training session",
          variant: "destructive"
        });
      }
    };

    initializeSession();

    // Cleanup: Complete session on unmount
    return () => {
      if (sessionId && callResults.length > 0) {
        const averageScore = callResults.reduce((sum, r) => sum + r.score, 0) / callResults.length;
        RadioSimulationAPI.completeSession(sessionId, callResults.length, averageScore).catch(console.error);
      }
    };
  }, []); // Empty dependency - only run on mount/unmount

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

  // Generate call via backend API
  const generateCall = async (): Promise<RadioCall> => {
    if (!sessionId) {
      throw new Error('No active session');
    }
    return await RadioSimulationAPI.generateCall(sessionId);
  };

  // Get audio via backend API (with caching)
  const getAudio = async (text: string): Promise<string> => {
    const result = await RadioSimulationAPI.getAudio(text);
    return result.audioUrl;
  };

  // Play dispatcher call with dispatcher voice
  const playDispatcherCall = async (callParam?: RadioCall) => {
    if (!currentCall) return;
    const callToPlay = callParam ?? currentCall;
    if (!callToPlay) return;

    const dispatchTextLocal = callToPlay.dispatchText;

    // mark that dispatch is playing and not yet finished
    setDispatcherPlaying(true);
    setDispatcherFinished(false);
    try {
      // Get audio from backend (with caching)
      const audioUrl = prefetchedAudioUrl ?? await getAudio(dispatchTextLocal);
      // if we used the prefetched URL, clear the stored value so we don't reuse a stale blob
      if (prefetchedAudioUrl) setPrefetchedAudioUrl(null);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsSpeaking(true);

      // play first audio; after it ends, play a second time and then mark finished
      audio.onended = async () => {
        try {
          setIsSpeaking(false);
          // Don't revoke if from backend (it's a persistent URL)

          // small pause then play again
          await new Promise(resolve => setTimeout(resolve, 1000));

          const audioUrl2 = await getAudio(dispatchTextLocal);
          const audio2 = new Audio(audioUrl2);
          audioRef.current = audio2;
          setIsSpeaking(true);
          setDispatcherPlaying(true);

          audio2.onended = () => {
            setIsSpeaking(false);
            setDispatcherPlaying(false);
            setDispatcherFinished(true); // mark that dispatch finished and user may respond
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
  const dispatchText = currentCall?.dispatchText || '';

  // Call Gemini to assess response
  const assessResponse = async (call: RadioCall, response: string): Promise<{ feedback: string; score: number }> => {
    try {
      // Call backend API for assessment
      const result = await RadioSimulationAPI.assessResponse(
        call.id,
        response,
        {
          unitNumber: call.unitNumber,
          startingAddress: call.startingAddress,
          incidentAddress: call.incidentAddress,
          age: call.age,
          gender: call.gender,
          complaint: call.complaint,
        }
      );

      return {
        feedback: result.feedback,
        score: result.score
      };
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
  const startNewCall = async () => {
    if (!sessionId) {
      toast({
        title: "No session",
        description: "Please wait for session to initialize",
        variant: "destructive"
      });
      return;
    }

    // Stop and cleanup any previous audio/recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current = null;
    }

    // Clear any previously prefetched audio
    if (prefetchedAudioUrl) {
      setPrefetchedAudioUrl(null);
    }

    try {
      setIsPrefetchingAudio(true);
      // Generate call from backend (includes all call details + dispatchText)
      const newCall = await generateCall();
      
      // Set up new call but DO NOT auto-play. User must press Play Call to hear it.
      setCurrentCall(newCall);
      setCurrentLocation(newCall.startingAddress); // Use starting address as current location
      setUserResponse('');
      setRevealDispatch(false);
      setDispatcherPlaying(false);
      setDispatcherFinished(false);
      setCallCount(prev => prev + 1);
      setLastAssessment(null);
      transcriptBufferRef.current = '';

      // Prefetch audio for the new call
      try {
        const audioUrl = await getAudio(newCall.dispatchText);
        setPrefetchedAudioUrl(audioUrl);
      } catch (err) {
        console.debug('Prefetch audio failed:', err);
      } finally {
        setIsPrefetchingAudio(false);
      }

      // UX hint: tell user to press Play Call
      toast({
        title: 'New call ready',
        description: 'Press Play Call to hear the dispatch',
      });
    } catch (error) {
      console.error('Failed to generate call:', error);
      setIsPrefetchingAudio(false);
      toast({
        title: "Call Generation Failed",
        description: "Failed to generate new call. Please try again.",
        variant: "destructive"
      });
    }
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
              <LogoutButton/>
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