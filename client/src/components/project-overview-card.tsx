import { Link } from "wouter";
import { MoreVertical, Edit, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { ProjectWithRoads } from "@shared/schema";

interface ProjectOverviewCardProps {
  project: ProjectWithRoads;
  currentUserId?: string;
  onEdit?: (project: ProjectWithRoads) => void;
  onDuplicate?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
}

export default function ProjectOverviewCard({ 
  project, 
  currentUserId,
  onEdit, 
  onDuplicate, 
  onDelete 
}: ProjectOverviewCardProps) {
  const isOwner = currentUserId && project.userId === currentUserId;
  const isCollaborator = currentUserId && project.userId !== currentUserId;
  // Calculate overall progress based on layer completion with road-length weighting
  const calculateOverallProgress = () => {
    if (!project.roads || project.roads.length === 0) return 0;
    
    // First, calculate total project length
    const totalProjectLength = project.roads.reduce((sum, road) => sum + Number(road.length), 0);
    if (totalProjectLength === 0) return 0;
    
    let weightedProgress = 0;
    
    project.roads.forEach(road => {
      const roadLength = Number(road.length);
      const roadWeight = roadLength / totalProjectLength; // Road's contribution to overall progress
      
      if (road.layers && road.layers.length > 0) {
        let roadProgress = 0;
        let totalLayerWeight = 0;
        
        road.layers.forEach(layer => {
          const layerWeight = layer.weight || 1;
          totalLayerWeight += layerWeight;
          
          if (layer.progress && layer.progress.length > 0) {
            const completedLength = layer.progress.reduce((sum, prog) => {
              return sum + (Number(prog.endChainage) - Number(prog.startChainage));
            }, 0);
            
            const layerProgress = (completedLength / roadLength) * 100;
            roadProgress += layerProgress * layerWeight;
          }
        });
        
        // Calculate this road's weighted progress
        const thisRoadProgress = totalLayerWeight > 0 ? roadProgress / totalLayerWeight : 0;
        weightedProgress += thisRoadProgress * roadWeight;
      }
    });
    
    return Math.min(100, Math.round(weightedProgress));
  };

  // Calculate layer progress summary
  const calculateLayerSummary = () => {
    const layerMap = new Map<string, { total: number; completed: number; weight: number }>();
    
    project.roads?.forEach(road => {
      road.layers?.forEach(layer => {
        const existing = layerMap.get(layer.name) || { total: 0, completed: 0, weight: 0 };
        
        const roadLength = Number(road.length);
        existing.total += roadLength;
        existing.weight += layer.weight || 1;
        
        if (layer.progress && layer.progress.length > 0) {
          const completedLength = layer.progress.reduce((sum, prog) => {
            return sum + (Number(prog.endChainage) - Number(prog.startChainage));
          }, 0);
          existing.completed += completedLength;
        }
        
        layerMap.set(layer.name, existing);
      });
    });
    
    return Array.from(layerMap.entries()).map(([name, data]) => ({
      name,
      percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));
  };

  // Determine project status
  const getStatus = () => {
    const progress = calculateOverallProgress();
    const today = new Date();
    const endDate = project.endDate ? new Date(project.endDate) : null;
    
    if (progress === 100) return { label: "Completed", color: "bg-green-100 text-green-800" };
    if (endDate && today > endDate && progress < 100) return { label: "Delayed", color: "bg-red-100 text-red-800" };
    if (progress > 0) return { label: "In Progress", color: "bg-blue-100 text-blue-800" };
    return { label: "On Hold", color: "bg-gray-100 text-gray-800" };
  };

  const overallProgress = calculateOverallProgress();
  const layerSummary = calculateLayerSummary();
  const status = getStatus();

  // Get progress bar color
  const getProgressColor = () => {
    if (overallProgress >= 100) return "bg-green-500";
    if (status.label === "Delayed") return "bg-red-500";
    if (overallProgress >= 50) return "bg-orange-500";
    return "bg-orange-500";
  };

  return (
    <div 
      className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow relative"
      data-testid={`card-project-overview-${project.id}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <Link href={`/projects/${project.id}`} className="flex-1 cursor-pointer">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-card-foreground hover:text-orange-500 transition-colors" data-testid="text-project-name">
                {project.name}
              </h3>
              {isCollaborator && (
                <span 
                  className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                  data-testid="badge-collaborator"
                >
                  Collaborator
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-project-id">
              Project ID: #{project.client}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span 
            className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}
            data-testid="badge-project-status"
          >
            {status.label}
          </span>
          
          {/* Kebab Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                data-testid={`button-menu-${project.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(project);
                }}
                data-testid={`button-edit-${project.id}`}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate?.(project.id);
                }}
                data-testid={`button-duplicate-${project.id}`}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(project.id);
                }}
                className="text-red-600 focus:text-red-600"
                data-testid={`button-delete-${project.id}`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Overall Progress */}
      <Link href={`/projects/${project.id}`} className="block cursor-pointer">
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
            <span className="text-xl font-bold text-card-foreground" data-testid="text-overall-progress">
              {overallProgress}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className={`${getProgressColor()} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Layer Progress */}
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Layer Progress</h4>
          {layerSummary.length > 0 ? (
            <div className="space-y-2">
              {layerSummary.map((layer, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-card-foreground">{layer.name}:</span>
                  <span className="font-medium text-card-foreground" data-testid={`text-layer-progress-${index}`}>
                    {layer.percentage}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No layers defined</p>
          )}
        </div>
      </Link>
    </div>
  );
}
