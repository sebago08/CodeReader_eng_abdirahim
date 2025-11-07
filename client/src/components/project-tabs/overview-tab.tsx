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
import { getLayoutTemplate, getSlotConfig, isFullWidthSlot } from "@/config/dashboard-layouts";

interface OverviewTabProps {
  project: ProjectWithRoads;
}

// Helper to check if layout is legacy format
function isLegacyLayout(layout: any): boolean {
  return layout && 'topLeft' in layout;
}

// Convert legacy quadrant format to new slot format
function convertLegacyToNewFormat(legacy: any): DashboardLayout {
  return {
    layoutType: "grid-4",
    widgets: {
      slot1: legacy.topLeft,
      slot2: legacy.topRight,
      slot3: legacy.bottomLeft,
      slot4: legacy.bottomRight,
    },
    widgetConfig: legacy.widgetConfig || {},
  };
}

export default function OverviewTab({ project }: OverviewTabProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  const DEFAULT_LAYOUT: DashboardLayout = {
    layoutType: "grid-4",
    widgets: {
      slot1: "basic-info",
      slot2: "financial",
      slot3: "progress",
      slot4: "action-points",
    },
    widgetConfig: {},
  };

  // Handle both old and new layout formats
  let currentLayout: DashboardLayout = DEFAULT_LAYOUT;
  if (project.dashboardLayout) {
    const savedLayout = project.dashboardLayout as any;
    currentLayout = isLegacyLayout(savedLayout) 
      ? convertLegacyToNewFormat(savedLayout)
      : (savedLayout as DashboardLayout);
  }

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

  const handleWidgetConfigChange = (widgetId: string, config: any) => {
    const updatedLayout = {
      ...currentLayout,
      widgetConfig: {
        ...currentLayout.widgetConfig,
        [widgetId]: config,
      },
    };
    saveDashboardLayoutMutation.mutate(updatedLayout);
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

        <div className={getLayoutTemplate(currentLayout.layoutType).gridClass}>
          {Object.entries(currentLayout.widgets).map(([slotKey, widgetId]) => {
            const slotNumber = parseInt(slotKey.replace('slot', ''));
            const slotClass = getSlotConfig(currentLayout.layoutType, slotNumber);
            const isFullWidth = isFullWidthSlot(currentLayout.layoutType, slotNumber);
            
            return (
              <div key={slotKey} className={slotClass}>
                <WidgetRenderer 
                  widgetId={widgetId} 
                  project={project} 
                  widgetConfig={currentLayout.widgetConfig || {}}
                  onConfigChange={handleWidgetConfigChange}
                  isFullWidth={isFullWidth}
                />
              </div>
            );
          })}
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
