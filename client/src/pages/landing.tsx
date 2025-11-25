import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleLogin = () => {
    setLocation("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-hard-hat text-primary-foreground text-sm"></i>
            </div>
            <span className="font-bold text-lg tracking-tight">RoadTracker</span>
          </div>
          <Button onClick={handleLogin} size="sm">
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-4xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
              Construction Management <br className="hidden sm:block" />
              <span className="text-primary">Reimagined</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Track road construction projects, monitor layer progress, and manage your infrastructure development with professional precision.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={handleLogin}
              size="lg"
              className="w-full sm:w-auto text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
              data-testid="button-login-hero"
            >
              <i className="fas fa-rocket mr-2"></i>
              Get Started
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-lg px-8 py-6"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-background border-border/50 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl">
                  <i className="fas fa-project-diagram"></i>
                </div>
                <h3 className="text-xl font-semibold">Project Management</h3>
                <p className="text-muted-foreground">
                  Organize multiple construction projects with detailed specifications and timelines.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background border-border/50 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center text-xl">
                  <i className="fas fa-layer-group"></i>
                </div>
                <h3 className="text-xl font-semibold">Layer Tracking</h3>
                <p className="text-muted-foreground">
                  Monitor construction layers from subgrade to asphalt with precise chainage tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background border-border/50 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-xl">
                  <i className="fas fa-chart-line"></i>
                </div>
                <h3 className="text-xl font-semibold">Progress Analytics</h3>
                <p className="text-muted-foreground">
                  Visualize completion rates and quality status across all your active road segments.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-background text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Road Construction Tracker. All rights reserved.</p>
      </footer>
    </div>
  );
}
