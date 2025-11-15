import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, SkipForward, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Fix for default marker icons in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface Building {
  id: string;
  name: string;
  address: string;
  coords: [number, number];
  bounds: L.LatLngBoundsExpression;
}

// Sample buildings in Atlanta area (Emory University campus area)
const BUILDINGS: Building[] = [
  {
    id: "1",
    name: "Emory University Hospital",
    address: "1364 CLIFTON ROAD NE, ATLANTA, GA, 30322",
    coords: [33.7900, -84.3235],
    bounds: [
      [33.7895, -84.3240],
      [33.7905, -84.3230]
    ]
  },
  {
    id: "2",
    name: "Woodruff Library",
    address: "540 ASBURY CIRCLE, ATLANTA, GA, 30322",
    coords: [33.7920, -84.3225],
    bounds: [
      [33.7915, -84.3230],
      [33.7925, -84.3220]
    ]
  },
  {
    id: "3",
    name: "Cox Hall",
    address: "569 ASBURY CIRCLE, ATLANTA, GA, 30322",
    coords: [33.7935, -84.3240],
    bounds: [
      [33.7930, -84.3245],
      [33.7940, -84.3235]
    ]
  },
  {
    id: "4",
    name: "Emory Student Center",
    address: "605 ASBURY CIRCLE, ATLANTA, GA, 30322",
    coords: [33.7945, -84.3220],
    bounds: [
      [33.7940, -84.3225],
      [33.7950, -84.3215]
    ]
  },
  {
    id: "5",
    name: "Emory Point",
    address: "1463 OXFORD ROAD NE, ATLANTA, GA, 30307",
    coords: [33.7965, -84.3205],
    bounds: [
      [33.7960, -84.3210],
      [33.7970, -84.3200]
    ]
  },
  {
    id: "6",
    name: "Clairmont Campus",
    address: "1762 CLIFTON ROAD NE, ATLANTA, GA, 30329",
    coords: [33.8020, -84.3180],
    bounds: [
      [33.8015, -84.3185],
      [33.8025, -84.3175]
    ]
  },
  {
    id: "7",
    name: "Means Drive Residence",
    address: "646 MEANS DRIVE, ATLANTA, GA, 30322",
    coords: [33.7880, -84.3260],
    bounds: [
      [33.7875, -84.3265],
      [33.7885, -84.3255]
    ]
  },
  {
    id: "8",
    name: "North Decatur Building",
    address: "1518 CLIFTON ROAD NE, ATLANTA, GA, 30322",
    coords: [33.7950, -84.3270],
    bounds: [
      [33.7945, -84.3275],
      [33.7955, -84.3265]
    ]
  }
];

const MapPractice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const rectanglesRef = useRef<L.Rectangle[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Refs to avoid stale closures in click handlers
  const currentBuildingRef = useRef<Building | null>(null);
  const gameStartedRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map centered on Emory University area
    const map = L.map(mapContainerRef.current).setView([33.7920, -84.3235], 15);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Add building markers and clickable areas
    BUILDINGS.forEach((building) => {
      // Add marker
      const marker = L.marker(building.coords, {
        title: building.name,
        opacity: 0.6
      }).addTo(map);
      markersRef.current.push(marker);

      // Add clickable rectangle around building
      const rectangle = L.rectangle(building.bounds, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 2,
        opacity: 0.5
      }).addTo(map);

      // Handle click
      rectangle.on('click', () => handleBuildingClick(building));
      rectanglesRef.current.push(rectangle);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = [];
      rectanglesRef.current = [];
    };
  }, []);

  // Start new round
  const startNewRound = () => {
    const randomBuilding = BUILDINGS[Math.floor(Math.random() * BUILDINGS.length)];
    setCurrentBuilding(randomBuilding);
    currentBuildingRef.current = randomBuilding;
    setGameStarted(true);
    gameStartedRef.current = true;
    setFeedback(null);

    // Reset rectangle styles
    rectanglesRef.current.forEach((rect) => {
      rect.setStyle({
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 2,
        opacity: 0.5
      });
    });
  };

  // Handle building click
  const handleBuildingClick = (building: Building) => {
    if (!gameStartedRef.current || !currentBuildingRef.current) {
      toast({
        title: "Start a Game First",
        description: "Click 'New Address' to begin practicing",
      });
      return;
    }

    setAttempts(prev => prev + 1);

    if (building.id === currentBuildingRef.current.id) {
      // Correct!
      setScore(prev => prev + 1);
      setFeedback({
        type: 'success',
        message: `Correct! You found ${building.name}`
      });

      // Highlight correct building
      const rectIndex = BUILDINGS.findIndex(b => b.id === building.id);
      if (rectIndex !== -1) {
        rectanglesRef.current[rectIndex].setStyle({
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.3,
          weight: 3
        });
      }

      toast({
        title: "Correct! 🎉",
        description: `You found ${building.name}`,
      });

      // Auto-start next round after 2 seconds
      setTimeout(() => {
        startNewRound();
      }, 2000);
    } else {
      // Wrong!
      setFeedback({
        type: 'error',
        message: `Wrong building. That's ${building.name}. Try again!`
      });

      // Highlight wrong building temporarily
      const rectIndex = BUILDINGS.findIndex(b => b.id === building.id);
      if (rectIndex !== -1) {
        rectanglesRef.current[rectIndex].setStyle({
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.3,
          weight: 3
        });

        setTimeout(() => {
          rectanglesRef.current[rectIndex].setStyle({
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
            opacity: 0.5
          });
        }, 1000);
      }

      toast({
        title: "Wrong Building",
        description: `That's ${building.name}. Try again!`,
        variant: "destructive"
      });
    }
  };

  const resetGame = () => {
    setScore(0);
    setAttempts(0);
    setGameStarted(false);
    gameStartedRef.current = false;
    setCurrentBuilding(null);
    currentBuildingRef.current = null;
    setFeedback(null);
    
    // Reset all rectangle styles
    rectanglesRef.current.forEach((rect) => {
      rect.setStyle({
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 2,
        opacity: 0.5
      });
    });
  };

  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;

  return (
    <div className="h-screen bg-background transition-colors duration-500 flex flex-col overflow-hidden">
      <header className="flex-shrink-0 glass border-b border-border/50 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-lg">
                <span className="text-2xl">🗺️</span>
              </div>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Map Practice
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
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Button
                onClick={gameStarted ? startNewRound : () => { resetGame(); startNewRound(); }}
                className="gradient-accent text-white shadow-lg hover:scale-105 transition-transform duration-300"
                size="sm"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{gameStarted ? 'New Address' : 'Start'}</span>
                <span className="sm:hidden">{gameStarted ? 'Next' : 'Start'}</span>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Address Display and Stats */}
        <div className="flex-shrink-0 p-4 space-y-3">
          {/* Current Address */}
          <Card className="p-6 glass border-border/50">
            <div className="text-center">
              {currentBuilding ? (
                <>
                  <h2 className="text-sm text-muted-foreground mb-2">Find this address:</h2>
                  <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {currentBuilding.address}
                  </p>
                </>
              ) : (
                <p className="text-xl text-muted-foreground">
                  Click "Start" to begin practicing
                </p>
              )}
            </div>
          </Card>

          {/* Stats and Feedback */}
          <div className="flex gap-3">
            <Card className="flex-1 p-4 glass border-border/50">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-2xl font-bold text-primary">{score} / {attempts}</p>
              </div>
            </Card>
            <Card className="flex-1 p-4 glass border-border/50">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold text-primary">{accuracy}%</p>
              </div>
            </Card>
            {feedback && (
              <Card className={`flex-1 p-4 glass border-border/50 ${
                feedback.type === 'success' ? 'border-green-500/50' : 'border-red-500/50'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <p className={`text-sm ${
                    feedback.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {feedback.message}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 px-4 pb-4 overflow-hidden">
          <div 
            ref={mapContainerRef} 
            className="w-full h-full rounded-xl border border-border/50 shadow-lg overflow-hidden"
            style={{ minHeight: '400px' }}
          />
        </div>
      </main>
    </div>
  );
};

export default MapPractice;

