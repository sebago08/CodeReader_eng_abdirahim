import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Settings } from "lucide-react";
import ProjectModal from "@/components/project-modal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ProjectWithRoads } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import CustomizeDashboardModal, { type DashboardLayout } from "@/components/dashboard/customize-dashboard-modal";
import WidgetRenderer from "@/components/dashboard/widget-renderer";

interface OverviewTabProps {
  project: ProjectWithRoads;
}

export default function OverviewTab({ project }: OverviewTabProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  const DEFAULT_LAYOUT: DashboardLayout = {
    topLeft: "basic-info",
    topRight: "financial",
    bottomLeft: "progress",
    bottomRight: "action-points",
  };

  const currentLayout: DashboardLayout = (project.dashboardLayout as DashboardLayout) || DEFAULT_LAYOUT;

  const saveDashboardLayoutMutation = useMutation({
    mutationFn: async (layout: DashboardLayout) => {
      return await apiRequest("PATCH", `/api/projects/${project.id}/dashboard-layout`, { dashboardLayout: layout });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
      setIsCustomizeModalOpen(false);
    },
  });

  const handleSaveLayout = (layout: DashboardLayout) => {
    saveDashboardLayoutMutation.mutate(layout);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Completed":
        return "bg-blue-500";
      case "On Hold":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-3" data-testid="text-project-name">
              {project.name}
            </h2>
            <Badge className={`${getStatusColor(project.status)} text-white text-sm px-3 py-1`} data-testid="badge-project-status">
              {project.status}
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setIsCustomizeModalOpen(true)} 
              variant="outline"
              data-testid="button-customize-dashboard"
            >
              <Settings className="h-4 w-4 mr-2" />
              Customize Dashboard
            </Button>
            <Button onClick={() => setIsEditModalOpen(true)} data-testid="button-edit-project">
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WidgetRenderer widgetId={currentLayout.topLeft} project={project} />
          <WidgetRenderer widgetId={currentLayout.topRight} project={project} />
          <WidgetRenderer widgetId={currentLayout.bottomLeft} project={project} />
          <WidgetRenderer widgetId={currentLayout.bottomRight} project={project} />
        </div>
      </div>

      {isEditModalOpen && (
        <ProjectModal
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
          }}
          project={project}
        />
      )}

      <CustomizeDashboardModal
        open={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        currentLayout={currentLayout}
        onSave={handleSaveLayout}
        isSaving={saveDashboardLayoutMutation.isPending}
      />
    </>
  );
}
