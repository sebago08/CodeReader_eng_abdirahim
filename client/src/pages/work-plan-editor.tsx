import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Save, Plus, MoreVertical, Trash2, Flag, AlertTriangle } from "lucide-react";
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
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

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
      setLocalActivities(prev => {
        // If no previous local state, just use server data
        if (prev.length === 0) {
          return activities;
        }
        
        // Merge: keep local edits for existing items, add new items from server
        // Also remove items that were deleted (not in server response anymore)
        const localEditsMap = new Map(prev.map(a => [a.id, a]));
        const serverIdsSet = new Set(activities.map(a => a.id));
        
        // Start with server activities, but preserve local edits for existing items
        const merged = activities.map(serverActivity => {
          const localVersion = localEditsMap.get(serverActivity.id);
          if (localVersion) {
            // Keep local edits (name, duration, dates) for existing items
            return localVersion;
          }
          // New item from server (just added)
          return serverActivity;
        });
        
        return merged;
      });
      
      // Auto-focus on newly added item
      if (pendingFocusId) {
        const newItem = activities.find(a => a.id === pendingFocusId);
        if (newItem) {
          setEditingCell({ id: pendingFocusId, field: "activityName" });
          setPendingFocusId(null);
        }
      }
    }
  }, [activities, pendingFocusId]);

  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      // Save all activities (but not sections, as they don't have duration/dates)
      const promises = localActivities
        .filter((activity) => activity.itemType === "activity")
        .map((activity) =>
          fetch(`/api/work-plan-activities/${activity.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              activityName: activity.activityName,
              duration: activity.duration,
              startDate: activity.startDate,
              endDate: activity.endDate,
            }),
          }).then(res => {
            if (!res.ok) throw new Error("Failed to save activity");
            return res.json();
          })
        );
      
      // Also save section names separately
      const sectionPromises = localActivities
        .filter((activity) => activity.itemType === "section")
        .map((section) =>
          fetch(`/api/work-plan-activities/${section.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              activityName: section.activityName,
            }),
          }).then(res => {
            if (!res.ok) throw new Error("Failed to save section");
            return res.json();
          })
        );
      
      await Promise.all([...promises, ...sectionPromises]);
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
      const response = await fetch(`/api/work-plan-activities/${activityId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete activity");
      return response.status === 204 ? null : response.json();
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
      const response = await fetch(`/api/work-plans/${workPlanId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          activityName: data.name,
          itemType: "section",
          orderIndex: data.position || localActivities.length,
        }),
      });
      if (!response.ok) throw new Error("Failed to add section");
      return response.json();
    },
    onSuccess: (newSection) => {
      setPendingFocusId(newSection.id);
      queryClient.invalidateQueries({ queryKey: ["/api/work-plans", workPlanId, "activities"] });
      toast({
        title: "Section added",
        description: "Type a name and click Save Changes when done",
      });
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: async (data: { name: string; position?: number }) => {
      const response = await fetch(`/api/work-plans/${workPlanId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          activityName: data.name,
          itemType: "activity",
          startDate: format(new Date(), "yyyy-MM-dd"),
          duration: 1,
          orderIndex: data.position || localActivities.length,
        }),
      });
      if (!response.ok) throw new Error("Failed to add activity");
      return response.json();
    },
    onSuccess: (newActivity) => {
      setPendingFocusId(newActivity.id);
      queryClient.invalidateQueries({ queryKey: ["/api/work-plans", workPlanId, "activities"] });
      toast({
        title: "Activity added",
        description: "Type a name and click Save Changes when done",
      });
    },
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: async (data: { activityId: string; isMilestone: boolean }) => {
      const response = await fetch(`/api/work-plan-activities/${data.activityId}/milestone`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          isMilestone: data.isMilestone,
        }),
      });
      if (!response.ok) throw new Error("Failed to toggle milestone");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-plans", workPlanId, "activities"] });
      toast({
        title: "Success",
        description: "Milestone status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update milestone status",
        variant: "destructive",
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
          try {
            // Validate that startDate is a valid date string before parsing
            if (updated.startDate && typeof updated.startDate === 'string' && updated.startDate.trim() !== '') {
              const start = parseISO(updated.startDate);
              // Check if the parsed date is valid
              if (!isNaN(start.getTime())) {
                updated.endDate = format(addDays(start, updated.duration - 1), "yyyy-MM-dd");
              }
            }
          } catch (error) {
            // If parsing fails, don't update endDate
            console.error("Error parsing date:", error);
          }
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

  const getSectionDates = (sectionIndex: number) => {
    const sectionActivities: WorkPlanActivity[] = [];
    
    // Find all activities that belong to this section
    for (let i = sectionIndex + 1; i < localActivities.length; i++) {
      const activity = localActivities[i];
      
      // Stop when we hit the next section
      if (activity.itemType === "section") {
        break;
      }
      
      // Only include activities (not sections) with valid dates
      if (activity.itemType === "activity" && activity.startDate && activity.endDate) {
        sectionActivities.push(activity);
      }
    }
    
    // If no activities in this section, return nulls
    if (sectionActivities.length === 0) {
      return { startDate: null, endDate: null, duration: null };
    }
    
    try {
      // Use parseISO instead of Date constructor to avoid timezone issues
      const startDates = sectionActivities
        .map(a => parseISO(a.startDate!))
        .filter(d => !isNaN(d.getTime()));
      const endDates = sectionActivities
        .map(a => parseISO(a.endDate!))
        .filter(d => !isNaN(d.getTime()));
      
      // If no valid dates after filtering, return nulls
      if (startDates.length === 0 || endDates.length === 0) {
        return { startDate: null, endDate: null, duration: null };
      }
      
      const earliestStart = new Date(Math.min(...startDates.map(d => d.getTime())));
      const latestEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
      
      // Calculate duration in days (inclusive)
      const durationInDays = Math.ceil((latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      return {
        startDate: format(earliestStart, "yyyy-MM-dd"),
        endDate: format(latestEnd, "yyyy-MM-dd"),
        duration: durationInDays
      };
    } catch (error) {
      console.error("Error calculating section dates:", error);
      return { startDate: null, endDate: null, duration: null };
    }
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
        <Button onClick={() => window.history.back()}>Go Back</Button>
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
                onClick={() => navigate(`/projects/${workPlan.projectId}#workplan`)}
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

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="bg-amber-500/20 border-b border-amber-500/50 px-6 py-3">
          <div className="container mx-auto flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="text-amber-200">
              You have unsaved changes. Click "Save Changes" to keep your edits.
            </span>
          </div>
        </div>
      )}

      {/* Work Plan Table */}
      <div className="container mx-auto px-6 py-8">
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full">
            <thead className="bg-blue-600 dark:bg-blue-700">
              <tr className="text-left text-sm font-medium text-white">
                <th className="px-4 py-3 w-24 border-r border-blue-500 dark:border-blue-600">Item No</th>
                <th className="px-4 py-3 border-r border-blue-500 dark:border-blue-600">Description</th>
                <th className="px-4 py-3 w-32 border-r border-blue-500 dark:border-blue-600">Duration</th>
                <th className="px-4 py-3 w-40 border-r border-blue-500 dark:border-blue-600">Start Date</th>
                <th className="px-4 py-3 w-40 border-r border-blue-500 dark:border-blue-600">End Date</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {localActivities.map((activity, index) => {
                // For sections, compute dates once per row to avoid redundant calculations
                const sectionDates = activity.itemType === "section" ? getSectionDates(index) : null;
                
                return (
                <tr
                  key={activity.id}
                  className={`border-b border-border ${activity.itemType === "section" ? "bg-muted" : "hover:bg-muted/50"}`}
                  data-testid={`activity-row-${activity.id}`}
                >
                  <td className="px-4 py-3 text-sm text-muted-foreground border-r border-border">
                    {getItemNumber(index, activity.itemType)}
                  </td>
                  <td className="px-4 py-3 border-r border-border">
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
                        className={`cursor-pointer hover:bg-accent px-2 py-1 rounded flex items-center gap-2 ${
                          activity.itemType === "section" ? "font-semibold" : ""
                        }`}
                        data-testid={`text-description-${activity.id}`}
                      >
                        {activity.isMilestone && (
                          <Flag className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" data-testid={`icon-milestone-${activity.id}`} />
                        )}
                        <span>{activity.activityName}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 border-r border-border">
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
                    ) : (
                      <div className="px-2 py-1 text-sm text-muted-foreground italic" data-testid={`text-duration-${activity.id}`}>
                        {sectionDates?.duration ? `${sectionDates.duration} days` : "-"}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 border-r border-border">
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
                    ) : (
                      <div className="px-2 py-1 text-sm text-muted-foreground italic" data-testid={`text-start-date-${activity.id}`}>
                        {sectionDates?.startDate || "-"}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground border-r border-border" data-testid={`text-end-date-${activity.id}`}>
                    {activity.itemType === "activity" ? (
                      activity.endDate || "-"
                    ) : (
                      <span className="italic">{sectionDates?.endDate || "-"}</span>
                    )}
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
                        {activity.itemType === "activity" && (
                          <DropdownMenuItem 
                            onClick={() => toggleMilestoneMutation.mutate({ 
                              activityId: activity.id, 
                              isMilestone: !activity.isMilestone 
                            })}
                            data-testid={`button-toggle-milestone-${activity.id}`}
                          >
                            <Flag className="mr-2 h-4 w-4" />
                            {activity.isMilestone ? "Remove Milestone" : "Mark as Milestone"}
                          </DropdownMenuItem>
                        )}
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
                );
              })}
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
