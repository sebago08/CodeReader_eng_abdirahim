import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";

interface ProjectWorkPlanTabProps {
  projectId: string;
}

export default function ProjectWorkPlanTab({ projectId }: ProjectWorkPlanTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Work Plan</h2>
          <p className="text-muted-foreground text-sm mt-1">Schedule activities and track timeline</p>
        </div>
        <Button data-testid="button-create-work-plan">
          <Plus className="w-4 h-4 mr-2" />
          Create Work Plan
        </Button>
      </div>

      {/* Placeholder - Will be implemented in Task 5 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-muted-foreground" />
            <div>
              <CardTitle>Activity Scheduling</CardTitle>
              <CardDescription>Plan and track project activities and milestones</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Work plan and activity scheduling will be implemented in Task 5</p>
            <p className="text-sm mt-2">Features: Activities, timelines, milestones, and progress tracking</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
