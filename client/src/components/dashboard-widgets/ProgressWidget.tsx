import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, BarChart3, List } from "lucide-react";
import type { ProjectWithRoads } from "@shared/schema";
import WidgetKebabMenu from "@/components/dashboard/widget-kebab-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProgressWidgetProps {
  project: ProjectWithRoads;
  widgetConfig?: { viewMode?: string };
  onConfigChange?: (config: { viewMode: string }) => void;
}

export default function ProgressWidget({ 
  project, 
  widgetConfig = {}, 
  onConfigChange 
}: ProgressWidgetProps) {
  const [viewMode, setViewMode] = useState(widgetConfig.viewMode || "bars");
  // Calculate Physical Progress with road-length weighting
  const calculatePhysicalProgress = (): number => {
    if (project.projectType === "Road" && project.roads && project.roads.length > 0) {
      // First, calculate total project length
      const totalProjectLength = project.roads.reduce((sum, road) => {
        const roadLength = parseFloat(road.length);
        return !roadLength || roadLength <= 0 || isNaN(roadLength) ? sum : sum + roadLength;
      }, 0);
      
      if (totalProjectLength === 0) return 0;
      
      let weightedProgress = 0;

      project.roads.forEach((road) => {
        // Validate road length
        const roadLength = parseFloat(road.length);
        if (!roadLength || roadLength <= 0 || isNaN(roadLength)) {
          return; // Skip roads with invalid lengths
        }

        const roadWeight = roadLength / totalProjectLength; // Road's contribution to overall progress
        const isDualCarriageway = road.carriageway === 'dual';
        let roadProgress = 0;
        let totalLayerWeight = 0;

        road.layers?.forEach((layer) => {
          const layerWeight = layer.weight || 1;
          totalLayerWeight += layerWeight;
          
          if (layer.progress && layer.progress.length > 0) {
            if (isDualCarriageway) {
              // For dual carriageway, calculate LHS and RHS separately and average them
              const lhsProgress = layer.progress
                .filter((prog: any) => prog.carriagewaySide?.toUpperCase() === 'LHS' || prog.carriagewaySide?.toLowerCase() === 'both')
                .reduce((sum: number, prog: any) => {
                  const start = parseFloat(prog.startChainage as any);
                  const end = parseFloat(prog.endChainage as any);
                  if (isNaN(start) || isNaN(end) || end <= start) return sum;
                  return sum + (end - start);
                }, 0);
              
              const rhsProgress = layer.progress
                .filter((prog: any) => prog.carriagewaySide?.toUpperCase() === 'RHS' || prog.carriagewaySide?.toLowerCase() === 'both')
                .reduce((sum: number, prog: any) => {
                  const start = parseFloat(prog.startChainage as any);
                  const end = parseFloat(prog.endChainage as any);
                  if (isNaN(start) || isNaN(end) || end <= start) return sum;
                  return sum + (end - start);
                }, 0);
              
              const lhsPercentage = Math.min(100, (lhsProgress / roadLength) * 100);
              const rhsPercentage = Math.min(100, (rhsProgress / roadLength) * 100);
              const layerProgress = (lhsPercentage + rhsPercentage) / 2;
              
              roadProgress += layerProgress * layerWeight;
            } else {
              // For single carriageway, sum all progress
              const completedLength = layer.progress.reduce((sum, prog) => {
                const start = parseFloat(prog.startChainage as any);
                const end = parseFloat(prog.endChainage as any);
                if (isNaN(start) || isNaN(end) || end <= start) return sum;
                return sum + (end - start);
              }, 0);
              const layerProgress = Math.min(100, (completedLength / roadLength) * 100);
              roadProgress += layerProgress * layerWeight;
            }
          }
        });
        
        // Calculate this road's weighted progress and add to overall
        const thisRoadProgress = totalLayerWeight > 0 ? roadProgress / totalLayerWeight : 0;
        weightedProgress += thisRoadProgress * roadWeight;
      });

      return Math.min(100, Math.round(weightedProgress));
    }
    
    // For non-road projects, would use activities (not implemented in this view)
    return 0;
  };

  // Calculate Time Lapse
  const calculateTimeLapse = (): number => {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const today = new Date();

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Handle invalid or zero duration
    if (totalDays <= 0) {
      return 0; // Return 0% for invalid project durations
    }

    const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Allow percentage to exceed 100% for overdue projects
    const percentage = Math.round((elapsedDays / totalDays) * 100);
    return Math.max(0, percentage); // Allow values > 100% to show overdue status
  };

  const physicalProgress = calculatePhysicalProgress();
  const timeProgress = calculateTimeLapse();

  const handleViewChange = (newView: string) => {
    setViewMode(newView);
    onConfigChange?.({ viewMode: newView });
  };

  const viewOptions = [
    { value: "bars", label: "Progress Bars", icon: <BarChart3 className="h-4 w-4" /> },
    { value: "linear", label: "Linear Tracker", icon: <List className="h-4 w-4" /> },
  ];

  // Calculate layer progress for linear tracker view
  const getLayerProgress = (road: any, layer: any) => {
    const roadLength = parseFloat(road.length);
    if (!roadLength || roadLength <= 0 || isNaN(roadLength)) {
      return { percentage: 0, completedLength: 0 };
    }

    const isDualCarriageway = road.carriageway === 'dual';
    
    if (!layer.progress || layer.progress.length === 0) {
      return { percentage: 0, completedLength: 0 };
    }

    if (isDualCarriageway) {
      const lhsProgress = layer.progress
        .filter((prog: any) => prog.carriagewaySide?.toUpperCase() === 'LHS' || prog.carriagewaySide?.toLowerCase() === 'both')
        .reduce((sum: number, prog: any) => {
          const start = parseFloat(prog.startChainage as any);
          const end = parseFloat(prog.endChainage as any);
          if (isNaN(start) || isNaN(end) || end <= start) return sum;
          return sum + (end - start);
        }, 0);
      
      const rhsProgress = layer.progress
        .filter((prog: any) => prog.carriagewaySide?.toUpperCase() === 'RHS' || prog.carriagewaySide?.toLowerCase() === 'both')
        .reduce((sum: number, prog: any) => {
          const start = parseFloat(prog.startChainage as any);
          const end = parseFloat(prog.endChainage as any);
          if (isNaN(start) || isNaN(end) || end <= start) return sum;
          return sum + (end - start);
        }, 0);
      
      const lhsPercentage = Math.min(100, (lhsProgress / roadLength) * 100);
      const rhsPercentage = Math.min(100, (rhsProgress / roadLength) * 100);
      const avgPercentage = (lhsPercentage + rhsPercentage) / 2;
      
      return { 
        percentage: Math.round(avgPercentage), 
        completedLength: Math.round((lhsProgress + rhsProgress) / 2 * 100) / 100
      };
    } else {
      const completedLength = layer.progress.reduce((sum: number, prog: any) => {
        const start = parseFloat(prog.startChainage as any);
        const end = parseFloat(prog.endChainage as any);
        if (isNaN(start) || isNaN(end) || end <= start) return sum;
        return sum + (end - start);
      }, 0);
      
      const percentage = Math.min(100, (completedLength / roadLength) * 100);
      return { 
        percentage: Math.round(percentage), 
        completedLength: Math.round(completedLength * 100) / 100
      };
    }
  };

  return (
    <Card data-testid="widget-progress">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {viewMode === "bars" ? "Progress Tracker" : "Linear Tracker"}
        </CardTitle>
        <WidgetKebabMenu
          currentView={viewMode}
          viewOptions={viewOptions}
          onViewChange={handleViewChange}
        />
      </CardHeader>
      <CardContent>
        {viewMode === "bars" ? (
          <div className="space-y-6">
            {/* Physical Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Physical Progress</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400" data-testid="text-physical-progress">
                  {physicalProgress}%
                </span>
              </div>
              <Progress value={physicalProgress} className="h-3" />
            </div>

            {/* Time Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Time Progress</span>
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400" data-testid="text-time-progress">
                  {timeProgress}%
                </span>
              </div>
              <Progress value={Math.min(100, timeProgress)} className="h-3" />
              {timeProgress > 100 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Project is overdue
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {project.projectType === "Road" && project.roads && project.roads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Road</TableHead>
                    <TableHead>Layer</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.roads.map((road) => (
                    road.layers && road.layers.length > 0 ? (
                      road.layers.map((layer, layerIndex) => {
                        const { percentage, completedLength } = getLayerProgress(road, layer);
                        const roadLength = parseFloat(road.length);
                        
                        return (
                          <TableRow 
                            key={`${road.id}-${layer.id}`} 
                            data-testid={`row-linear-tracker-${road.id}-${layer.id}`}
                          >
                            {layerIndex === 0 ? (
                              <TableCell 
                                className="font-medium" 
                                rowSpan={road.layers?.length || 1}
                                data-testid={`cell-road-name-${road.id}`}
                              >
                                {road.name}
                              </TableCell>
                            ) : null}
                            <TableCell 
                              className="text-sm"
                              data-testid={`cell-layer-name-${layer.id}`}
                            >
                              {layer.name}
                            </TableCell>
                            <TableCell 
                              className="text-right text-sm"
                              data-testid={`cell-completed-length-${layer.id}`}
                            >
                              {completedLength.toFixed(2)} / {roadLength.toFixed(2)} km
                            </TableCell>
                            <TableCell 
                              className="text-right"
                              data-testid={`cell-progress-percentage-${layer.id}`}
                            >
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                percentage === 100 
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : percentage >= 50
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              }`}>
                                {percentage}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow key={road.id}>
                        <TableCell className="font-medium">{road.name}</TableCell>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No layers defined
                        </TableCell>
                      </TableRow>
                    )
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-linear-data">
                No road data available for linear tracker
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
