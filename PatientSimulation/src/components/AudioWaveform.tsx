import { useEffect, useState } from "react";

interface AudioWaveformProps {
  isActive: boolean;
}

export const AudioWaveform = ({ isActive }: AudioWaveformProps) => {
  const [bars] = useState(() => Array.from({ length: 40 }, (_, i) => i));

  return (
    <div className="flex items-center justify-center gap-[2px] h-16">
      {bars.map((bar) => (
        <div
          key={bar}
          className={`w-1 rounded-full transition-all duration-150 ${
            isActive
              ? "bg-gradient-to-t from-primary to-accent"
              : "bg-muted"
          }`}
          style={{
            height: isActive ? `${Math.random() * 50 + 10}px` : "6px",
            animation: isActive ? `wave ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate` : "none",
            animationDelay: `${bar * 0.02}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0% { height: 6px; }
          100% { height: ${50 + Math.random() * 20}px; }
        }
      `}</style>
    </div>
  );
};
