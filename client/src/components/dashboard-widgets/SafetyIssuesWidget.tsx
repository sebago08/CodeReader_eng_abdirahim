import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectWithRoads } from "@shared/schema";

interface SafetyIssuesWidgetProps {
  project: ProjectWithRoads;
}

// Mock safety issues data
const mockSafetyIssues = [
  {
    id: "1",
    description: "Missing safety barriers at excavation site",
    severity: "critical" as const,
    date: "2024-11-05",
  },
  {
    id: "2",
    description: "Incomplete PPE compliance documentation",
    severity: "high" as const,
    date: "2024-11-03",
  },
  {
    id: "3",
    description: "Fire extinguisher maintenance overdue",
    severity: "medium" as const,
    date: "2024-11-01",
  },
];

export default function SafetyIssuesWidget({ project }: SafetyIssuesWidgetProps) {
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return (
          <Badge className="bg-red-600 text-white" data-testid={`badge-severity-${severity}`}>
            Critical
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-orange-500 text-white" data-testid={`badge-severity-${severity}`}>
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-500 text-white" data-testid={`badge-severity-${severity}`}>
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-blue-500 text-white" data-testid={`badge-severity-${severity}`}>
            Low
          </Badge>
        );
      default:
        return <Badge variant="secondary" data-testid={`badge-severity-${severity}`}>Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card data-testid="widget-safety-issues">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Safety Issues
        </CardTitle>
        <Button variant="ghost" size="icon" data-testid="button-widget-menu">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockSafetyIssues.length > 0 ? (
            mockSafetyIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                data-testid={`safety-issue-${issue.id}`}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium" data-testid={`text-issue-description-${issue.id}`}>
                    {issue.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1" data-testid={`text-issue-date-${issue.id}`}>
                    {formatDate(issue.date)}
                  </p>
                </div>
                {getSeverityBadge(issue.severity)}
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground" data-testid="text-no-safety-issues">
                No safety issues reported
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
