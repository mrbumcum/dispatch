import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, SkipForward, CheckCircle2, XCircle, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Fix for default marker icons in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: {
    'addr:housenumber'?: string;
    'addr:street'?: string;
    'addr:city'?: string;
    'addr:state'?: string;
    'addr:postcode'?: string;
    name?: string;
  };
}

interface OverpassResponse {
  elements: OverpassElement[];
}

// Helper function to create bounds around a coordinate point
// Using 0.0003 degrees (~33 meters) to ensure good spacing with the 30m minimum distance filter
const createBounds = (lat: number, lon: number, offsetDegrees = 0.0003): L.LatLngBoundsExpression => {
  return [
    [lat - offsetDegrees, lon - offsetDegrees],
    [lat + offsetDegrees, lon + offsetDegrees]
  ];
};

// Helper function to calculate distance between two coordinates in meters
const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Helper function to filter out buildings that are too close together
const filterOverlappingBuildings = (buildings: Building[], minDistanceMeters = 30): Building[] => {
  const filtered: Building[] = [];
  
  for (const building of buildings) {
    let tooClose = false;
    
    for (const existing of filtered) {
      const distance = getDistanceInMeters(
        building.coords[0],
        building.coords[1],
        existing.coords[0],
        existing.coords[1]
      );
      
      if (distance < minDistanceMeters) {
        tooClose = true;
        break;
      }
    }
    
    if (!tooClose) {
      filtered.push(building);
    }
  }
  
  return filtered;
};

const MapPractice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const rectanglesRef = useRef<L.Rectangle[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [zipCode, setZipCode] = useState("30322"); // Default to Emory area
  const [zipCodeInput, setZipCodeInput] = useState("30322");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([33.7920, -84.3235]);
  
  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Refs to avoid stale closures in click handlers
  const currentBuildingRef = useRef<Building | null>(null);
  const gameStartedRef = useRef(false);

  // Fetch addresses for a given zip code
  const fetchAddressesForZipCode = useCallback(async (zip: string) => {
    setIsLoadingAddresses(true);
    try {
      // First, geocode the zip code to get center coordinates
      const zipResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'DispatchMapPractice/1.0'
          }
        }
      );
      
      const zipData = await zipResponse.json();
      
      if (!zipData || zipData.length === 0) {
        toast({
          title: "Invalid Zip Code",
          description: "Could not find location for this zip code",
          variant: "destructive"
        });
        setIsLoadingAddresses(false);
        return;
      }

      const centerLat = parseFloat(zipData[0].lat);
      const centerLon = parseFloat(zipData[0].lon);
      setMapCenter([centerLat, centerLon]);

      // Update map view
      if (mapRef.current) {
        mapRef.current.setView([centerLat, centerLon], 15);
      }

      // Fetch nearby addresses using Overpass API for actual buildings
      // Increased radius to 1500m and limit to 40 to ensure we have enough after filtering
      const overpassQuery = `
        [out:json];
        (
          node["addr:housenumber"]["addr:street"](around:1500,${centerLat},${centerLon});
          way["addr:housenumber"]["addr:street"](around:1500,${centerLat},${centerLon});
        );
        out center 40;
      `;

      const overpassResponse = await fetch(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          body: overpassQuery
        }
      );

      const overpassData = await overpassResponse.json() as OverpassResponse;
      
      // Process the results
      const rawBuildings: Building[] = overpassData.elements
        .filter((element: OverpassElement) => {
          return element.tags && element.tags['addr:housenumber'] && element.tags['addr:street'];
        })
        .slice(0, 30) // Get more initially, then filter
        .map((element: OverpassElement, index: number) => {
          const lat = element.lat || element.center?.lat || centerLat;
          const lon = element.lon || element.center?.lon || centerLon;
          
          const houseNumber = element.tags!['addr:housenumber']!;
          const street = element.tags!['addr:street']!;
          const city = element.tags?.['addr:city'] || zipData[0].display_name.split(',')[0];
          const state = element.tags?.['addr:state'] || 'GA';
          const postalCode = element.tags?.['addr:postcode'] || zip;
          const name = element.tags?.name || `Building ${index + 1}`;
          
          const address = `${houseNumber} ${street.toUpperCase()}, ${city.toUpperCase()}, ${state}, ${postalCode}`.trim();
          
          return {
            id: String(index + 1),
            name: name,
            address: address,
            coords: [lat, lon] as [number, number],
            bounds: createBounds(lat, lon)
          };
        });

      // Filter out overlapping buildings to prevent stacking
      const newBuildings = filterOverlappingBuildings(rawBuildings, 30).slice(0, 12);
      
      // Re-index buildings after filtering
      const reindexedBuildings = newBuildings.map((building, index) => ({
        ...building,
        id: String(index + 1)
      }));

      if (reindexedBuildings.length < 5) {
        toast({
          title: "Limited Data",
          description: `Only found ${reindexedBuildings.length} well-spaced addresses in this area. Try a different zip code for more options.`,
        });
      }

      setBuildings(reindexedBuildings);
      setZipCode(zip);

      toast({
        title: "Location Updated",
        description: `Loaded ${reindexedBuildings.length} addresses for zip code ${zip}`,
      });

    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch addresses. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [toast]);

  // Load initial addresses on component mount
  useEffect(() => {
    fetchAddressesForZipCode(zipCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map centered on initial location
    const map = L.map(mapContainerRef.current).setView(mapCenter, 15);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = [];
      rectanglesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start new round
  const startNewRound = useCallback(() => {
    if (buildings.length === 0) {
      toast({
        title: "No Addresses Available",
        description: "Please enter a valid zip code first",
        variant: "destructive"
      });
      return;
    }

    const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
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
  }, [buildings, toast]);

  // Handle building click
  const handleBuildingClick = useCallback((building: Building) => {
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
      const rectIndex = buildings.findIndex(b => b.id === building.id);
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
      const rectIndex = buildings.findIndex(b => b.id === building.id);
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
  }, [buildings, toast, startNewRound]);

  // Update markers when buildings change
  useEffect(() => {
    if (!mapRef.current || buildings.length === 0) return;

    // Clear existing markers and rectangles
    markersRef.current.forEach(marker => marker.remove());
    rectanglesRef.current.forEach(rect => rect.remove());
    markersRef.current = [];
    rectanglesRef.current = [];

    // Add new building markers and clickable areas
    buildings.forEach((building) => {
      // Add marker
      const marker = L.marker(building.coords, {
        title: building.name,
        opacity: 0.7
      }).addTo(mapRef.current!);
      markersRef.current.push(marker);

      // Add clickable rectangle around building
      const rectangle = L.rectangle(building.bounds, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2,
        opacity: 0.6
      }).addTo(mapRef.current!);

      // Add hover effect to make buildings more distinguishable
      rectangle.on('mouseover', function() {
        if (!this.options.className?.includes('correct') && !this.options.className?.includes('wrong')) {
          this.setStyle({
            fillOpacity: 0.3,
            opacity: 0.9,
            weight: 3
          });
        }
      });

      rectangle.on('mouseout', function() {
        if (!this.options.className?.includes('correct') && !this.options.className?.includes('wrong')) {
          this.setStyle({
            fillOpacity: 0.15,
            opacity: 0.6,
            weight: 2
          });
        }
      });

      // Handle click
      rectangle.on('click', () => handleBuildingClick(building));
      rectanglesRef.current.push(rectangle);
    });
  }, [buildings, handleBuildingClick]);

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

  const handleZipCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (zipCodeInput.length === 5 && /^\d+$/.test(zipCodeInput)) {
      fetchAddressesForZipCode(zipCodeInput);
      resetGame();
    } else {
      toast({
        title: "Invalid Zip Code",
        description: "Please enter a valid 5-digit zip code",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="h-screen bg-background transition-colors duration-500 flex flex-col overflow-hidden">
      <header className="flex-shrink-0 glass border-b border-border/50 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-lg">
                <span className="text-2xl">🗺️</span>
              </div>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Map Practice
              </h1>
            </div>
            
            {/* Zip Code Input */}
            <form onSubmit={handleZipCodeSubmit} className="flex items-center gap-2">
              <div className="relative">
                <MapPin className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Zip Code"
                  value={zipCodeInput}
                  onChange={(e) => setZipCodeInput(e.target.value)}
                  maxLength={5}
                  className="pl-8 w-28 h-8 text-sm"
                  disabled={isLoadingAddresses}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={isLoadingAddresses}
                className="h-8"
              >
                {isLoadingAddresses ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Load"
                )}
              </Button>
            </form>

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
                disabled={isLoadingAddresses || buildings.length === 0}
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
              {isLoadingAddresses ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-lg text-muted-foreground">
                    Loading addresses for zip code {zipCodeInput}...
                  </p>
                </div>
              ) : buildings.length === 0 ? (
                <p className="text-lg text-muted-foreground">
                  Enter a zip code and click "Load" to get started
                </p>
              ) : currentBuilding ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h2 className="text-sm text-muted-foreground">Find this address (Zip: {zipCode}):</h2>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {currentBuilding.address}
                  </p>
                </>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Loaded {buildings.length} addresses for zip code {zipCode}
                  </p>
                  <p className="text-xl text-muted-foreground">
                    Click "Start" to begin practicing
                  </p>
                </div>
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

