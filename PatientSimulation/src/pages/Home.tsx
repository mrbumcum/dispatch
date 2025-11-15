import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Radio, BookOpen, ClipboardCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      id: "patient-simulation",
      title: "Patient Simulation",
      description: "Practice patient assessment skills through realistic emergency scenarios with AI-powered patients",
      icon: <Activity className="w-12 h-12" />,
      path: "/patient-simulation",
      gradient: "from-red-500 to-orange-500"
    },
    {
      id: "radio-simulation",
      title: "Radio Simulation",
      description: "Practice radio communication protocols and dispatch procedures",
      icon: <Radio className="w-12 h-12" />,
      path: "/radio-simulation",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      id: "flashcards",
      title: "Flashcards",
      description: "Study and review EMT protocols, medications, and procedures",
      icon: <BookOpen className="w-12 h-12" />,
      path: "/flashcards",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      id: "response-area-quiz",
      title: "Response Area Quiz",
      description: "Test your knowledge of response areas, locations, and navigation",
      icon: <ClipboardCheck className="w-12 h-12" />,
      path: "/response-area-quiz",
      gradient: "from-green-500 to-emerald-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      {/* Header */}
      <header className="glass border-b border-border/50 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shadow-lg">
                <span className="text-3xl">🚑</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  EMT Training Platform
                </h1>
                <p className="text-sm text-muted-foreground">Choose a training module to begin</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome to EMT Training
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enhance your emergency medical skills through interactive simulations, 
              practice scenarios, and comprehensive study tools.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 border-border/50 overflow-hidden"
                onClick={() => navigate(feature.path)}
              >
                <CardHeader className={`bg-gradient-to-br ${feature.gradient} text-white p-6`}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl text-white mb-2">
                        {feature.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <CardDescription className="text-base text-foreground mb-4">
                    {feature.description}
                  </CardDescription>
                  <Button 
                    className={`w-full bg-gradient-to-r ${feature.gradient} text-white hover:opacity-90 transition-opacity`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(feature.path);
                    }}
                  >
                    Start Training
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Select a training module above to begin your practice session
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;

