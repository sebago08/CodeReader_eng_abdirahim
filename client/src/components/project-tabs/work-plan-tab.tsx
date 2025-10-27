import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WorkPlanActivity } from "@shared/schema";
import { Trash2, Flag, ListCheck, Heading2, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkPlanTabProps {
  projectId: string;
}

export default function WorkPlanTab({ projectId }: WorkPlanTabProps) {
  const { toast } = useToast();
  const [itemType, setItemType] = useState<"activity" | "section">("activity");
  const [activityName, setActivityName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Fetch work plan activities
  const { data: activities = [], isLoading } = useQuery<WorkPlanActivity[]>({
    queryKey: [`/api/projects/${projectId}/work-plan-activities`],
  });

  // Create activity/section mutation
  const createActivityMutation = useMutation({
    mutationFn: async (activity: any) => {
      return await apiRequest("POST", `/api/projects/${projectId}/work-plan-activities`, activity);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-plan-activities`] });
      setActivityName("");
      setStartDate("");
      setDuration("");
      toast({
        title: variables.itemType === "section" ? "Section added" : "Activity added",
        description: variables.itemType === "section" 
          ? "Section header has been added successfully." 
          : "Work plan activity has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
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

  // Insert section header at specific position (atomic server-side operation)
  const insertSectionMutation = useMutation({
    mutationFn: async ({ position, targetActivity, sectionName }: { position: "above" | "below"; targetActivity: WorkPlanActivity; sectionName: string }) => {
      return await apiRequest("POST", `/api/work-plan-activities/${targetActivity.id}/insert-section`, {
        position,
        sectionName,
      });
    },
    onSuccess: async (data) => {
      // Invalidate and refetch the query
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-plan-activities`] });
      
      // Set editing state after a small delay to ensure the component has re-rendered with new data
      setTimeout(() => {
        setEditingId(data.id);
        setEditingName(data.activityName);
      }, 100);
      
      toast({
        title: "Section inserted",
        description: "Double-click the section name to edit it.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to insert section. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update activity/section name mutation
  const updateNameMutation = useMutation({
    mutationFn: async ({ id, activityName }: { id: string; activityName: string }) => {
      return await apiRequest("PATCH", `/api/work-plan-activities/${id}/name`, { activityName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-plan-activities`] });
      setEditingId(null);
      setEditingName("");
      toast({
        title: "Name updated",
        description: "Activity name has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update name. Please try again.",
        variant: "destructive",
      });
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
    if (!activityName.trim()) {
      toast({
        title: "Missing name",
        description: itemType === "section" ? "Please enter a section name." : "Please enter an activity name.",
        variant: "destructive",
      });
      return;
    }

    // For sections, we don't need dates
    if (itemType === "section") {
      const nextOrderIndex = activities.length;
      createActivityMutation.mutate({
        itemType: "section",
        activityName: activityName.trim(),
        orderIndex: nextOrderIndex,
      });
      return;
    }

    // For activities, validate dates and duration
    if (!startDate || !duration) {
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
    const nextOrderIndex = activities.length;
    createActivityMutation.mutate({
      itemType: "activity",
      activityName: activityName.trim(),
      startDate,
      duration: durationDays,
      endDate,
      orderIndex: nextOrderIndex,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  const handleInsertSection = (position: "above" | "below", targetActivity: WorkPlanActivity) => {
    // Insert with default name and automatically enter edit mode
    insertSectionMutation.mutate({
      position,
      targetActivity,
      sectionName: "New Section",
    });
  };

  const handleDoubleClick = (activity: WorkPlanActivity) => {
    setEditingId(activity.id);
    setEditingName(activity.activityName);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      setEditingName("");
      return;
    }
    
    updateNameMutation.mutate({
      id: editingId,
      activityName: editingName.trim(),
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  // Helper to check if an activity is indented (belongs to a section)
  // An activity is indented if there's a section header before it and no other section after that
  const isIndented = (index: number): boolean => {
    if (index === 0) return false;
    
    // Look backwards to find if we're under a section
    for (let i = index - 1; i >= 0; i--) {
      if (activities[i].itemType === "section") {
        return true; // Found a section header before this activity
      }
    }
    
    return false; // No section header found before this activity
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <ListCheck className="h-5 w-5" />
        <h3 className="text-lg font-medium">Planned Activities & Work Schedule</h3>
      </div>

      {/* Add Activity/Section Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-type" data-testid="label-item-type">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select value={itemType} onValueChange={(value: "activity" | "section") => setItemType(value)}>
                  <SelectTrigger id="item-type" data-testid="select-item-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="section">Section Header</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-name" data-testid="label-activity-name">
                  {itemType === "section" ? "Section Name" : "Activity Name"} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="activity-name"
                  placeholder={itemType === "section" ? "e.g., Excavation Works" : "e.g., Site Clearing"}
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  data-testid="input-activity-name"
                />
              </div>
            </div>
            
            {itemType === "activity" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
            )}
            
            {itemType === "section" && (
              <div className="flex justify-end">
                <Button
                  onClick={handleAddActivity}
                  disabled={createActivityMutation.isPending}
                  className="w-full md:w-auto"
                  data-testid="button-add-section"
                >
                  <Heading2 className="h-4 w-4 mr-2" />
                  {createActivityMutation.isPending ? "Adding..." : "Add Section Header"}
                </Button>
              </div>
            )}
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
                  {activities.map((activity, index) => (
                    activity.itemType === "section" ? (
                      <TableRow 
                        key={activity.id} 
                        className="bg-muted/50 hover:bg-muted/70"
                        data-testid={`row-section-${activity.id}`}
                      >
                        <TableCell colSpan={5} className="font-bold text-base py-3" data-testid={`text-section-name-${activity.id}`}>
                          <div className="flex items-center gap-2">
                            <Heading2 className="h-5 w-5 text-[#1a5276]" />
                            {editingId === activity.id ? (
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="max-w-md"
                                data-testid={`input-edit-name-${activity.id}`}
                              />
                            ) : (
                              <span 
                                onDoubleClick={() => handleDoubleClick(activity)}
                                className="cursor-pointer hover:text-blue-600"
                                title="Double-click to edit"
                              >
                                {activity.activityName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-kebab-${activity.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleInsertSection("above", activity)}
                                  data-testid={`menu-insert-above-${activity.id}`}
                                >
                                  Insert Section Above
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleInsertSection("below", activity)}
                                  data-testid={`menu-insert-below-${activity.id}`}
                                >
                                  Insert Section Below
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteActivityMutation.mutate(activity.id)}
                              disabled={deleteActivityMutation.isPending}
                              data-testid={`button-delete-${activity.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={activity.id} data-testid={`row-activity-${activity.id}`}>
                        <TableCell className="font-medium" data-testid={`text-activity-name-${activity.id}`}>
                          <div className={isIndented(index) ? "pl-8" : ""}>
                            {editingId === activity.id ? (
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="max-w-md"
                                data-testid={`input-edit-name-${activity.id}`}
                              />
                            ) : (
                              <span 
                                onDoubleClick={() => handleDoubleClick(activity)}
                                className="cursor-pointer hover:text-blue-600"
                                title="Double-click to edit"
                              >
                                {activity.activityName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-start-date-${activity.id}`}>
                          {activity.startDate ? formatDate(activity.startDate) : '-'}
                        </TableCell>
                        <TableCell data-testid={`text-duration-${activity.id}`}>
                          {activity.duration ? `${activity.duration} days` : '-'}
                        </TableCell>
                        <TableCell data-testid={`text-end-date-${activity.id}`}>
                          {activity.endDate ? formatDate(activity.endDate) : '-'}
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
                          <div className="flex items-center justify-end gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-kebab-${activity.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleInsertSection("above", activity)}
                                  data-testid={`menu-insert-above-${activity.id}`}
                                >
                                  Insert Section Above
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleInsertSection("below", activity)}
                                  data-testid={`menu-insert-below-${activity.id}`}
                                >
                                  Insert Section Below
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteActivityMutation.mutate(activity.id)}
                              disabled={deleteActivityMutation.isPending}
                              data-testid={`button-delete-${activity.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
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
