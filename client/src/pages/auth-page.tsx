import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect } from "wouter";
import { Loader2, Building2, Clock, CheckCircle } from "lucide-react";

export default function AuthPage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" data-testid="loading-spinner" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (!user.isApproved) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
              <CardDescription className="text-base mt-2">
                Your account has been created successfully. An administrator will review and approve your access shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  What happens next?
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                  <li>An administrator will review your registration</li>
                  <li>You'll receive access once approved</li>
                  <li>You can then access all features</li>
                </ul>
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return <Redirect to="/dashboard" />;
  }

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-2 mb-8">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Lumina Flow</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <CardDescription>Sign in to access your construction project management dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleLogin}
                className="w-full"
                size="lg"
                data-testid="button-login"
              >
                Sign In
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                New users will be registered automatically and pending admin approval.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-12">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-12 w-12 text-primary" />
            <h2 className="text-4xl font-bold">Lumina Flow</h2>
          </div>
          <p className="text-lg text-muted-foreground">
            Professional road construction project management system for tracking projects, managing roads,
            and monitoring construction progress.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Project Management</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage construction projects with comprehensive tracking
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Progress Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor construction layers and progress with visual indicators
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Road Management</h3>
                <p className="text-sm text-muted-foreground">
                  Track multiple roads with dual carriageway support
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
