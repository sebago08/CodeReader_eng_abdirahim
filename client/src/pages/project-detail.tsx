import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import RoadModal from "@/components/road-modal";
import ProgressModal from "@/components/progress-modal";
import OverviewTab from "@/components/project-tabs/overview-tab";
import ProgressTab from "@/components/project-tabs/progress-tab";
import TeamTab from "@/components/project-tabs/team-tab";
import WorkPlanTab from "@/components/project-tabs/work-plan-tab";
import { DocumentsTab } from "@/components/project-tabs/documents-tab";
import { SiteLogsTab } from "@/components/tabs/site-logs-tab";
import PreConstructionTab from "@/components/project-tabs/pre-construction-tab";
import IncidentsTab from "@/components/project-tabs/incidents-tab";
import GrievancesTab from "@/components/project-tabs/grievances-tab";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProjectWithRoads, ProjectDocument } from "@shared/schema";

export default function ProjectDetail() {
  const { toast } = useToast();
  const { logout, user } = useAuth();
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const projectId = params?.id;

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectWithRoads | null>(null);
  const [editingRoad, setEditingRoad] = useState<any>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // Get initial tab from URL hash
  const getInitialTab = () => {
    const hash = window.location.hash.slice(1);
    const validTabs = ["overview", "workplan", "progress", "incidents", "grievances", "pre-construction", "team", "documents", "site-logs"];
    return validTabs.includes(hash) ? hash : "overview";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  
  // Update tab when hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const validTabs = ["overview", "workplan", "progress", "incidents", "grievances", "pre-construction", "team", "documents", "site-logs"];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };
    
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const { data: project, isLoading } = useQuery<ProjectWithRoads>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

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
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
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
    logout();
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
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
            <div className="text-center py-12">
              <i className="fas fa-exclamation-circle text-4xl text-muted-foreground mb-4"></i>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">Project Not Found</h3>
              <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist.</p>
              <Link href="/projects">
                <Button className="bg-orange-900/30 text-orange-400 hover:bg-orange-900/50 border border-orange-400/30">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user && project.userId === user.id;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-black text-primary-foreground shadow-lg">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <div className="flex justify-between items-center py-3 md:py-4 gap-2">
              <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
                <div className="h-8 w-8 md:h-10 md:w-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                  <i className="fas fa-hard-hat text-sm md:text-lg"></i>
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-xl font-bold truncate">ConstructTrack</h1>
                  <p className="text-primary-foreground/80 text-xs md:text-sm hidden sm:block">Professional Construction Management</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4 shrink-0">
                {user && (
                  <div className="text-white hidden sm:block" data-testid="text-current-username">
                    <span className="text-xs md:text-sm text-white/60">Signed in as:</span>
                    <span className="ml-1 md:ml-2 font-medium text-sm md:text-base">{user.firstName || user.email}</span>
                  </div>
                )}
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 px-2 md:px-4"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
                  <span className="hidden md:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
          {/* Breadcrumb Navigation */}
          <nav className="mb-6" data-testid="breadcrumb-nav">
            <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors" data-testid="link-projects">
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

          {/* Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="mb-4 md:mb-6 inline-flex w-max md:w-auto" data-testid="tabs-list">
                <TabsTrigger value="overview" className="text-xs md:text-sm px-2 md:px-3" data-testid="tab-overview">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="workplan" className="text-xs md:text-sm px-2 md:px-3" data-testid="tab-workplan">
                  Work Plan
                </TabsTrigger>
                <TabsTrigger value="progress" className="text-xs md:text-sm px-2 md:px-3" data-testid="tab-progress">
                  Progress
                </TabsTrigger>
                <TabsTrigger value="incidents" className="text-xs md:text-sm px-2 md:px-3" data-testid="tab-incidents">
                  Incidents
                </TabsTrigger>
                <TabsTrigger value="grievances" className="text-xs md:text-sm px-2 md:px-3" data-testid="tab-grievances">
                  Grievances
                </TabsTrigger>
                <TabsTrigger value="pre-construction" className="text-xs md:text-sm px-2 md:px-3" data-testid="tab-pre-construction">
                  Pre-const
                </TabsTrigger>
                <TabsTrigger value="team" className="text-xs md:text-sm px-2 md:px-3" data-testid="tab-team">
                  Team
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs md:text-sm px-2 md:px-3" data-testid="tab-documents">
                  Docs
                </TabsTrigger>
                <TabsTrigger value="site-logs" className="text-xs md:text-sm px-2 md:px-3" data-testid="tab-site-logs">
                  Logs
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" data-testid="tab-content-overview">
              <OverviewTab project={project} />
            </TabsContent>

            <TabsContent value="workplan" data-testid="tab-content-workplan">
              {projectId && <WorkPlanTab projectId={projectId} />}
            </TabsContent>

            <TabsContent value="progress" data-testid="tab-content-progress">
              <ProgressTab
                project={project}
                onEditRoad={handleEditRoad}
                onAddRoad={handleAddRoad}
                onAddProgress={handleAddProgress}
                onResetProgress={handleResetProgress}
              />
            </TabsContent>

            <TabsContent value="incidents" data-testid="tab-content-incidents">
              {projectId && <IncidentsTab projectId={projectId} project={project} />}
            </TabsContent>

            <TabsContent value="grievances" data-testid="tab-content-grievances">
              {projectId && <GrievancesTab projectId={projectId} project={project} />}
            </TabsContent>

            <TabsContent value="pre-construction" data-testid="tab-content-pre-construction">
              <PreConstructionTab project={project} />
            </TabsContent>

            <TabsContent value="team" data-testid="tab-content-team">
              {projectId && user && (
                <TeamTab 
                  projectId={projectId} 
                  isOwner={isOwner || false}
                />
              )}
            </TabsContent>

            <TabsContent value="documents" data-testid="tab-content-documents">
              <DocumentsTab project={project} />
            </TabsContent>

            <TabsContent value="site-logs" data-testid="tab-content-site-logs">
              {projectId && <SiteLogsTab projectId={projectId} />}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Modals */}
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
