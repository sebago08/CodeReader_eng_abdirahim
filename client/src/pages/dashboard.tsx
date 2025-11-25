import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ProjectCard from "@/components/project-card";
import ProjectModal from "@/components/project-modal";
import RoadModal from "@/components/road-modal";
import ProgressModal from "@/components/progress-modal";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ProjectWithRoads, Project, Road } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectWithRoads | null>(null);
  const [editingRoad, setEditingRoad] = useState<Road | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: projects, isLoading } = useQuery<ProjectWithRoads[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const duplicateProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest("POST", `/api/projects/${projectId}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project duplicated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to duplicate project",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleAddProject = () => {
    setEditingProject(null);
    setActiveModal("project");
  };

  const handleEditProject = (project: ProjectWithRoads) => {
    setEditingProject(project);
    setActiveModal("project");
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const handleDuplicateProject = (projectId: string) => {
    duplicateProjectMutation.mutate(projectId);
  };

  const handleAddRoad = (project: ProjectWithRoads) => {
    setEditingProject(project);
    setEditingRoad(null);
    setActiveModal("road");
  };

  const handleEditRoad = (project: ProjectWithRoads, road: Road) => {
    setEditingProject(project);
    setEditingRoad(road);
    setActiveModal("road");
  };

  const handleAddProgress = (project: ProjectWithRoads, road: Road, layerId: string) => {
    setEditingProject(project);
    setEditingRoad(road);
    setSelectedLayerId(layerId);
    setActiveModal("progress");
  };

  const handleResetProgress = async (layerId: string) => {
    if (!confirm("Are you sure you want to reset all progress for this layer? This action cannot be undone.")) {
      return;
    }
    
    try {
      await apiRequest("DELETE", `/api/layers/${layerId}/progress/reset`);
      toast({
        title: "Success",
        description: "Layer progress has been reset successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to reset layer progress",
        variant: "destructive",
      });
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingProject(null);
    setEditingRoad(null);
    setSelectedLayerId(null);
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <i className="fas fa-hard-hat text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Road Construction Tracker</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-medium text-foreground" data-testid="text-user-email">
                  {user?.email || 'User'}
                </span>
                <span className="text-xs text-muted-foreground">Administrator</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt"></i>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Projects</h2>
            <p className="text-muted-foreground mt-1">Manage your construction projects and track progress</p>
          </div>
          <Button
            onClick={handleAddProject}
            size="lg"
            className="shadow-md hover:shadow-lg transition-all"
            data-testid="button-add-project"
          >
            <i className="fas fa-plus mr-2"></i>
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" data-testid="projects-grid">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => handleEditProject(project)}
                onDelete={() => handleDeleteProject(project.id)}
                onDuplicate={() => handleDuplicateProject(project.id)}
                onAddRoad={() => handleAddRoad(project)}
                onEditRoad={(road) => handleEditRoad(project, road)}
                onAddProgress={(road, layerId) => handleAddProgress(project, road, layerId)}
                onResetProgress={handleResetProgress}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-muted/30 rounded-xl border border-dashed border-border">
            <div className="max-w-md mx-auto flex flex-col items-center">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-road text-4xl text-muted-foreground/50"></i>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground mb-8 text-center">
                Get started by creating your first construction project to track roads and progress.
              </p>
              <Button
                onClick={handleAddProject}
                size="lg"
                data-testid="button-add-first-project"
              >
                <i className="fas fa-plus mr-2"></i>
                Create First Project
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {activeModal === "project" && (
        <ProjectModal
          project={editingProject}
          onClose={closeModal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
            closeModal();
          }}
        />
      )}

      {activeModal === "road" && editingProject && (
        <RoadModal
          project={editingProject}
          road={editingRoad}
          onClose={closeModal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
            closeModal();
          }}
        />
      )}

      {activeModal === "progress" && editingProject && editingRoad && selectedLayerId && (
        <ProgressModal
          project={editingProject}
          road={editingRoad}
          layerId={selectedLayerId}
          onClose={closeModal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
            closeModal();
          }}
        />
      )}
    </div>
  );
}
