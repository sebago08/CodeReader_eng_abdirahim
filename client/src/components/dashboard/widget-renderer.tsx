import type { ProjectWithRoads } from "@shared/schema";
import {
  BasicInfoWidget,
  FinancialWidget,
  ProgressWidget,
  TeamMembersWidget,
  ActionPointsWidget,
  MilestonesWidget,
  SafetyIssuesWidget,
  RecentUpdatesWidget,
  RoadTrackerWidget,
} from "@/components/dashboard-widgets";

interface WidgetRendererProps {
  widgetId: string;
  project: ProjectWithRoads;
  widgetConfig?: Record<string, any>;
  onConfigChange?: (widgetId: string, config: any) => void;
  isFullWidth?: boolean;
}

export default function WidgetRenderer({ 
  widgetId, 
  project, 
  widgetConfig = {},
  onConfigChange,
  isFullWidth = false
}: WidgetRendererProps) {
  const handleConfigChange = (config: any) => {
    onConfigChange?.(widgetId, config);
  };

  const currentWidgetConfig = widgetConfig[widgetId] || {};

  switch (widgetId) {
    case "basic-info":
      return <BasicInfoWidget project={project} />;
    case "financial":
      return (
        <FinancialWidget 
          project={project} 
          widgetConfig={currentWidgetConfig}
          onConfigChange={handleConfigChange}
        />
      );
    case "progress":
      return (
        <ProgressWidget 
          project={project}
          widgetConfig={currentWidgetConfig}
          onConfigChange={handleConfigChange}
        />
      );
    case "team-members":
      return <TeamMembersWidget project={project} />;
    case "action-points":
      return <ActionPointsWidget project={project} />;
    case "milestones":
      return <MilestonesWidget project={project} />;
    case "safety":
      return <SafetyIssuesWidget project={project} />;
    case "recent-updates":
      return <RecentUpdatesWidget project={project} />;
    case "road-tracker":
      return <RoadTrackerWidget project={project} isFullWidth={isFullWidth} />;
    default:
      // Fallback to Basic Info if widget ID is unknown
      return <BasicInfoWidget project={project} />;
  }
}
