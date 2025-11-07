import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectWithRoads } from "@shared/schema";

interface RecentUpdatesWidgetProps {
  project: ProjectWithRoads;
}

// Mock recent updates data
const mockUpdates = [
  {
    id: "1",
    activity: "Progress report submitted for October",
    timestamp: "2024-11-05T14:30:00",
    user: "Aisha Mohamed",
  },
  {
    id: "2",
    activity: "Payment certificate #5 approved",
    timestamp: "2024-11-04T09:15:00",
    user: "Finance Department",
  },
  {
    id: "3",
    activity: "Safety inspection completed",
    timestamp: "2024-11-03T16:45:00",
    user: "Omar Hassan",
  },
  {
    id: "4",
    activity: "New team member added",
    timestamp: "2024-11-02T11:20:00",
    user: "Aisha Mohamed",
  },
];

export default function RecentUpdatesWidget({ project }: RecentUpdatesWidgetProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <Card data-testid="widget-recent-updates">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Updates
        </CardTitle>
        <Button variant="ghost" size="icon" data-testid="button-widget-menu">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockUpdates.map((update) => (
            <div
              key={update.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-l-2 border-blue-500"
              data-testid={`update-${update.id}`}
            >
              <div className="flex-1">
                <p className="text-sm font-medium" data-testid={`text-update-activity-${update.id}`}>
                  {update.activity}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground" data-testid={`text-update-user-${update.id}`}>
                    by {update.user}
                  </p>
                  <span className="text-xs text-muted-foreground">•</span>
                  <p className="text-xs text-muted-foreground" data-testid={`text-update-time-${update.id}`}>
                    {formatTimestamp(update.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
