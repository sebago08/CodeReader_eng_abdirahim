import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import ProjectOverviewCard from "@/components/project-overview-card";
import ProjectModal from "@/components/project-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProjectWithRoads } from "@shared/schema";

export default function ProjectsOverview() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithRoads | null>(null);
  const { logoutMutation, user } = useAuth();
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

  const handleLogout = () => {
    logoutMutation.mutate();
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
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-white" data-testid="text-current-username">
                  <span className="text-sm text-white/60">Signed in as:</span>
                  <span className="ml-2 font-medium">{user.username}</span>
                </div>
              )}
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
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Projects Dashboard</h2>
            <p className="text-muted-foreground">Monitor and manage all ongoing construction projects.</p>
          </div>
          <Button
            onClick={handleAddProject}
            className="mt-4 md:mt-0 bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-lg"
            data-testid="button-add-project"
          >
            <i className="fas fa-plus mr-2"></i>
            Add New Project
          </Button>
        </div>

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
                className="bg-orange-500 text-white hover:bg-orange-600"
                data-testid="button-add-first-project"
              >
                <i className="fas fa-plus mr-2"></i>
                Create First Project
              </Button>
            </div>
          </div>
        )}
      </main>

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
    </div>
  );
}
