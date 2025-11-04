import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Save, Plus, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, parseISO } from "date-fns";
import type { WorkPlan, WorkPlanActivity, Project } from "@shared/schema";

export default function WorkPlanEditor() {
  const { workPlanId } = useParams<{ workPlanId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [localActivities, setLocalActivities] = useState<WorkPlanActivity[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: workPlan, isLoading: loadingPlan } = useQuery<WorkPlan>({
    queryKey: ["/api/work-plans", workPlanId],
  });

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", workPlan?.projectId],
    enabled: !!workPlan?.projectId,
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery<WorkPlanActivity[]>({
    queryKey: ["/api/work-plans", workPlanId, "activities"],
  });

  useEffect(() => {
    if (activities.length > 0) {
      setLocalActivities(activities);
    }
  }, [activities]);

  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      // Save all activities
      const promises = localActivities.map((activity) =>
        apiRequest(`/api/work-plan-activities/${activity.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            activityName: activity.activityName,
            duration: activity.duration,
            startDate: activity.startDate,
            endDate: activity.endDate,
          }),
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-plans", workPlanId, "activities"] });
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Changes saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      return apiRequest(`/api/work-plan-activities/${activityId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-plans", workPlanId, "activities"] });
      toast({
        title: "Success",
        description: "Activity deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete activity",
        variant: "destructive",
      });
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: async (data: { name: string; position?: number }) => {
      return apiRequest(`/api/work-plans/${workPlanId}/activities`, {
        method: "POST",
        body: JSON.stringify({
          activityName: data.name,
          itemType: "section",
          orderIndex: data.position || localActivities.length,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-plans", workPlanId, "activities"] });
      toast({
        title: "Success",
        description: "Section added successfully",
      });
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: async (data: { name: string; position?: number }) => {
      return apiRequest(`/api/work-plans/${workPlanId}/activities`, {
        method: "POST",
        body: JSON.stringify({
          activityName: data.name,
          itemType: "activity",
          startDate: format(new Date(), "yyyy-MM-dd"),
          duration: 1,
          orderIndex: data.position || localActivities.length,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-plans", workPlanId, "activities"] });
      toast({
        title: "Success",
        description: "Activity added successfully",
      });
    },
  });

  const updateActivity = (id: string, field: string, value: string | number) => {
    setLocalActivities((prev) =>
      prev.map((activity) => {
        if (activity.id !== id) return activity;

        const updated = { ...activity, [field]: value };

        // Auto-calculate end date if start date or duration changes
        if ((field === "startDate" || field === "duration") && updated.startDate && updated.duration) {
          const start = parseISO(updated.startDate);
          updated.endDate = format(addDays(start, updated.duration - 1), "yyyy-MM-dd");
        }

        return updated;
      })
    );
    setHasChanges(true);
  };

  const handleCellClick = (id: string, field: string) => {
    setEditingCell({ id, field });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const getItemNumber = (index: number, itemType: string) => {
    if (itemType === "section") return "";
    
    let activityCount = 0;
    let currentSection = "";
    
    for (let i = 0; i <= index; i++) {
      const activity = localActivities[i];
      if (activity.itemType === "section") {
        currentSection = activity.activityName;
        activityCount = 0;
      } else {
        activityCount++;
      }
    }
    
    // Find section index
    let sectionIndex = 0;
    for (let i = 0; i <= index; i++) {
      if (localActivities[i].itemType === "section") {
        sectionIndex++;
      }
    }
    
    return `${sectionIndex}.${activityCount}`;
  };

  if (loadingPlan || loadingActivities) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-editor">
        <div className="text-muted-foreground">Loading work plan...</div>
      </div>
    );
  }

  if (!workPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-muted-foreground">Work plan not found</div>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/projects/${workPlan.projectId}`)}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold" data-testid="work-plan-title">
                  {project?.name} - {workPlan.name}
                </h1>
              </div>
            </div>
            <Button
              onClick={() => saveChangesMutation.mutate()}
              disabled={!hasChanges || saveChangesMutation.isPending}
              data-testid="button-save-changes"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveChangesMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Work Plan Table */}
      <div className="container mx-auto px-6 py-8">
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-sm font-medium">
                <th className="px-4 py-3 w-24">Item No</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 w-32">Duration</th>
                <th className="px-4 py-3 w-40">Start Date</th>
                <th className="px-4 py-3 w-40">End Date</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {localActivities.map((activity, index) => (
                <tr
                  key={activity.id}
                  className={activity.itemType === "section" ? "bg-muted/30" : "hover:bg-muted/50"}
                  data-testid={`activity-row-${activity.id}`}
                >
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {getItemNumber(index, activity.itemType)}
                  </td>
                  <td className="px-4 py-3">
                    {editingCell?.id === activity.id && editingCell?.field === "activityName" ? (
                      <Input
                        value={activity.activityName}
                        onChange={(e) => updateActivity(activity.id, "activityName", e.target.value)}
                        onBlur={handleCellBlur}
                        autoFocus
                        className="h-8"
                        data-testid={`input-description-${activity.id}`}
                      />
                    ) : (
                      <div
                        onClick={() => handleCellClick(activity.id, "activityName")}
                        className={`cursor-pointer hover:bg-accent px-2 py-1 rounded ${
                          activity.itemType === "section" ? "font-semibold" : ""
                        }`}
                        data-testid={`text-description-${activity.id}`}
                      >
                        {activity.activityName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {activity.itemType === "activity" ? (
                      editingCell?.id === activity.id && editingCell?.field === "duration" ? (
                        <Input
                          type="number"
                          value={activity.duration || ""}
                          onChange={(e) => updateActivity(activity.id, "duration", parseInt(e.target.value) || 0)}
                          onBlur={handleCellBlur}
                          autoFocus
                          className="h-8"
                          data-testid={`input-duration-${activity.id}`}
                        />
                      ) : (
                        <div
                          onClick={() => handleCellClick(activity.id, "duration")}
                          className="cursor-pointer hover:bg-accent px-2 py-1 rounded"
                          data-testid={`text-duration-${activity.id}`}
                        >
                          {activity.duration ? `${activity.duration} days` : "-"}
                        </div>
                      )
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {activity.itemType === "activity" ? (
                      editingCell?.id === activity.id && editingCell?.field === "startDate" ? (
                        <Input
                          type="date"
                          value={activity.startDate || ""}
                          onChange={(e) => updateActivity(activity.id, "startDate", e.target.value)}
                          onBlur={handleCellBlur}
                          autoFocus
                          className="h-8"
                          data-testid={`input-start-date-${activity.id}`}
                        />
                      ) : (
                        <div
                          onClick={() => handleCellClick(activity.id, "startDate")}
                          className="cursor-pointer hover:bg-accent px-2 py-1 rounded text-sm"
                          data-testid={`text-start-date-${activity.id}`}
                        >
                          {activity.startDate || "-"}
                        </div>
                      )
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground" data-testid={`text-end-date-${activity.id}`}>
                    {activity.endDate || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-menu-${activity.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => addSectionMutation.mutate({ name: "New Section", position: index + 1 })}>
                          Insert Section Above
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addActivityMutation.mutate({ name: "New Activity", position: index + 1 })}>
                          Insert Activity Above
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteActivityMutation.mutate(activity.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Row Button */}
          <div className="p-4 border-t flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addSectionMutation.mutate({ name: "New Section" })}
              data-testid="button-add-section"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addActivityMutation.mutate({ name: "New Activity" })}
              data-testid="button-add-activity"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Activity
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
