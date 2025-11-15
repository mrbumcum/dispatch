import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Droplet, Thermometer, Gauge, Activity, Eye, AlertCircle } from "lucide-react";

interface VitalSign {
  name: string;
  value: string | null;
  unit: string;
  icon: React.ReactNode;
  normalRange?: string;
}

interface Intervention {
  question: string;
  option1: string;
  option2: string;
  correctAnswer: 1 | 2;
  vitalSignToUpdate: 'bloodPressure' | 'heartRate' | 'oxygenSaturation' | 'temperature' | 'respiratoryRate' | 'glucose';
  newValue: string;
}

interface VitalSignsProps {
  vitals: {
    bloodPressure?: string | null;
    heartRate?: string | null;
    oxygenSaturation?: string | null;
    temperature?: string | null;
    respiratoryRate?: string | null;
    glucose?: string | null;
  };
  intervention?: Intervention | null;
  onInterventionSelect?: (selectedOption: 1 | 2) => void;
}

const vitalSignsList: Omit<VitalSign, 'value'>[] = [
  {
    name: "Blood Pressure",
    unit: "mmHg",
    icon: <Gauge className="w-5 h-5" />,
    normalRange: "120/80"
  },
  {
    name: "Heart Rate",
    unit: "bpm",
    icon: <Heart className="w-5 h-5" />,
    normalRange: "60-100"
  },
  {
    name: "Oxygen Saturation",
    unit: "%",
    icon: <Droplet className="w-5 h-5" />,
    normalRange: "95-100"
  },
  {
    name: "Temperature",
    unit: "°F",
    icon: <Thermometer className="w-5 h-5" />,
    normalRange: "98.6"
  },
  {
    name: "Respiratory Rate",
    unit: "bpm",
    icon: <Activity className="w-5 h-5" />,
    normalRange: "12-20"
  },
  {
    name: "Blood Glucose",
    unit: "mg/dL",
    icon: <Eye className="w-5 h-5" />,
    normalRange: "70-100"
  }
];

export const VitalSigns = ({ vitals, intervention, onInterventionSelect }: VitalSignsProps) => {
  const getVitalValue = (name: string): string | null => {
    switch (name) {
      case "Blood Pressure":
        return vitals.bloodPressure;
      case "Heart Rate":
        return vitals.heartRate;
      case "Oxygen Saturation":
        return vitals.oxygenSaturation;
      case "Temperature":
        return vitals.temperature;
      case "Respiratory Rate":
        return vitals.respiratoryRate;
      case "Blood Glucose":
        return vitals.glucose;
      default:
        return null;
    }
  };

  const isAbnormal = (name: string, value: string | null): boolean => {
    if (!value) return false;
    
    const numValue = parseFloat(value.replace(/[^\d.]/g, ''));
    if (isNaN(numValue)) return false;

    switch (name) {
      case "Heart Rate":
        return numValue < 60 || numValue > 100;
      case "Oxygen Saturation":
        return numValue < 95;
      case "Temperature":
        const temp = parseFloat(value);
        return temp < 97 || temp > 99.5;
      case "Respiratory Rate":
        return numValue < 12 || numValue > 20;
      case "Blood Glucose":
        return numValue < 70 || numValue > 100;
      default:
        return false;
    }
  };

  return (
    <Card className="h-full glass border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Vital Signs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {vitalSignsList.map((vital) => {
          const value = getVitalValue(vital.name);
          const abnormal = value ? isAbnormal(vital.name, value) : false;
          
          return (
            <div
              key={vital.name}
              className={`p-3 rounded-lg border transition-all ${
                value
                  ? abnormal
                    ? "bg-destructive/10 border-destructive/30"
                    : "bg-primary/5 border-primary/20"
                  : "bg-muted/30 border-border/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`${value ? (abnormal ? "text-destructive" : "text-primary") : "text-muted-foreground"}`}>
                    {vital.icon}
                  </div>
                  <span className="text-sm font-medium text-foreground">{vital.name}</span>
                </div>
                {abnormal && (
                  <span className="text-xs text-destructive font-semibold">⚠️</span>
                )}
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  {value ? (
                    <span className={`text-lg font-bold ${abnormal ? "text-destructive" : "text-primary"}`}>
                      {value}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Not measured</span>
                  )}
                  {value && (
                    <span className="text-xs text-muted-foreground ml-1">{vital.unit}</span>
                  )}
                </div>
                {vital.normalRange && (
                  <span className="text-xs text-muted-foreground">
                    Normal: {vital.normalRange}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Intervention Section */}
        {intervention && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-primary" />
              <CardTitle className="text-base font-semibold">Intervention</CardTitle>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">{intervention.question}</p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                  onClick={() => onInterventionSelect?.(1)}
                >
                  <span className="text-sm">{intervention.option1}</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                  onClick={() => onInterventionSelect?.(2)}
                >
                  <span className="text-sm">{intervention.option2}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

