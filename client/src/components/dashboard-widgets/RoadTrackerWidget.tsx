import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Route } from "lucide-react";
import type { ProjectWithRoads } from "@shared/schema";

interface RoadTrackerWidgetProps {
  project: ProjectWithRoads;
  isFullWidth?: boolean;
}

export default function RoadTrackerWidget({ project, isFullWidth = false }: RoadTrackerWidgetProps) {
  // Calculate layer progress for dual and single carriageways
  const getLayerProgress = (road: any, layer: any) => {
    const roadLength = parseFloat(road.length);
    const isDualCarriageway = road.carriageway === 'dual';
    
    if (!layer.progress || layer.progress.length === 0) {
      return { percentage: 0, completedLength: 0 };
    }
    
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
      
      // Average of LHS and RHS
      const avgCompletedLength = (lhsProgress + rhsProgress) / 2;
      const percentage = (avgCompletedLength / roadLength) * 100;
      
      return {
        percentage: Math.min(percentage, 100),
        completedLength: avgCompletedLength,
      };
    } else {
      // Single carriageway
      const completedLength = layer.progress.reduce((sum: number, prog: any) => {
        const start = parseFloat(prog.startChainage as any);
        const end = parseFloat(prog.endChainage as any);
        if (isNaN(start) || isNaN(end) || end <= start) return sum;
        return sum + (end - start);
      }, 0);
      
      const percentage = (completedLength / roadLength) * 100;
      
      return {
        percentage: Math.min(percentage, 100),
        completedLength,
      };
    }
  };

  const hasRoadData = project.projectType === "Road" && project.roads && project.roads.length > 0;

  return (
    <Card data-testid="widget-road-tracker" className={isFullWidth ? "h-full" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Route className="h-5 w-5" />
          Road Progress Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasRoadData ? (
          <div className={isFullWidth ? "max-h-[500px] overflow-y-auto" : "max-h-80 overflow-y-auto"}>
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
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : percentage >= 50
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                            }`}>
                              {percentage.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : null
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-no-road-data">
            {project.projectType !== "Road" 
              ? "This widget is only available for road projects"
              : "No road data available. Add roads to see progress tracking."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
