import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const ResponseAreaQuiz = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <header className="glass border-b border-border/50 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-lg">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Response Area Quiz
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
                Back
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-2xl">Response Area Quiz</CardTitle>
              <CardDescription>
                Test your knowledge of response areas, locations, and navigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <ClipboardCheck className="w-24 h-24 mx-auto mb-6 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground">
                  This feature is coming soon...
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Response Area Quiz functionality will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ResponseAreaQuiz;

