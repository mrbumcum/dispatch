import { FileText, User } from "lucide-react";
import { Button } from "./ui/button";

interface ViewToggleProps {
  view: "visual" | "transcript";
  onToggle: () => void;
}

export const ViewToggle = ({ view, onToggle }: ViewToggleProps) => {
  return (
    <div className="flex gap-1 p-1 glass rounded-full shadow-lg">
      <Button
        variant={view === "visual" ? "default" : "ghost"}
        size="sm"
        onClick={() => view !== "visual" && onToggle()}
        className={`rounded-full transition-all duration-300 ${
          view === "visual" 
            ? "gradient-primary text-white shadow-lg" 
            : "hover:bg-muted/50"
        }`}
      >
        <User className="w-4 h-4 mr-2" />
        Visual
      </Button>
      <Button
        variant={view === "transcript" ? "default" : "ghost"}
        size="sm"
        onClick={() => view !== "transcript" && onToggle()}
        className={`rounded-full transition-all duration-300 ${
          view === "transcript" 
            ? "gradient-primary text-white shadow-lg" 
            : "hover:bg-muted/50"
        }`}
      >
        <FileText className="w-4 h-4 mr-2" />
        Transcript
      </Button>
    </div>
  );
};
