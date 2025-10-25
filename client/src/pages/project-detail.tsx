import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ProjectOverviewTab from "@/components/project-tabs/overview-tab";
import ProjectBOQTab from "@/components/project-tabs/boq-tab";
import ProjectWorkPlanTab from "@/components/project-tabs/work-plan-tab";
import ProjectProgressTab from "@/components/project-tabs/progress-tab";
import ProjectDocumentsTab from "@/components/project-tabs/documents-tab";
import type { ProjectWithRoads } from "@shared/schema";

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id/:tab?");
  const [, setLocation] = useLocation();
  const projectId = params?.id;
  const currentTab = params?.tab || "";
  
  // Valid tabs
  const validTabs = ["overview", "boq", "work-plan", "progress", "documents"];
  const activeTab = validTabs.includes(currentTab) ? currentTab : "overview";
  
  // Redirect to default tab if missing or invalid
  useEffect(() => {
    if (currentTab && !validTabs.includes(currentTab)) {
      // Invalid tab - redirect to overview
      setLocation(`/projects/${projectId}/overview`, { replace: true });
    } else if (!currentTab) {
      // Missing tab - redirect to overview
      setLocation(`/projects/${projectId}/overview`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, currentTab]);

  const { data: projects, isLoading } = useQuery<ProjectWithRoads[]>({
    queryKey: ["/api/projects"],
  });

  const project = projects?.find(p => p.id === projectId);

  // Calculate counts for badges
  const boqItemsCount = 0; // TODO: Get from BOQ API
  const pendingDocumentsCount = 0; // TODO: Get from Documents API
  const activeIssuesCount = 0; // TODO: Get from Issues API

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-muted-foreground">Loading project...</div>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-card-foreground mb-2">Project Not Found</h3>
          <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist.</p>
          <Link href="/projects" className="text-primary hover:underline">
            Back to Projects
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Breadcrumb */}
      <nav className="mb-6" data-testid="breadcrumb-nav">
        <Link 
          href="/projects" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors" 
          data-testid="link-back-to-projects"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Projects
        </Link>
      </nav>

      {/* Project Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-project-name">
          {project.name}
        </h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span data-testid="text-project-client">{project.client}</span>
          <span>•</span>
          <span data-testid="text-project-location">{project.location}</span>
          <span>•</span>
          <span data-testid="text-project-dates">
            {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Card className="border-0 shadow-sm">
        <Tabs 
          value={activeTab} 
          onValueChange={(tab) => setLocation(`/projects/${projectId}/${tab}`)} 
          className="w-full"
        >
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent" data-testid="tabs-project-detail">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              data-testid="tab-overview"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="boq" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              data-testid="tab-boq"
            >
              <span className="flex items-center gap-2">
                BOQ
                {boqItemsCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs">
                    {boqItemsCount}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="work-plan" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              data-testid="tab-work-plan"
            >
              Work Plan
            </TabsTrigger>
            <TabsTrigger 
              value="progress" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              data-testid="tab-progress"
            >
              <span className="flex items-center gap-2">
                Progress
                {activeIssuesCount > 0 && (
                  <Badge variant="destructive" className="ml-1 px-2 py-0.5 text-xs">
                    {activeIssuesCount}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              data-testid="tab-documents"
            >
              <span className="flex items-center gap-2">
                Documents
                {pendingDocumentsCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs">
                    {pendingDocumentsCount}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="overview" className="mt-0">
              <ProjectOverviewTab project={project} />
            </TabsContent>

            <TabsContent value="boq" className="mt-0">
              <ProjectBOQTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="work-plan" className="mt-0">
              <ProjectWorkPlanTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="progress" className="mt-0">
              <ProjectProgressTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
              <ProjectDocumentsTab projectId={project.id} />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </AppLayout>
  );
}
