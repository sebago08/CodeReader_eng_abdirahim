import { Button } from "@/components/ui/button";
import SegmentedProgress from "@/components/segmented-progress";
import type { ProjectWithRoads } from "@shared/schema";

interface ProjectCardProps {
  project: ProjectWithRoads;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddRoad: () => void;
  onEditRoad: (road: any) => void;
  onAddProgress: (road: any, layerId: string) => void;
  onResetProgress: (layerId: string) => void;
}

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
  onDuplicate,
  onAddRoad,
  onEditRoad,
  onAddProgress,
  onResetProgress,
}: ProjectCardProps) {
  // Calculate planned progress based on dates
  const calculatePlannedProgress = () => {
    if (!project.startDate || !project.endDate) return 0;
    
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const today = new Date();
    
    if (today < start) return 0;
    if (today > end) return 100;
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    return Math.min(100, Math.round((elapsed / totalDuration) * 100));
  };

  // Calculate actual progress based on layer completion
  const calculateActualProgress = () => {
    if (!project.roads || project.roads.length === 0) return 0;
    
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

  const plannedProgress = calculatePlannedProgress();
  const actualProgress = calculateActualProgress();

  // Calculate progress for a specific road
  const calculateRoadProgress = (road: any) => {
    if (!road.layers || road.layers.length === 0) return 0;
    
    let totalProgress = 0;
    let totalWeight = 0;
    
    road.layers.forEach((layer: any) => {
      const layerWeight = layer.weight || 1;
      totalWeight += layerWeight;
      
      if (layer.progress && layer.progress.length > 0) {
        const completedLength = layer.progress.reduce((sum: number, prog: any) => {
          return sum + (Number(prog.endChainage) - Number(prog.startChainage));
        }, 0);
        
        const layerProgress = (completedLength / Number(road.length)) * 100;
        totalProgress += layerProgress * layerWeight;
      }
    });
    
    return totalWeight > 0 ? Math.min(100, Math.round(totalProgress / totalWeight)) : 0;
  };

  return (
    <div className="w-full bg-card rounded-xl shadow-lg border border-border overflow-hidden card-hover" data-testid={`card-project-${project.id}`}>
      <div className="p-6">
        {/* Project Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-card-foreground mb-1" data-testid="text-project-name">
              {project.name}
            </h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <i className="fas fa-building mr-1"></i>
              <span data-testid="text-project-client">{project.client}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onEdit}
              className="text-muted-foreground hover:text-secondary transition-colors"
              title="Edit Project"
              data-testid="button-edit-project"
            >
              <i className="fas fa-edit"></i>
            </button>
            <button
              onClick={onDuplicate}
              className="text-muted-foreground hover:text-secondary transition-colors"
              title="Duplicate Project"
              data-testid="button-duplicate-project"
            >
              <i className="fas fa-copy"></i>
            </button>
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-accent transition-colors"
              title="Delete Project"
              data-testid="button-delete-project"
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
        </div>

        {/* Project Details */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center text-sm">
            <i className="fas fa-map-marker-alt w-4 text-muted-foreground mr-2"></i>
            <span className="text-muted-foreground">Location:</span>
            <span className="ml-1 text-card-foreground" data-testid="text-project-location">
              {project.location}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <i className="fas fa-calendar w-4 text-muted-foreground mr-2"></i>
            <span className="text-muted-foreground">Duration:</span>
            <span className="ml-1 text-card-foreground" data-testid="text-project-duration">
              {project.startDate} to {project.endDate}
            </span>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="space-y-4 mb-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Planned Progress</span>
              <span className="text-sm font-semibold text-secondary" data-testid="text-planned-progress">
                {plannedProgress}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-secondary h-2 rounded-full progress-bar-fill" 
                style={{ width: `${plannedProgress}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">Actual Progress</span>
              <span className="text-sm font-semibold text-green-600" data-testid="text-actual-progress">
                {actualProgress}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full progress-bar-fill" 
                style={{ width: `${actualProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Roads Section */}
        <div className="w-full border-t border-border pt-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-card-foreground flex items-center">
              <i className="fas fa-road mr-2 text-muted-foreground"></i>
              Roads ({project.roads?.length || 0})
            </h4>
            <Button
              onClick={onAddRoad}
              variant="ghost"
              size="sm"
              className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-md hover:bg-secondary hover:text-secondary-foreground transition-colors"
              data-testid="button-add-road"
            >
              Add Road
            </Button>
          </div>
          
          {project.roads && project.roads.length > 0 ? (
            <div className="space-y-4 w-full" data-testid="roads-list">
              {project.roads.map((road) => {
                const roadProgress = calculateRoadProgress(road);
                return (
                <div key={road.id} className="w-full bg-muted/50 rounded-lg p-4" data-testid={`road-item-${road.id}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium" data-testid="text-road-name">{road.name}</span>
                      <span className={`font-semibold text-sm ${
                        roadProgress >= 100 ? 'text-green-600' : 
                        roadProgress >= 50 ? 'text-warning' : 'text-secondary'
                      }`} data-testid="text-road-progress">
                        ({roadProgress}%)
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => onEditRoad(road)}
                        className="text-xs text-muted-foreground hover:text-secondary"
                        data-testid="button-edit-road"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-xs">
                    {road.layers && road.layers.length > 0 ? (
                      road.layers.map((layer) => {
                        if (road.carriageway === 'dual') {
                          // Calculate LHS and RHS progress separately
                          const lhsProgress = layer.progress?.filter(p => p.carriagewaySide === 'lhs').reduce((sum, prog) => {
                            return sum + (Number(prog.endChainage) - Number(prog.startChainage));
                          }, 0) || 0;
                          const rhsProgress = layer.progress?.filter(p => p.carriagewaySide === 'rhs').reduce((sum, prog) => {
                            return sum + (Number(prog.endChainage) - Number(prog.startChainage));
                          }, 0) || 0;
                          
                          const lhsPercentage = Math.round((lhsProgress / Number(road.length)) * 100);
                          const rhsPercentage = Math.round((rhsProgress / Number(road.length)) * 100);
                          const averagePercentage = Math.round((lhsPercentage + rhsPercentage) / 2);
                          
                          return (
                            <div key={layer.id} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                  <span className="text-muted-foreground font-medium">{layer.name}</span>
                                  <span className={`font-semibold text-sm ${
                                    averagePercentage >= 100 ? 'text-green-600' : 
                                    averagePercentage >= 50 ? 'text-warning' : 'text-secondary'
                                  }`} data-testid="text-layer-average-progress">
                                    ({averagePercentage}%)
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => onResetProgress(layer.id)}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                    title="Reset Layer Progress"
                                    data-testid="button-reset-progress"
                                  >
                                    <i className="fas fa-undo"></i>
                                  </button>
                                  <button
                                    onClick={() => onAddProgress(road, layer.id)}
                                    className="text-xs text-muted-foreground hover:text-success"
                                    title="Add Progress"
                                    data-testid="button-add-progress"
                                  >
                                    <i className="fas fa-plus"></i>
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-background p-3 rounded border-l-2 border-blue-500">
                                  <div className="text-xs text-muted-foreground mb-2 font-medium">LHS</div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`font-medium text-xs ${
                                      lhsPercentage >= 100 ? 'text-green-600' : 
                                      lhsPercentage >= 50 ? 'text-warning' : 'text-secondary'
                                    }`} data-testid="text-layer-progress-lhs">
                                      {lhsPercentage}%
                                    </span>
                                  </div>
                                  <SegmentedProgress 
                                    progress={layer.progress || []}
                                    roadLength={Number(road.length)}
                                    carriagewaySide="lhs"
                                    layerId={layer.id}
                                  />
                                </div>
                                <div className="bg-background p-3 rounded border-l-2 border-orange-500">
                                  <div className="text-xs text-muted-foreground mb-2 font-medium">RHS</div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`font-medium text-xs ${
                                      rhsPercentage >= 100 ? 'text-green-600' : 
                                      rhsPercentage >= 50 ? 'text-warning' : 'text-secondary'
                                    }`} data-testid="text-layer-progress-rhs">
                                      {rhsPercentage}%
                                    </span>
                                  </div>
                                  <SegmentedProgress 
                                    progress={layer.progress || []}
                                    roadLength={Number(road.length)}
                                    carriagewaySide="rhs"
                                    layerId={layer.id}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          // Single carriageway - show combined progress
                          const completedLength = layer.progress?.reduce((sum, prog) => {
                            return sum + (Number(prog.endChainage) - Number(prog.startChainage));
                          }, 0) || 0;
                          const layerProgress = Math.round((completedLength / Number(road.length)) * 100);
                          
                          return (
                            <div key={layer.id} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground font-medium">{layer.name}</span>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => onResetProgress(layer.id)}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                    title="Reset Layer Progress"
                                    data-testid="button-reset-progress"
                                  >
                                    <i className="fas fa-undo"></i>
                                  </button>
                                  <button
                                    onClick={() => onAddProgress(road, layer.id)}
                                    className="text-xs text-muted-foreground hover:text-success"
                                    title="Add Progress"
                                    data-testid="button-add-progress"
                                  >
                                    <i className="fas fa-plus"></i>
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className={`font-medium text-xs ${
                                    layerProgress >= 100 ? 'text-green-600' : 
                                    layerProgress >= 50 ? 'text-warning' : 'text-secondary'
                                  }`} data-testid="text-layer-progress">
                                    {layerProgress}%
                                  </span>
                                </div>
                                <SegmentedProgress 
                                  progress={layer.progress || []}
                                  roadLength={Number(road.length)}
                                  carriagewaySide="both"
                                  layerId={layer.id}
                                />
                              </div>
                            </div>
                          );
                        }
                      })
                    ) : (
                      <div className="text-muted-foreground text-center py-2">No layers defined</div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4" data-testid="text-no-roads">
              No roads added yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
