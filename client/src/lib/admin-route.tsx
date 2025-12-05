import { useEffect } from "react";
import { useLocation, Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function AdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" data-testid="loading-spinner" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  if (!user.isAdmin && !user.isSuperAdmin) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen flex-col space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">You do not have admin privileges</p>
          <button
            onClick={() => setLocation("/projects")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            data-testid="button-go-to-dashboard"
          >
            Go to Dashboard
          </button>
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
