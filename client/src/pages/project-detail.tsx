import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import ProjectCard from "@/components/project-card";
import ProjectModal from "@/components/project-modal";
import RoadModal from "@/components/road-modal";
import ProgressModal from "@/components/progress-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProjectWithRoads } from "@shared/schema";

export default function ProjectDetail() {
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const projectId = params?.id;

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectWithRoads | null>(null);
  const [editingRoad, setEditingRoad] = useState<any>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery<ProjectWithRoads[]>({
    queryKey: ["/api/projects"],
  });

  const project = projects?.find(p => p.id === projectId);

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
      // Navigate back to overview
      setLocation("/projects");
    },
    onError: () => {
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate project",
        variant: "destructive",
      });
    },
  });

  const handleEditProject = (project: ProjectWithRoads) => {
    setEditingProject(project);
    setActiveModal("project");
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm("Are you sure you want to delete this project? This will navigate you back to the projects overview.")) {
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

  const handleEditRoad = (project: ProjectWithRoads, road: any) => {
    setEditingProject(project);
    setEditingRoad(road);
    setActiveModal("road");
  };

  const handleAddProgress = (project: ProjectWithRoads, road: any, layerId: string) => {
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

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Calculate overall completion
  const calculateOverallProgress = () => {
    if (!project?.roads || project.roads.length === 0) return 0;

    let totalProgress = 0;
    let totalWeight = 0;

    project.roads.forEach(road => {
      if (road.layers && road.layers.length > 0) {
        road.layers.forEach(layer => {
          const layerWeight = layer.weight || 1;
          totalWeight += layerWeight;

          if (layer.progress && layer.progress.length > 0) {
            const completedLength = layer.progress.reduce((sum, prog) => {
              return sum + (Number(prog.endChainage) - Number(prog.startChainage));
            }, 0);

            const layerProgress = (completedLength / Number(road.length)) * 100;
            totalProgress += layerProgress * layerWeight;
          }
        });
      }
    });

    return totalWeight > 0 ? Math.min(100, Math.round(totalProgress / totalWeight)) : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
          <div className="text-center py-12">
            <i className="fas fa-exclamation-circle text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Project Not Found</h3>
            <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist.</p>
            <Link href="/projects">
              <Button className="bg-orange-500 text-white hover:bg-orange-600">
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Projects
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const overallProgress = calculateOverallProgress();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-black text-primary-foreground shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center">
                <i className="fas fa-hard-hat text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold">Road Construction Tracker</h1>
                <p className="text-primary-foreground/80 text-sm">Professional Construction Management</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-white hover:bg-white/10"
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" data-testid="breadcrumb-nav">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            <li>
              <Link href="/projects" className="hover:text-foreground transition-colors" data-testid="link-projects">
                Projects
              </Link>
            </li>
            <li>
              <i className="fas fa-chevron-right text-xs"></i>
            </li>
            <li className="text-foreground font-medium" data-testid="text-current-project">
              {project.name}
            </li>
          </ol>
        </nav>

        {/* Project Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="text-project-title">
            {project.name}
          </h2>
          <p className="text-muted-foreground">
            ID: {project.client} — {project.location}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Overall Completion</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-bold text-foreground" data-testid="text-overall-completion">
                {overallProgress}%
              </span>
              {overallProgress > 0 && (
                <span className="text-sm text-green-600 font-medium">
                  <i className="fas fa-arrow-up text-xs"></i> +{overallProgress}% this week
                </span>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Roads</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-bold text-foreground" data-testid="text-total-roads">
                {project.roads?.length || 0}
              </span>
              <span className="text-sm text-muted-foreground">roads tracked</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Project Duration</h3>
            <div className="text-lg font-medium text-foreground" data-testid="text-project-duration">
              {project.startDate} to {project.endDate}
            </div>
          </div>
        </div>

        {/* Project Details Card */}
        <div className="w-full lg:w-3/4 mx-auto">
          <ProjectCard
            project={project}
            onEdit={() => handleEditProject(project)}
            onDelete={() => handleDeleteProject(project.id)}
            onDuplicate={() => handleDuplicateProject(project.id)}
            onAddRoad={() => handleAddRoad(project)}
            onEditRoad={(road) => handleEditRoad(project, road)}
            onAddProgress={(road, layerId) => handleAddProgress(project, road, layerId)}
            onResetProgress={handleResetProgress}
          />
        </div>
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
