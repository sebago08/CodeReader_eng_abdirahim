import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WorkPlanActivity } from "@shared/schema";
import { Trash2, Flag, ListCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkPlanTabProps {
  projectId: string;
}

export default function WorkPlanTab({ projectId }: WorkPlanTabProps) {
  const { toast } = useToast();
  const [activityName, setActivityName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("");

  // Fetch work plan activities
  const { data: activities = [], isLoading } = useQuery<WorkPlanActivity[]>({
    queryKey: [`/api/projects/${projectId}/work-plan-activities`],
  });

  // Create activity mutation
  const createActivityMutation = useMutation({
    mutationFn: async (activity: { activityName: string; startDate: string; duration: number; endDate: string }) => {
      return await apiRequest("POST", `/api/projects/${projectId}/work-plan-activities`, activity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-plan-activities`] });
      setActivityName("");
      setStartDate("");
      setDuration("");
      toast({
        title: "Activity added",
        description: "Work plan activity has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete activity mutation
  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/work-plan-activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-plan-activities`] });
      toast({
        title: "Activity deleted",
        description: "Work plan activity has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle milestone mutation
  const toggleMilestoneMutation = useMutation({
    mutationFn: async ({ id, isMilestone }: { id: string; isMilestone: boolean }) => {
      return await apiRequest("PATCH", `/api/work-plan-activities/${id}/milestone`, { isMilestone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-plan-activities`] });
    },
  });

  // Calculate end date based on start date and duration
  // A 1-day task starts and ends on the same day, so we add (duration - 1) days
  const calculateEndDate = (start: string, days: number): string => {
    if (!start || !days || isNaN(days)) return "";
    const startDate = new Date(start);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (days - 1));
    return endDate.toISOString().split("T")[0];
  };

  const handleAddActivity = () => {
    if (!activityName.trim() || !startDate || !duration) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields to add an activity.",
        variant: "destructive",
      });
      return;
    }

    const durationDays = parseInt(duration);
    if (isNaN(durationDays) || durationDays <= 0) {
      toast({
        title: "Invalid duration",
        description: "Duration must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    const endDate = calculateEndDate(startDate, durationDays);
    createActivityMutation.mutate({
      activityName: activityName.trim(),
      startDate,
      duration: durationDays,
      endDate,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <ListCheck className="h-5 w-5" />
        <h3 className="text-lg font-medium">Planned Activities & Work Schedule</h3>
      </div>

      {/* Add Activity Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="activity-name" data-testid="label-activity-name">
                Activity Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="activity-name"
                placeholder="e.g., Site Clearing"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                data-testid="input-activity-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date" data-testid="label-start-date">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration" data-testid="label-duration">
                Duration (days) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="duration"
                type="number"
                placeholder="e.g., 14"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                data-testid="input-duration"
              />
            </div>
            <Button
              onClick={handleAddActivity}
              disabled={createActivityMutation.isPending}
              className="w-full md:w-auto"
              data-testid="button-add-activity"
            >
              {createActivityMutation.isPending ? "Adding..." : "Add Activity"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
          <CardDescription>
            {activities.length === 0 ? "No activities planned yet" : `${activities.length} planned activities`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading activities...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activities added yet. Use the form above to add your first activity.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Milestone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id} data-testid={`row-activity-${activity.id}`}>
                      <TableCell className="font-medium" data-testid={`text-activity-name-${activity.id}`}>
                        {activity.activityName}
                      </TableCell>
                      <TableCell data-testid={`text-start-date-${activity.id}`}>
                        {formatDate(activity.startDate)}
                      </TableCell>
                      <TableCell data-testid={`text-duration-${activity.id}`}>
                        {activity.duration} days
                      </TableCell>
                      <TableCell data-testid={`text-end-date-${activity.id}`}>
                        {formatDate(activity.endDate)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleMilestoneMutation.mutate({
                              id: activity.id,
                              isMilestone: !activity.isMilestone,
                            })
                          }
                          data-testid={`button-milestone-${activity.id}`}
                        >
                          <Flag
                            className={`h-4 w-4 ${
                              activity.isMilestone ? "fill-yellow-500 text-yellow-500" : "text-gray-400"
                            }`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteActivityMutation.mutate(activity.id)}
                          disabled={deleteActivityMutation.isPending}
                          data-testid={`button-delete-${activity.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
