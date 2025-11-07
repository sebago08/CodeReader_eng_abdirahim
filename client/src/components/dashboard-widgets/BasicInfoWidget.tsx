import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MapPin, Calendar, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectWithRoads } from "@shared/schema";

interface BasicInfoWidgetProps {
  project: ProjectWithRoads;
}

export default function BasicInfoWidget({ project }: BasicInfoWidgetProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card data-testid="widget-basic-info">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
        <Button variant="ghost" size="icon" data-testid="button-widget-menu">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project ID */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium">Project ID</p>
            <p className="text-sm font-semibold" data-testid="text-project-id">
              {project.projectNumber || "N/A"}
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium">Location</p>
            <p className="text-sm font-semibold" data-testid="text-location">
              {project.location}
            </p>
          </div>
        </div>

        {/* Start Date */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium">Start Date</p>
            <p className="text-sm font-semibold" data-testid="text-start-date">
              {formatDate(project.startDate)}
            </p>
          </div>
        </div>

        {/* End Date */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium">End Date</p>
            <p className="text-sm font-semibold" data-testid="text-end-date">
              {formatDate(project.endDate)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
