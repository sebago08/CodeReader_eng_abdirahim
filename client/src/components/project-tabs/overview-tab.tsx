import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Calendar, MapPin, User, FileText, Building2 } from "lucide-react";
import ProjectModal from "@/components/project-modal";
import { queryClient } from "@/lib/queryClient";
import type { ProjectWithRoads } from "@shared/schema";

interface OverviewTabProps {
  project: ProjectWithRoads;
}

export default function OverviewTab({ project }: OverviewTabProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Completed":
        return "bg-blue-500";
      case "On Hold":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Edit Button */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-project-name">
              {project.name}
            </h2>
            <Badge className={`${getStatusColor(project.status)} text-white`} data-testid="badge-project-status">
              {project.status}
            </Badge>
          </div>
          <Button onClick={() => setIsEditModalOpen(true)} data-testid="button-edit-project">
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>

        {/* Project Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>Core project details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Client</p>
                  <p className="text-base font-semibold" data-testid="text-project-client">
                    {project.client}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p className="text-base font-semibold" data-testid="text-project-location">
                    {project.location}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Project Type</p>
                  <p className="text-base font-semibold" data-testid="text-project-type">
                    {project.projectType || "Road"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
              <CardDescription>Project schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="text-base font-semibold" data-testid="text-project-start-date">
                    {formatDate(project.startDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="text-base font-semibold" data-testid="text-project-end-date">
                    {formatDate(project.endDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {project.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-project-description">
                {project.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <ProjectModal
          project={project}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
          }}
        />
      )}
    </>
  );
}
