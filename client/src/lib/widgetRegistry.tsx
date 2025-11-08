import type { ProjectWithRoads } from "@shared/schema";
import BasicInformationWidget from "@/components/overview-widgets/BasicInformationWidget";
import FinancialProgressWidget from "@/components/overview-widgets/FinancialProgressWidget";
import ProgressOverviewWidget from "@/components/overview-widgets/ProgressOverviewWidget";
import ActionPointsWidget from "@/components/overview-widgets/ActionPointsWidget";

export type WidgetId = 'basic-info' | 'financial' | 'progress' | 'action-points';

export interface WidgetConfig {
  id: WidgetId;
  label: string;
  description: string;
  component: React.ComponentType<{ project: ProjectWithRoads }>;
}

export const widgetRegistry: Record<WidgetId, WidgetConfig> = {
  'basic-info': {
    id: 'basic-info',
    label: 'Basic Information',
    description: 'Project ID, location, and dates',
    component: BasicInformationWidget,
  },
  'financial': {
    id: 'financial',
    label: 'Financial Progress',
    description: 'Contract amount, spent, and balance',
    component: FinancialProgressWidget,
  },
  'progress': {
    id: 'progress',
    label: 'Progress Overview',
    description: 'Physical and time progress bars',
    component: ProgressOverviewWidget,
  },
  'action-points': {
    id: 'action-points',
    label: 'Action Points',
    description: 'Overdue action items',
    component: (props) => <ActionPointsWidget projectId={props.project.id} />,
  },
};

export interface DashboardLayout {
  topLeft: WidgetId;
  topRight: WidgetId;
  bottomLeft: WidgetId;
  bottomRight: WidgetId;
}

export const defaultLayout: DashboardLayout = {
  topLeft: 'basic-info',
  topRight: 'financial',
  bottomLeft: 'progress',
  bottomRight: 'action-points',
};

export function getWidgetOptions(): { value: WidgetId; label: string }[] {
  return Object.values(widgetRegistry).map(widget => ({
    value: widget.id,
    label: widget.label,
  }));
}
