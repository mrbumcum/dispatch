import { Mic, MicOff } from "lucide-react";
import { Button } from "./ui/button";

interface MicrophoneButtonProps {
  isListening: boolean;
  onToggle: () => void;
}

export const MicrophoneButton = ({ isListening, onToggle }: MicrophoneButtonProps) => {
  return (
    <Button
      onClick={onToggle}
      variant="ghost"
      className={`relative rounded-full w-28 h-28 transition-all duration-300 glass shadow-lg ${
        isListening
          ? "bg-primary/20 hover:bg-primary/30 border-2 border-primary/50 scale-110 shadow-primary/30"
          : "bg-primary/15 hover:bg-primary/25 border-2 border-primary/40 shadow-primary/20"
      }`}
    >
      {isListening ? (
        <div className="flex flex-col items-center gap-2">
          <MicOff className="w-10 h-10 text-primary" />
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full"
                style={{ 
                  height: '8px',
                  animation: `pulse 0.6s ease-in-out infinite`,
                  animationDelay: `${i * 0.15}s` 
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <Mic className="w-10 h-10 text-primary" />
      )}
    </Button>
  );
};
