import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ProjectCard from "@/components/project-card";
import ProjectModal from "@/components/project-modal";
import RoadModal from "@/components/road-modal";
import ProgressModal from "@/components/progress-modal";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectWithRoads, Project } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectWithRoads | null>(null);
  const [editingRoad, setEditingRoad] = useState<any>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery<ProjectWithRoads[]>({
    queryKey: ["/api/projects"],
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
      toast({
        title: "Error",
        description: "Failed to duplicate project",
        variant: "destructive",
      });
    },
  });

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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Project Dashboard</h2>
            <p className="text-muted-foreground">Manage your construction projects and track progress</p>
          </div>
          <Button
            onClick={handleAddProject}
            className="mt-4 md:mt-0 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium hover:bg-secondary/90 transition-colors shadow-lg"
            data-testid="button-add-project"
          >
            <i className="fas fa-plus mr-2"></i>
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-muted-foreground">Loading projects...</div>
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="w-full lg:w-3/4 mx-auto space-y-6" data-testid="projects-grid">
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
          <div className="text-center py-12">
            <div className="bg-card rounded-xl p-8 max-w-md mx-auto">
              <i className="fas fa-road text-4xl text-muted-foreground mb-4"></i>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground mb-6">Get started by creating your first construction project.</p>
              <Button
                onClick={handleAddProject}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
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
