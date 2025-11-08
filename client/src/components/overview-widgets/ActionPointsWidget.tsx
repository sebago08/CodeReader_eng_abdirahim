import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ProjectAlerts } from "@shared/schema";

interface ActionPointsWidgetProps {
  projectId: string;
}

export default function ActionPointsWidget({ projectId }: ActionPointsWidgetProps) {
  const { data: alerts } = useQuery<ProjectAlerts>({
    queryKey: [`/api/projects/${projectId}/alerts`],
    enabled: !!projectId,
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold">Action Points</h3>
        </div>
        {!alerts || alerts.actionPoints.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No overdue action points</p>
        ) : (
          <div className="space-y-3">
            {alerts.actionPoints.slice(0, 4).map((actionPoint) => (
              <div key={actionPoint.id} className="border-l-4 border-orange-500 pl-3 py-2" data-testid={`action-point-${actionPoint.id}`}>
                <p className="text-sm font-semibold line-clamp-2">
                  {actionPoint.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-xs ${
                    actionPoint.priority === 'high' ? 'border-red-500 text-red-700' :
                    actionPoint.priority === 'medium' ? 'border-orange-500 text-orange-700' :
                    'border-yellow-500 text-yellow-700'
                  }`}>
                    {actionPoint.priority}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {actionPoint.daysOverdue} day{actionPoint.daysOverdue !== 1 ? 's' : ''} overdue
                  </p>
                </div>
                {actionPoint.assignedTo && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigned: {actionPoint.assignedTo}
                  </p>
                )}
              </div>
            ))}
            {alerts.actionPoints.length > 4 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                + {alerts.actionPoints.length - 4} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
