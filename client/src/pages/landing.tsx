import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-6">
            <i className="fas fa-hard-hat text-2xl text-primary-foreground"></i>
          </div>
          <h2 className="text-3xl font-bold text-primary mb-2">Road Construction Tracker</h2>
          <p className="text-muted-foreground">Professional construction management platform</p>
        </div>
        
        <Card className="bg-card p-8 rounded-xl shadow-lg border border-border">
          <CardContent className="space-y-6 p-0">
            <h3 className="text-xl font-semibold text-card-foreground mb-6">
              Welcome to Construction Management
            </h3>
            
            <p className="text-muted-foreground mb-6">
              Track your road construction projects, monitor progress, and manage construction layers with our professional platform.
            </p>
            
            <Button 
              onClick={handleLogin}
              className="w-full bg-secondary text-secondary-foreground py-3 px-4 rounded-lg font-medium hover:bg-secondary/90 transition-colors"
              data-testid="button-login"
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              Sign in with Replit
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
