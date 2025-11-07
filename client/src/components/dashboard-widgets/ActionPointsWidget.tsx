import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectWithRoads } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import type { ProjectAlerts } from "@shared/schema";
import { useState } from "react";

interface ActionPointsWidgetProps {
  project: ProjectWithRoads;
}

// Mock action points as fallback
const mockActionPoints = [
  { id: "1", description: "Submit updated budget", completed: false },
  { id: "2", description: "Finalize subcontractor agreements", completed: false },
  { id: "3", description: "Review safety inspection report", completed: false },
  { id: "4", description: "Schedule next stakeholder meeting", completed: false },
];

export default function ActionPointsWidget({ project }: ActionPointsWidgetProps) {
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  // Fetch project alerts (which includes action points)
  const { data: alerts } = useQuery<ProjectAlerts>({
    queryKey: [`/api/projects/${project.id}/alerts`],
    enabled: !!project.id,
  });

  // Use API data if available, otherwise use mock data
  const actionPoints = alerts?.actionPoints && alerts.actionPoints.length > 0
    ? alerts.actionPoints.map(point => ({
        id: point.id,
        description: point.description,
        completed: point.status === "completed",
      }))
    : mockActionPoints;

  const handleToggle = (id: string) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Card data-testid="widget-action-points">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Action Points
        </CardTitle>
        <Button variant="ghost" size="icon" data-testid="button-widget-menu">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actionPoints.map((point) => {
            const isCompleted = completedItems.has(point.id) || point.completed;
            return (
              <div
                key={point.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                data-testid={`action-point-${point.id}`}
              >
                <Checkbox
                  id={`action-${point.id}`}
                  checked={isCompleted}
                  onCheckedChange={() => handleToggle(point.id)}
                  data-testid={`checkbox-action-${point.id}`}
                />
                <label
                  htmlFor={`action-${point.id}`}
                  className={`text-sm flex-1 cursor-pointer ${
                    isCompleted ? "line-through text-muted-foreground" : ""
                  }`}
                  data-testid={`text-action-description-${point.id}`}
                >
                  {point.description}
                </label>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
