import { AudioWaveform } from "./AudioWaveform";
import { MicrophoneButton } from "./MicrophoneButton";
import { Activity } from "lucide-react";

interface VisualViewProps {
  isSpeaking: boolean;
  isListening: boolean;
  onMicToggle: () => void;
  characterName: string;
  characterRole: string;
  isIncomingCall?: boolean;
  isTakingVitalSigns?: boolean;
}

export const VisualView = ({
  isSpeaking,
  isListening,
  onMicToggle,
  characterName,
  characterRole,
  isIncomingCall = false,
  isTakingVitalSigns = false,
}: VisualViewProps) => {
  return (
    <div className="relative flex flex-col items-center justify-center h-[calc(100vh-5rem)] p-4 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl w-full h-full justify-center">
        {/* Header Info */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">Training Session Active</span>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {characterName}
          </h2>
          <p className="text-base text-muted-foreground">
            {isIncomingCall ? (
              <span className="inline-flex items-center gap-2 text-accent animate-pulse">
                <span className="w-2 h-2 bg-accent rounded-full animate-ping"></span>
                📞 Incoming Call...
              </span>
            ) : isTakingVitalSigns ? (
              <span className="inline-flex items-center gap-2 text-primary animate-pulse">
                <span className="w-2 h-2 bg-primary rounded-full animate-ping"></span>
                📊 Taking vital signs...
              </span>
            ) : isSpeaking ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                {characterName} is speaking...
              </span>
            ) : (
              characterRole
            )}
          </p>
        </div>

        {/* Avatar Container */}
        <div className="relative flex-shrink-0">
          {/* Glow ring */}
          <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
            isSpeaking ? "shadow-glow scale-110" : "scale-100"
          }`} />
          
          {/* Main avatar */}
          <div className="relative w-64 h-64 rounded-full glass border-2 border-primary/30 overflow-hidden shadow-2xl">
            <div className="absolute inset-0 gradient-hero opacity-90" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-8xl">👤</div>
            </div>
            
            {/* Pulse rings when speaking */}
            {isSpeaking && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping" />
                <div className="absolute inset-0 rounded-full border-2 border-accent animate-ping" style={{ animationDelay: "0.3s" }} />
              </>
            )}
          </div>

          {/* Audio waveform */}
          {isSpeaking && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-full">
              <div className="glass rounded-2xl p-3 shadow-lg">
                <AudioWaveform isActive={isSpeaking} />
              </div>
            </div>
          )}
        </div>

        {/* Mic Controls */}
        <div className="flex flex-col items-center gap-4 flex-shrink-0">
          <MicrophoneButton isListening={isListening} onToggle={onMicToggle} />
          
          <div className="text-center space-y-1">
            <p className="text-base font-medium text-foreground">
              {isListening ? "🎤 Listening..." : "Tap microphone to respond"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isListening ? "Speak clearly into your device" : "Press to start recording"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
