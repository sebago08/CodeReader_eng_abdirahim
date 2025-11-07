import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectWithRoads } from "@shared/schema";

interface MilestonesWidgetProps {
  project: ProjectWithRoads;
}

// Mock milestones data
const mockMilestones = [
  {
    id: "1",
    name: "Site Mobilization",
    date: "2024-11-15",
    status: "completed" as const,
  },
  {
    id: "2",
    name: "Foundation Complete",
    date: "2024-12-20",
    status: "in-progress" as const,
  },
  {
    id: "3",
    name: "Structure Completion",
    date: "2025-02-28",
    status: "upcoming" as const,
  },
  {
    id: "4",
    name: "Final Inspection",
    date: "2025-04-15",
    status: "upcoming" as const,
  },
];

export default function MilestonesWidget({ project }: MilestonesWidgetProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 text-white" data-testid={`badge-status-${status}`}>Completed</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-500 text-white" data-testid={`badge-status-${status}`}>In Progress</Badge>;
      case "upcoming":
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>Upcoming</Badge>;
      default:
        return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Unknown</Badge>;
    }
  };

  return (
    <Card data-testid="widget-milestones">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Milestones
        </CardTitle>
        <Button variant="ghost" size="icon" data-testid="button-widget-menu">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-start justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              data-testid={`milestone-${milestone.id}`}
            >
              <div className="flex-1">
                <p className="text-sm font-semibold" data-testid={`text-milestone-name-${milestone.id}`}>
                  {milestone.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1" data-testid={`text-milestone-date-${milestone.id}`}>
                  {formatDate(milestone.date)}
                </p>
              </div>
              {getStatusBadge(milestone.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
