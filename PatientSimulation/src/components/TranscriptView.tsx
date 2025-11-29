import { MicrophoneButton } from "./MicrophoneButton";
import { ScrollArea } from "./ui/scroll-area";
import { User, UserCircle, Radio, Stethoscope, Play, Pause } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useEffect, useRef } from "react";

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

interface TranscriptViewProps {
  messages: Message[];
  isListening: boolean;
  onMicToggle: () => void;
  onSendMessage: (text: string) => void;
  userInput: string;
  setUserInput: (text: string) => void;
  isLoading: boolean;
  scenarioStarted: boolean;
  onPlayAudio: (messageId: string, text: string, speaker: string, stageDirections?: string[]) => void;
  playingAudio: string | null;
  stopAudio: () => void;
  currentScenario: Scenario | null;
}

export const TranscriptView = ({
  messages,
  isListening,
  onMicToggle,
  onSendMessage,
  userInput,
  setUserInput,
  isLoading,
  scenarioStarted,
  onPlayAudio,
  playingAudio,
  stopAudio,
  currentScenario,
}: TranscriptViewProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatMessage = (text: string): string => {
    if (!text) return '';
    
    // Remove stage directions from display text
    let displayText = text.replace(/\([^)]+\)/g, '').trim();
    
    // Format markdown
    displayText = displayText
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
    
    return displayText;
  };

  const handleSend = () => {
    if (userInput.trim() && !isLoading) {
      onSendMessage(userInput);
      setUserInput('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case 'dispatcher':
        return <Radio className="w-5 h-5 text-white" />;
      case 'patient':
        return <Stethoscope className="w-5 h-5 text-white" />;
      case 'user':
        return <User className="w-5 h-5 text-white" />;
      default:
        return <UserCircle className="w-5 h-5 text-white" />;
    }
  };

  const getSpeakerLabel = (speaker: string) => {
    switch (speaker) {
      case 'dispatcher':
        return 'Dispatcher';
      case 'patient':
        return 'Patient';
      case 'user':
        return 'You';
      case 'system':
        return 'System';
      default:
        return 'Unknown';
    }
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'dispatcher':
        return {
          gradient: 'gradient-accent',
          border: 'border-accent/30',
          text: 'text-accent'
        };
      case 'patient':
        return {
          gradient: 'gradient-primary',
          border: 'border-primary/30',
          text: 'text-primary'
        };
      case 'user':
        return {
          gradient: 'gradient-primary',
          border: 'border-primary/30',
          text: 'text-primary'
        };
      default:
        return {
          gradient: 'gradient-hero',
          border: 'border-border/30',
          text: 'text-foreground'
        };
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-4xl mx-auto p-4 overflow-hidden">
      {/* Messages Area */}
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-4 pb-4">
          {messages.length === 0 && !scenarioStarted ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
              <div className="w-16 h-16 rounded-full glass flex items-center justify-center shadow-lg">
                <UserCircle className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Welcome to EMT Simulation</h3>
                <p className="text-sm text-muted-foreground">Click "New Scenario" to start a training session</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const colors = getSpeakerColor(message.speaker);
              const isSystem = message.speaker === 'system';
              
              if (isSystem) {
                return (
                  <div
                    key={message.id}
                    className="glass rounded-2xl p-4 border border-border/30 text-center animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <p className="text-sm text-foreground whitespace-pre-line">{message.text}</p>
                  </div>
                );
              }

              const isUser = message.speaker === 'user';
              const canPlayAudio = (message.speaker === 'dispatcher' || message.speaker === 'patient') && message.text.trim().length > 0;
              const isPlaying = playingAudio === message.id;

              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  } animate-fade-in`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${colors.gradient}`}>
                    {getSpeakerIcon(message.speaker)}
                  </div>

                  {/* Message Bubble */}
                  <div className={`flex flex-col gap-1 max-w-[70%] ${
                    isUser ? "items-end" : "items-start"
                  }`}>
                    <div className={`glass rounded-2xl px-4 py-2 shadow-lg border ${colors.border} w-full`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className={`text-xs font-semibold ${colors.text}`}>
                          {getSpeakerLabel(message.speaker)}
                        </div>
                        {canPlayAudio && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              if (isPlaying) {
                                stopAudio();
                              } else {
                                onPlayAudio(message.id, message.text, message.speaker, message.stageDirections || []);
                              }
                            }}
                          >
                            {isPlaying ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {message.stageDirections && message.stageDirections.length > 0 && (
                        <div className="mb-2 pb-2 border-b border-border/20">
                          <em className="text-xs text-muted-foreground">
                            💬 {message.stageDirections.join(' • ')}
                          </em>
                        </div>
                      )}
                      
                      <div 
                        className="text-sm text-foreground leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground px-2">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Controls */}
      <div className="flex-shrink-0 mt-4 pt-4 border-t border-border/50">
        <div className="glass rounded-3xl p-4 shadow-xl">
          {!scenarioStarted ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <Button
                onClick={() => onMicToggle()}
                className="gradient-accent text-white shadow-lg hover:scale-105 transition-transform duration-300"
                size="lg"
              >
                Start New Scenario
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Begin a new EMT training scenario
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Input
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question or assessment..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!userInput.trim() || isLoading}
                className="gradient-accent text-white shadow-lg"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
