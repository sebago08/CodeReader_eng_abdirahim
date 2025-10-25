import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, MapPin, Calendar, DollarSign, Users, Building2 } from "lucide-react";
import type { ProjectWithRoads } from "@shared/schema";

interface ProjectOverviewTabProps {
  project: ProjectWithRoads;
}

export default function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  // Calculate overall progress
  const calculateOverallProgress = () => {
    if (!project?.roads || project.roads.length === 0) return 0;

    let totalProgress = 0;
    let totalWeight = 0;

    project.roads.forEach(road => {
      if (road.layers && road.layers.length > 0) {
        road.layers.forEach(layer => {
          const layerWeight = layer.weight || 1;
          totalWeight += layerWeight;

          if (layer.progress && layer.progress.length > 0) {
            const completedLength = layer.progress.reduce((sum, prog) => {
              return sum + (Number(prog.endChainage) - Number(prog.startChainage));
            }, 0);

            const layerProgress = (completedLength / Number(road.length)) * 100;
            totalProgress += layerProgress * layerWeight;
          }
        });
      }
    });

    return totalWeight > 0 ? Math.min(100, Math.round(totalProgress / totalWeight)) : 0;
  };

  const overallProgress = calculateOverallProgress();

  return (
    <div className="space-y-6">
      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Overall Progress</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-overview-progress">
              {overallProgress}%
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Infrastructure</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-overview-roads">
              {project.roads?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total segments</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Contract Value</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-overview-contract">
              {project.contractAmount ? `$${Number(project.contractAmount).toLocaleString()}` : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total budget</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                project.status === 'active' 
                  ? 'bg-success/10 text-success' 
                  : project.status === 'completed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`} data-testid="badge-overview-status">
                {project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : 'Active'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Project Details</CardTitle>
            <Button variant="ghost" size="icon" data-testid="button-edit-project">
              <Edit className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground">Client</div>
                <div className="text-foreground" data-testid="text-overview-client">{project.client || 'N/A'}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground">Location</div>
                <div className="text-foreground" data-testid="text-overview-location">{project.location || 'N/A'}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground">Timeline</div>
                <div className="text-foreground" data-testid="text-overview-timeline">
                  {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground">Advance Payment</div>
                <div className="text-foreground" data-testid="text-overview-advance">
                  {project.advancePayment ? `$${Number(project.advancePayment).toLocaleString()}` : 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap" data-testid="text-overview-description">
              {project.description || 'No description provided.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Linear Infrastructure Summary */}
      {project.roads && project.roads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Linear Infrastructure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.roads.map((road) => (
                <div 
                  key={road.id} 
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                  data-testid={`road-item-${road.id}`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{road.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Type: {road.infrastructureType || 'Road'} • Length: {road.length}m
                    </div>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {road.layers?.length || 0} layers
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
