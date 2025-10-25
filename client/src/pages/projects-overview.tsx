import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import ProjectOverviewCard from "@/components/project-overview-card";
import ProjectModal from "@/components/project-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProjectWithRoads } from "@shared/schema";

export default function ProjectsOverview() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithRoads | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<ProjectWithRoads[]>({
    queryKey: ["/api/projects"],
  });

  // Duplicate project mutation
  const duplicateProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/duplicate`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project duplicated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate project",
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const handleAddProject = () => {
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const handleEditProject = (project: ProjectWithRoads) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleDuplicateProject = (projectId: string) => {
    if (confirm("Are you sure you want to duplicate this project?")) {
      duplicateProjectMutation.mutate(projectId);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const closeModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
  };

  return (
    <AppLayout
      breadcrumb={<h1 className="text-xl font-semibold">Projects</h1>}
      headerActions={
        <Button
          onClick={handleAddProject}
          data-testid="button-add-project"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      }
    >
      <div className="p-8">
        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-muted-foreground">Loading projects...</div>
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="projects-grid">
            {projects.map((project) => (
              <ProjectOverviewCard 
                key={project.id} 
                project={project}
                currentUserId={user?.id}
                onEdit={handleEditProject}
                onDuplicate={handleDuplicateProject}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-card rounded-xl p-8 max-w-md mx-auto border border-border">
              <i className="fas fa-road text-4xl text-muted-foreground mb-4"></i>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground mb-6">Get started by creating your first construction project.</p>
              <Button
                onClick={handleAddProject}
                data-testid="button-add-first-project"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Project Modal */}
      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onClose={closeModal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
            closeModal();
          }}
        />
      )}
    </AppLayout>
  );
}
