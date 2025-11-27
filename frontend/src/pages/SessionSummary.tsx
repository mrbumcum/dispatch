import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, FileText, Award, TrendingUp, Volume2, VolumeX } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CONFIG } from "@/config";

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
}

interface ScenarioSession {
  scenario: Scenario;
  messages: Message[];
  startTime: Date;
  endTime: Date;
  elapsedTime: number;
}

interface ScenarioGrade {
  grade: string;
  score: number;
  feedback: string;
}

const GEMINI_API_KEY = CONFIG?.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const ELEVENLABS_API_KEY = CONFIG?.ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

const SessionSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Deserialize dates from location state
  const rawScenarios = location.state?.scenarios || [];
  const deserializedScenarios: ScenarioSession[] = rawScenarios.map((s: any) => ({
    scenario: s.scenario,
    messages: s.messages.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    })),
    startTime: new Date(s.startTime),
    endTime: new Date(s.endTime),
    elapsedTime: s.elapsedTime
  }));
  
  const [scenarios, setScenarios] = useState<ScenarioSession[]>(deserializedScenarios);
  const [grades, setGrades] = useState<Map<number, ScenarioGrade>>(new Map());
  const [isGrading, setIsGrading] = useState(false);
  const [overallGrade, setOverallGrade] = useState<{ grade: string; score: number } | null>(null);
  const [playingFeedbackIndex, setPlayingFeedbackIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const callGeminiAPI = async (prompt: string): Promise<string> => {
    try {
      const response = await fetch(GEMINI_API_URL, {
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
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  };

  // Remove stage directions from text (exact same as PatientSimulation.tsx line 620-622)
  const removeStageDirections = (text: string): string => {
    return text.replace(/\([^)]+\)/g, '').trim();
  };

  // Get voice settings from stage directions (exact same as PatientSimulation.tsx line 1178-1201)
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

  // Convert text to speech using ElevenLabs (exact same implementation as PatientSimulation)
  const textToSpeech = async (text: string, voiceId: string = '21m00Tcm4TlvDq8ikWAM', voiceType: string = 'dispatcher', stageDirections: string[] = []): Promise<string | null> => {
    try {
      if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === '') {
        console.warn('ElevenLabs API key is not configured, skipping audio generation');
        return null;
      }

      if (!text || text.trim() === '') {
        console.warn('No text to convert to speech');
        return null;
      }

      // Clean text for speech (exact same cleaning as PatientSimulation)
      const cleanText = removeStageDirections(text)
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText || cleanText.length === 0) {
        console.warn('No text to convert to speech after cleaning');
        return null;
      }

      // Use dispatcher voice settings (exact same as PatientSimulation.tsx)
      const baseVoiceSettings = voiceType === 'dispatcher'
        ? {
            // Dispatcher voice settings (exact match from PatientSimulation.tsx line 1293-1298)
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true
          }
        : {
            // Default settings for other voices
            stability: 0.35,
            similarity_boost: 0.7,
            style: 0.6,
            use_speaker_boost: true
          };

      // Apply stage directions to voice settings (exact same as PatientSimulation.tsx line 1300)
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
          model_id: 'eleven_turbo_v2_5', // Exact same model as PatientSimulation
          voice_settings: voiceSettings
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        // If quota exceeded or other errors, return null gracefully
        if (response.status === 401 || response.status === 429) {
          console.warn('ElevenLabs API quota exceeded or unauthorized, skipping audio');
          return null;
        }
        return null;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      return audioUrl;
    } catch (error) {
      console.error('Error converting text to speech:', error);
      return null;
    }
  };

  const gradeScenario = async (scenarioSession: ScenarioSession, index: number): Promise<ScenarioGrade> => {
    const dispatcherMessages = scenarioSession.messages.filter(m => m.speaker === 'dispatcher');
    const userMessages = scenarioSession.messages.filter(m => m.speaker === 'user');
    const patientMessages = scenarioSession.messages.filter(m => m.speaker === 'patient');
    
    const dispatcherFeedback = dispatcherMessages.map(m => m.text).join('\n');
    const userQuestions = userMessages.map(m => m.text).join('\n');
    const conversation = scenarioSession.messages
      .map(m => `${m.speaker.toUpperCase()}: ${m.text}`)
      .join('\n\n');

    const gradingPrompt = `You are an expert EMT instructor evaluating a student's performance in a training scenario.

Scenario Details:
- Type: ${scenarioSession.scenario.type}
- Description: ${scenarioSession.scenario.description}
- Learning Objective: ${scenarioSession.scenario.question}
- Correct Answer: ${scenarioSession.scenario.answer}

Student's Questions/Interactions:
${userQuestions}

Dispatcher Feedback Throughout Scenario:
${dispatcherFeedback}

Full Conversation Transcript:
${conversation}

Based on the dispatcher's feedback and the student's performance, evaluate the student's performance and provide:
1. A letter grade (A, B, C, D, or F)
2. A numerical score (0-100)
3. CONCISE feedback (2-3 sentences maximum) explaining the grade

IMPORTANT: 
- Keep feedback brief and to the point. Focus on the most critical strengths or weaknesses. Maximum 3 sentences.
- Write the feedback in SECOND PERSON, speaking directly to the student using "you" and "your". For example: "You demonstrated excellent assessment skills. Your questions were thorough and followed proper protocols. Well done!"

Respond in the following JSON format (no markdown, just valid JSON):
{
  "grade": "A",
  "score": 95,
  "feedback": "You demonstrated excellent assessment skills. Your questions were thorough and followed proper protocols. Well done!"
}

Be fair but concise. Consider:
- Quality of questions asked
- Adherence to EMT protocols
- Response to dispatcher feedback
- Overall clinical reasoning
- Whether they reached the learning objective`;

    try {
      const response = await callGeminiAPI(gradingPrompt);
      let jsonString = response.trim();
      jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const gradeData = JSON.parse(jsonMatch[0]);
        return {
          grade: gradeData.grade || 'N/A',
          score: gradeData.score || 0,
          feedback: gradeData.feedback || 'No feedback available'
        };
      }
    } catch (error) {
      console.error('Error grading scenario:', error);
    }
    
    return {
      grade: 'N/A',
      score: 0,
      feedback: 'Unable to generate grade. Please review manually.'
    };
  };

  const calculateOverallGrade = (grades: Map<number, ScenarioGrade>): { grade: string; score: number } => {
    if (grades.size === 0) {
      return { grade: 'N/A', score: 0 };
    }

    const scores = Array.from(grades.values()).map(g => g.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    let letterGrade = 'F';
    if (averageScore >= 90) letterGrade = 'A';
    else if (averageScore >= 80) letterGrade = 'B';
    else if (averageScore >= 70) letterGrade = 'C';
    else if (averageScore >= 60) letterGrade = 'D';

    return {
      grade: letterGrade,
      score: Math.round(averageScore)
    };
  };

  useEffect(() => {
    if (scenarios.length === 0) {
      navigate('/patient-simulation');
      return;
    }

    const gradeAllScenarios = async () => {
      setIsGrading(true);
      const newGrades = new Map<number, ScenarioGrade>();

      for (let i = 0; i < scenarios.length; i++) {
        const grade = await gradeScenario(scenarios[i], i);
        newGrades.set(i, grade);
        setGrades(new Map(newGrades));
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const overall = calculateOverallGrade(newGrades);
      setOverallGrade(overall);
      setIsGrading(false);
    };

    gradeAllScenarios();

    // Cleanup: stop audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current = null;
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return 'text-green-500';
      case 'B': return 'text-blue-500';
      case 'C': return 'text-yellow-500';
      case 'D': return 'text-orange-500';
      case 'F': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getGradeBgColor = (grade: string): string => {
    switch (grade) {
      case 'A': return 'bg-green-500/10 border-green-500/30';
      case 'B': return 'bg-blue-500/10 border-blue-500/30';
      case 'C': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'D': return 'bg-orange-500/10 border-orange-500/30';
      case 'F': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-muted/30 border-border/30';
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <header className="glass border-b border-border/50 z-50 sticky top-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-lg">
                <span className="text-2xl">🚑</span>
              </div>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Session Summary
              </h1>
            </div>
            <Button
              onClick={() => navigate('/patient-simulation')}
              variant="outline"
              size="sm"
              className="hover:scale-105 transition-transform duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Simulation</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Overall Grade Card */}
        {overallGrade && (
          <Card className="mb-6 glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className={`text-6xl font-bold ${getGradeColor(overallGrade.grade)}`}>
                  {overallGrade.grade}
                </div>
                <div>
                  <div className="text-2xl font-semibold text-foreground">
                    {overallGrade.score}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Average across {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isGrading && (
          <Card className="mb-6 glass border-border/50">
            <CardContent className="py-8 text-center">
              <div className="animate-pulse">
                <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">Grading scenarios...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {grades.size} of {scenarios.length} completed
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scenario Cards */}
        <div className="space-y-6">
          {scenarios.map((scenarioSession, index) => {
            const grade = grades.get(index);
            const dispatcherMessages = scenarioSession.messages.filter(m => m.speaker === 'dispatcher');
            
            return (
              <Card key={index} className="glass border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        Scenario {index + 1}: {scenarioSession.scenario.type}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {scenarioSession.scenario.description}
                      </CardDescription>
                    </div>
                    {grade && (
                      <div className={`ml-4 px-4 py-2 rounded-lg border ${getGradeBgColor(grade.grade)}`}>
                        <div className={`text-3xl font-bold ${getGradeColor(grade.grade)}`}>
                          {grade.grade}
                        </div>
                        <div className="text-sm font-semibold text-foreground text-center">
                          {grade.score}%
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scenario Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{formatTime(scenarioSession.elapsedTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Messages:</span>
                      <span className="font-medium">{scenarioSession.messages.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Learning Objective:</span>
                      <span className="font-medium">{scenarioSession.scenario.question}</span>
                    </div>
                  </div>

                  {/* Dispatcher Feedback */}
                  {dispatcherMessages.length > 0 && (
                    <div className="p-5 rounded-lg bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/20 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg text-foreground flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          Dispatcher Feedback
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (playingFeedbackIndex === index) {
                              // Stop speaking
                              if (audioRef.current) {
                                audioRef.current.pause();
                                audioRef.current.currentTime = 0;
                                if (audioRef.current.src) {
                                  URL.revokeObjectURL(audioRef.current.src);
                                }
                                audioRef.current = null;
                              }
                              setPlayingFeedbackIndex(null);
                            } else {
                              // Stop any currently playing audio
                              if (audioRef.current) {
                                audioRef.current.pause();
                                audioRef.current.currentTime = 0;
                                if (audioRef.current.src) {
                                  URL.revokeObjectURL(audioRef.current.src);
                                }
                                audioRef.current = null;
                              }
                              setPlayingFeedbackIndex(null);

                              // Combine all dispatcher messages (preserve original text structure)
                              // Process each message individually to preserve stage directions, then combine
                              const dispatcherTexts = dispatcherMessages.map(m => m.text);
                              const dispatcherText = dispatcherTexts.join(' ');
                              
                              // Collect all stage directions from dispatcher messages
                              const allStageDirections = dispatcherMessages
                                .flatMap(m => m.stageDirections || [])
                                .filter((dir, idx, arr) => arr.indexOf(dir) === idx); // Remove duplicates

                              // Generate and play audio using ElevenLabs with dispatcher voice
                              // Use dispatcher voice ID: 21m00Tcm4TlvDq8ikWAM
                              // Pass 'dispatcher' as voiceType and stageDirections to match PatientSimulation exactly
                              const audioUrl = await textToSpeech(dispatcherText, '21m00Tcm4TlvDq8ikWAM', 'dispatcher', allStageDirections);
                              
                              if (audioUrl) {
                                const audio = new Audio(audioUrl);
                                audioRef.current = audio;
                                
                                audio.onended = () => {
                                  URL.revokeObjectURL(audioUrl);
                                  setPlayingFeedbackIndex(null);
                                  audioRef.current = null;
                                };
                                
                                audio.onerror = () => {
                                  console.error('Error playing dispatcher feedback audio');
                                  URL.revokeObjectURL(audioUrl);
                                  setPlayingFeedbackIndex(null);
                                  audioRef.current = null;
                                };
                                
                                await audio.play();
                                setPlayingFeedbackIndex(index);
                              } else {
                                // Fallback to Web Speech API if ElevenLabs fails
                                const utterance = new SpeechSynthesisUtterance(dispatcherText);
                                utterance.rate = 0.9;
                                utterance.pitch = 1;
                                utterance.volume = 1;
                                utterance.onend = () => {
                                  setPlayingFeedbackIndex(null);
                                };
                                utterance.onerror = () => {
                                  setPlayingFeedbackIndex(null);
                                };
                                window.speechSynthesis.speak(utterance);
                                setPlayingFeedbackIndex(index);
                              }
                            }
                          }}
                          className="h-8 w-8 p-0"
                        >
                          {playingFeedbackIndex === index ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <ScrollArea className="h-48 rounded-lg border border-border/50 p-3 bg-muted/20">
                        {dispatcherMessages.map((msg, idx) => (
                          <div key={idx} className="mb-3 last:mb-0">
                            <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}

                  {/* Transcript */}
                  <details className="group">
                    <summary className="cursor-pointer font-semibold text-foreground hover:text-primary transition-colors">
                      View Full Transcript ({scenarioSession.messages.length} messages)
                    </summary>
                    <ScrollArea className="h-64 mt-4 rounded-lg border border-border/50 p-4 bg-muted/20">
                      <div className="space-y-3">
                        {scenarioSession.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-3 rounded-lg ${
                              message.speaker === 'user'
                                ? 'bg-primary/10 border border-primary/20 ml-8'
                                : message.speaker === 'dispatcher'
                                ? 'bg-blue-500/10 border border-blue-500/20 mr-8'
                                : message.speaker === 'patient'
                                ? 'bg-accent/10 border border-accent/20'
                                : 'bg-muted/30 border border-border/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-foreground uppercase">
                                {message.speaker}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">{message.text}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {scenarios.length === 0 && (
          <Card className="glass border-border/50">
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground">No scenarios completed in this session.</p>
              <Button
                onClick={() => navigate('/patient-simulation')}
                className="mt-4"
                variant="outline"
              >
                Start a Scenario
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SessionSummary;

