import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AdminRoute } from "@/lib/admin-route";
import { HomeRoute } from "@/lib/home-route";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ProjectsOverview from "@/pages/projects-overview";
import ProjectDetail from "@/pages/project-detail";
import AdminDashboard from "@/pages/admin-dashboard";
import Bootstrap from "@/pages/bootstrap";
import Reports from "@/pages/reports";
import Team from "@/pages/team";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/bootstrap" component={Bootstrap} />
      <AdminRoute path="/admin" component={AdminDashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/team" component={Team} />
      <ProtectedRoute path="/projects" component={ProjectsOverview} />
      <ProtectedRoute path="/projects/:id" component={ProjectDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
