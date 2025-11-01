import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WorkPlanActivity, WorkPlan } from "@shared/schema";
import { Trash2, MoreVertical, Plus, Heading2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { addDays, format } from "date-fns";

interface WorkPlanTabProps {
  projectId: string;
}

interface EditingField {
  id: string;
  field: 'description' | 'duration' | 'startDate';
  value: string;
}

export default function WorkPlanTab({ projectId }: WorkPlanTabProps) {
  const { toast } = useToast();
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [selectedWorkPlanId, setSelectedWorkPlanId] = useState<string>("all");
  const [isNewWorkPlanDialogOpen, setIsNewWorkPlanDialogOpen] = useState(false);
  const [newWorkPlanName, setNewWorkPlanName] = useState("");
  const [newWorkPlanDescription, setNewWorkPlanDescription] = useState("");

  // Fetch work plans
  const { data: workPlans = [] } = useQuery<WorkPlan[]>({
    queryKey: [`/api/projects/${projectId}/work-plans`],
  });

  // Fetch work plan activities (filtered by selected work plan)
  const { data: activities = [], isLoading } = useQuery<WorkPlanActivity[]>({
    queryKey: [`/api/projects/${projectId}/work-plan-activities`, selectedWorkPlanId],
    queryFn: async () => {
      const url = selectedWorkPlanId && selectedWorkPlanId !== "all"
        ? `/api/projects/${projectId}/work-plan-activities?workPlanId=${selectedWorkPlanId}`
        : `/api/projects/${projectId}/work-plan-activities`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
  });

  // Create activity/section mutation
  const createActivityMutation = useMutation({
    mutationFn: async (activity: any) => {
      return await apiRequest("POST", `/api/projects/${projectId}/work-plan-activities`, {
        ...activity,
        workPlanId: selectedWorkPlanId !== "all" ? selectedWorkPlanId : undefined,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-plan-activities`] });
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
        title: "Deleted",
        description: "Item has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Insert section header at specific position (atomic server-side operation)
  const insertSectionMutation = useMutation({
    mutationFn: async ({ position, targetActivity, sectionName }: { position: "above" | "below"; targetActivity: WorkPlanActivity; sectionName: string }): Promise<WorkPlanActivity> => {
      const response = await apiRequest("POST", `/api/work-plan-activities/${targetActivity.id}/insert-section`, {
        position,
        sectionName,
      });
      return await response.json();
    },
    onSuccess: async (data: WorkPlanActivity) => {
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-plan-activities`] });
      
      // Auto-focus on description field for editing
      setTimeout(() => {
        setEditingField({ id: data.id, field: 'description', value: data.activityName });
      }, 100);
      
      toast({
        title: "Section inserted",
        description: "Click to edit the section name.",
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

  // Insert activity at specific position (atomic server-side operation)
  const insertActivityMutation = useMutation({
    mutationFn: async ({ position, targetActivity, activityData }: { 
      position: "above" | "below"; 
      targetActivity: WorkPlanActivity;
      activityData: { activityName: string; startDate?: string; duration?: number; endDate?: string };
    }): Promise<WorkPlanActivity> => {
      const response = await apiRequest("POST", `/api/work-plan-activities/${targetActivity.id}/insert-activity`, {
        position,
        ...activityData,
      });
      return await response.json();
    },
    onSuccess: async (data: WorkPlanActivity) => {
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-plan-activities`] });
      
      // Auto-focus on description field for editing
      setTimeout(() => {
        setEditingField({ id: data.id, field: 'description', value: data.activityName });
      }, 100);
      
      toast({
        title: "Activity inserted",
        description: "Fill in the activity details.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to insert activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create work plan mutation
  const createWorkPlanMutation = useMutation({
    mutationFn: async (workPlan: { name: string; description?: string; isDefault?: boolean }) => {
      return await apiRequest("POST", `/api/projects/${projectId}/work-plans`, workPlan);
    },
    onSuccess: async (response) => {
      const newWorkPlan = await response.json();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-plans`] });
      setSelectedWorkPlanId(newWorkPlan.id);
      setIsNewWorkPlanDialogOpen(false);
      setNewWorkPlanName("");
      setNewWorkPlanDescription("");
      toast({
        title: "Work plan created",
        description: "New work plan has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create work plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update activity mutation - for all fields
  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      // Get the current activity to calculate endDate if needed
      const activity = activities.find(a => a.id === id);
      if (!activity) throw new Error("Activity not found");

      let updates: any = {};

      if (field === 'description') {
        return await apiRequest("PATCH", `/api/work-plan-activities/${id}/name`, { 
          activityName: value 
        });
      } else if (field === 'duration') {
        const durationDays = parseInt(value);
        if (isNaN(durationDays) || durationDays <= 0) {
          throw new Error("Duration must be a positive number");
        }
        updates.duration = durationDays;
        // Recalculate end date if start date exists
        if (activity.startDate) {
          updates.endDate = calculateEndDate(activity.startDate, durationDays);
        }
      } else if (field === 'startDate') {
        updates.startDate = value;
        // Recalculate end date if duration exists
        if (activity.duration) {
          updates.endDate = calculateEndDate(value, activity.duration);
        }
      }

      // Use a general update endpoint (we'll need to add this to the backend)
      return await apiRequest("PATCH", `/api/work-plan-activities/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-plan-activities`] });
      setEditingField(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update. Please try again.",
        variant: "destructive",
      });
      setEditingField(null);
    },
  });

  // Calculate end date based on start date and duration
  // A 1-day task starts and ends on the same day, so we add (duration - 1) days
  const calculateEndDate = (start: string, days: number): string => {
    if (!start || !days || isNaN(days)) return "";
    const startDate = new Date(start);
    const endDate = addDays(startDate, days - 1);
    return format(endDate, 'yyyy-MM-dd');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const handleInsertSection = (position: "above" | "below", targetActivity: WorkPlanActivity) => {
    insertSectionMutation.mutate({
      position,
      targetActivity,
      sectionName: "New Section",
    });
  };

  const handleInsertActivity = (position: "above" | "below", targetActivity: WorkPlanActivity) => {
    insertActivityMutation.mutate({
      position,
      targetActivity,
      activityData: {
        activityName: "New Activity",
        startDate: undefined,
        duration: undefined,
        endDate: undefined,
      },
    });
  };

  const handleCellClick = (activity: WorkPlanActivity, field: 'description' | 'duration' | 'startDate') => {
    // Don't allow editing duration and startDate for sections
    if (activity.itemType === 'section' && (field === 'duration' || field === 'startDate')) {
      return;
    }

    let value = '';
    if (field === 'description') {
      value = activity.activityName;
    } else if (field === 'duration') {
      value = activity.duration?.toString() || '';
    } else if (field === 'startDate') {
      value = activity.startDate || '';
    }

    setEditingField({ id: activity.id, field, value });
  };

  const handleSaveEdit = () => {
    if (!editingField || !editingField.value.trim()) {
      setEditingField(null);
      return;
    }
    
    updateActivityMutation.mutate({
      id: editingField.id,
      field: editingField.field,
      value: editingField.value.trim(),
    });
  };

  const handleCancelEdit = () => {
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleCreateWorkPlan = () => {
    if (!newWorkPlanName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a work plan name.",
        variant: "destructive",
      });
      return;
    }

    createWorkPlanMutation.mutate({
      name: newWorkPlanName.trim(),
      description: newWorkPlanDescription.trim() || undefined,
      isDefault: workPlans.length === 0,
    });
  };

  // Add first activity or section
  const handleAddFirst = (type: 'section' | 'activity') => {
    const nextOrderIndex = 0;
    if (type === 'section') {
      createActivityMutation.mutate({
        itemType: "section",
        activityName: "New Section",
        orderIndex: nextOrderIndex,
      });
    } else {
      createActivityMutation.mutate({
        itemType: "activity",
        activityName: "New Activity",
        orderIndex: nextOrderIndex,
      });
    }
  };

  // Helper to check if an activity is indented (belongs to a section)
  const isIndented = (index: number): boolean => {
    if (index === 0) return false;
    
    for (let i = index - 1; i >= 0; i--) {
      if (activities[i].itemType === "section") {
        return true;
      }
    }
    
    return false;
  };

  // Calculate sequential number (only for activities, not sections)
  const getItemNumber = (index: number): number | null => {
    const activity = activities[index];
    if (activity.itemType === 'section') return null;
    
    // Count only activities before this one
    let count = 0;
    for (let i = 0; i < index; i++) {
      if (activities[i].itemType === 'activity') {
        count++;
      }
    }
    return count + 1;
  };

  return (
    <div className="space-y-6">
      {/* Work Plan Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="work-plan-selector" data-testid="label-work-plan">
                Work Plan
              </Label>
              <Select 
                value={selectedWorkPlanId} 
                onValueChange={setSelectedWorkPlanId}
              >
                <SelectTrigger id="work-plan-selector" data-testid="select-work-plan">
                  <SelectValue placeholder="All work plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All work plans</SelectItem>
                  {workPlans.map((workPlan) => (
                    <SelectItem key={workPlan.id} value={workPlan.id}>
                      {workPlan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setIsNewWorkPlanDialogOpen(true)}
              variant="outline"
              data-testid="button-add-work-plan"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Work Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work Schedule</CardTitle>
          <CardDescription>
            {activities.length === 0 ? "No activities planned yet" : `${activities.length} items`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading activities...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-muted-foreground">
                No activities added yet. Add your first section or activity to get started.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={() => handleAddFirst('section')}
                  variant="outline"
                  disabled={createActivityMutation.isPending}
                  data-testid="button-add-first-section"
                >
                  <Heading2 className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
                <Button
                  onClick={() => handleAddFirst('activity')}
                  disabled={createActivityMutation.isPending}
                  data-testid="button-add-first-activity"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-32">Duration</TableHead>
                    <TableHead className="w-36">Start Date</TableHead>
                    <TableHead className="w-36">End Date</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
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
                        <TableCell className="font-bold" data-testid={`cell-number-${activity.id}`}>
                          {/* No number for sections */}
                        </TableCell>
                        <TableCell 
                          className="font-bold text-base py-3 cursor-pointer hover:bg-muted/80" 
                          onClick={() => handleCellClick(activity, 'description')}
                          data-testid={`cell-description-${activity.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Heading2 className="h-5 w-5 text-primary flex-shrink-0" />
                            {editingField?.id === activity.id && editingField.field === 'description' ? (
                              <Input
                                value={editingField.value}
                                onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                                onBlur={handleSaveEdit}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="max-w-md font-bold"
                                data-testid={`input-edit-description-${activity.id}`}
                              />
                            ) : (
                              <span className="hover:text-blue-600" title="Click to edit">
                                {activity.activityName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`cell-duration-${activity.id}`}>
                          -
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`cell-start-date-${activity.id}`}>
                          -
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`cell-end-date-${activity.id}`}>
                          -
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
                                  data-testid={`menu-insert-section-above-${activity.id}`}
                                >
                                  Insert Section Above
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleInsertSection("below", activity)}
                                  data-testid={`menu-insert-section-below-${activity.id}`}
                                >
                                  Insert Section Below
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleInsertActivity("above", activity)}
                                  data-testid={`menu-insert-activity-above-${activity.id}`}
                                >
                                  Insert Activity Above
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleInsertActivity("below", activity)}
                                  data-testid={`menu-insert-activity-below-${activity.id}`}
                                >
                                  Insert Activity Below
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
                        <TableCell 
                          className="font-medium text-center"
                          data-testid={`cell-number-${activity.id}`}
                        >
                          {getItemNumber(index)}
                        </TableCell>
                        <TableCell 
                          className={`font-medium cursor-pointer hover:bg-muted/30 ${isIndented(index) ? "pl-8" : ""}`}
                          onClick={() => handleCellClick(activity, 'description')}
                          data-testid={`cell-description-${activity.id}`}
                        >
                          {editingField?.id === activity.id && editingField.field === 'description' ? (
                            <Input
                              value={editingField.value}
                              onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                              onBlur={handleSaveEdit}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              className="max-w-md"
                              data-testid={`input-edit-description-${activity.id}`}
                            />
                          ) : (
                            <span className="hover:text-blue-600" title="Click to edit">
                              {activity.activityName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => handleCellClick(activity, 'duration')}
                          data-testid={`cell-duration-${activity.id}`}
                        >
                          {editingField?.id === activity.id && editingField.field === 'duration' ? (
                            <Input
                              type="number"
                              min="1"
                              value={editingField.value}
                              onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                              onBlur={handleSaveEdit}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              placeholder="days"
                              className="w-24"
                              data-testid={`input-edit-duration-${activity.id}`}
                            />
                          ) : (
                            <span className={activity.duration ? "" : "text-muted-foreground"} title="Click to edit">
                              {activity.duration ? `${activity.duration} days` : 'Click to add'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => handleCellClick(activity, 'startDate')}
                          data-testid={`cell-start-date-${activity.id}`}
                        >
                          {editingField?.id === activity.id && editingField.field === 'startDate' ? (
                            <Input
                              type="date"
                              value={editingField.value}
                              onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                              onBlur={handleSaveEdit}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              className="w-36"
                              data-testid={`input-edit-start-date-${activity.id}`}
                            />
                          ) : (
                            <span className={activity.startDate ? "" : "text-muted-foreground"} title="Click to edit">
                              {activity.startDate ? formatDate(activity.startDate) : 'Click to add'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell 
                          className="text-muted-foreground"
                          data-testid={`cell-end-date-${activity.id}`}
                        >
                          {activity.endDate ? formatDate(activity.endDate) : '-'}
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
                                  data-testid={`menu-insert-section-above-${activity.id}`}
                                >
                                  Insert Section Above
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleInsertSection("below", activity)}
                                  data-testid={`menu-insert-section-below-${activity.id}`}
                                >
                                  Insert Section Below
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleInsertActivity("above", activity)}
                                  data-testid={`menu-insert-activity-above-${activity.id}`}
                                >
                                  Insert Activity Above
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleInsertActivity("below", activity)}
                                  data-testid={`menu-insert-activity-below-${activity.id}`}
                                >
                                  Insert Activity Below
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

      {/* New Work Plan Dialog */}
      <Dialog open={isNewWorkPlanDialogOpen} onOpenChange={setIsNewWorkPlanDialogOpen}>
        <DialogContent data-testid="dialog-new-work-plan">
          <DialogHeader>
            <DialogTitle>Create New Work Plan</DialogTitle>
            <DialogDescription>
              Add a new work plan to organize different phases or subdivisions of your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-work-plan-name" data-testid="label-new-work-plan-name">
                Work Plan Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-work-plan-name"
                placeholder="e.g., Main Road, Phase 1, Building A"
                value={newWorkPlanName}
                onChange={(e) => setNewWorkPlanName(e.target.value)}
                data-testid="input-new-work-plan-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-work-plan-description" data-testid="label-new-work-plan-description">
                Description (Optional)
              </Label>
              <Textarea
                id="new-work-plan-description"
                placeholder="Additional details about this work plan..."
                value={newWorkPlanDescription}
                onChange={(e) => setNewWorkPlanDescription(e.target.value)}
                rows={3}
                data-testid="textarea-new-work-plan-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewWorkPlanDialogOpen(false);
                setNewWorkPlanName("");
                setNewWorkPlanDescription("");
              }}
              data-testid="button-cancel-work-plan"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkPlan}
              disabled={createWorkPlanMutation.isPending}
              data-testid="button-create-work-plan"
            >
              {createWorkPlanMutation.isPending ? "Creating..." : "Create Work Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
