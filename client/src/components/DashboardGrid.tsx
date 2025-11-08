import type { ProjectWithRoads } from "@shared/schema";
import { widgetRegistry, defaultLayout, type DashboardLayout } from "@/lib/widgetRegistry";

interface DashboardGridProps {
  project: ProjectWithRoads;
  layout?: DashboardLayout | null;
}

export default function DashboardGrid({ project, layout }: DashboardGridProps) {
  const activeLayout = (layout as DashboardLayout) || defaultLayout;

  const renderWidget = (widgetId: string) => {
    const widget = widgetRegistry[widgetId as keyof typeof widgetRegistry];
    if (!widget) return null;
    
    const WidgetComponent = widget.component;
    return <WidgetComponent key={widgetId} project={project} />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="dashboard-grid">
      {renderWidget(activeLayout.topLeft)}
      {renderWidget(activeLayout.topRight)}
      {renderWidget(activeLayout.bottomLeft)}
      {renderWidget(activeLayout.bottomRight)}
    </div>
  );
}
