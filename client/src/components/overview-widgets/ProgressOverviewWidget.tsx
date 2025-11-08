import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProjectWithRoads } from "@shared/schema";

interface ProgressOverviewWidgetProps {
  project: ProjectWithRoads;
}

export default function ProgressOverviewWidget({ project }: ProgressOverviewWidgetProps) {
  // Calculate Physical Progress with road-length weighting
  const calculatePhysicalProgress = (): number => {
    if (project.projectType === "Road" && project.roads && project.roads.length > 0) {
      const totalProjectLength = project.roads.reduce((sum, road) => {
        const roadLength = parseFloat(road.length);
        return !roadLength || roadLength <= 0 || isNaN(roadLength) ? sum : sum + roadLength;
      }, 0);
      
      if (totalProjectLength === 0) return 0;
      
      let weightedProgress = 0;

      project.roads.forEach((road) => {
        const roadLength = parseFloat(road.length);
        if (!roadLength || roadLength <= 0 || isNaN(roadLength)) {
          return;
        }

        const roadWeight = roadLength / totalProjectLength;
        const isDualCarriageway = road.carriageway === 'dual';
        let roadProgress = 0;
        let totalLayerWeight = 0;

        road.layers?.forEach((layer) => {
          const layerWeight = layer.weight || 1;
          totalLayerWeight += layerWeight;
          
          if (layer.progress && layer.progress.length > 0) {
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
              const layerProgress = (lhsPercentage + rhsPercentage) / 2;
              
              roadProgress += layerProgress * layerWeight;
            } else {
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

        if (totalLayerWeight > 0) {
          roadProgress = roadProgress / totalLayerWeight;
        }

        weightedProgress += roadProgress * roadWeight;
      });

      return Math.round(weightedProgress);
    }
    return 0;
  };

  // Calculate Time Lapse
  const calculateTimeLapse = (): number => {
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const today = new Date();

    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = today.getTime() - startDate.getTime();

    if (totalDuration <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  };

  const physicalProgress = calculatePhysicalProgress();
  const timeProgress = calculateTimeLapse();

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Progress Overview</h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Physical Progress</span>
              <span className="text-sm font-bold" data-testid="text-physical-progress">{physicalProgress}%</span>
            </div>
            <Progress value={physicalProgress} className="h-3" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Time Progress</span>
              <span className="text-sm font-bold" data-testid="text-time-progress">{timeProgress}%</span>
            </div>
            <Progress value={timeProgress} className="h-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
