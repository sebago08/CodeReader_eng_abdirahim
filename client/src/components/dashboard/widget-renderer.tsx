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
} from "@/components/dashboard-widgets";

interface WidgetRendererProps {
  widgetId: string;
  project: ProjectWithRoads;
}

export default function WidgetRenderer({ widgetId, project }: WidgetRendererProps) {
  switch (widgetId) {
    case "basic-info":
      return <BasicInfoWidget project={project} />;
    case "financial":
      return <FinancialWidget project={project} />;
    case "progress":
      return <ProgressWidget project={project} />;
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
    default:
      // Fallback to Basic Info if widget ID is unknown
      return <BasicInfoWidget project={project} />;
  }
}
