import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertDailyLogSchema, type DailyLog, type DailyLogWithActionPoints, type ActionPoint } from "@shared/schema";
import { format } from "date-fns";
import { z } from "zod";
import { Plus, CheckCircle, Clock, Trash2 } from "lucide-react";
import { ActionPointDialog } from "@/components/action-point-dialog";

interface DailyLogDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  log?: DailyLogWithActionPoints;
}

const formSchema = insertDailyLogSchema.extend({
  date: z.string().min(1, "Date is required"),
});

type FormData = z.infer<typeof formSchema>;

export function DailyLogDialog({ open, onClose, projectId, log }: DailyLogDialogProps) {
  const { toast } = useToast();
  const isEditing = !!log;
  const [actionPointDialogOpen, setActionPointDialogOpen] = useState(false);
  const [editingActionPoint, setEditingActionPoint] = useState<ActionPoint | undefined>(undefined);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: log?.date || format(new Date(), 'yyyy-MM-dd'),
      weather: log?.weather || "",
      workSummary: log?.workSummary || "",
      issues: log?.issues || "",
      notes: log?.notes || "",
    },
  });

  useEffect(() => {
    if (log) {
      form.reset({
        date: log.date,
        weather: log.weather || "",
        workSummary: log.workSummary || "",
        issues: log.issues || "",
        notes: log.notes || "",
      });
    } else {
      form.reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        weather: "",
        workSummary: "",
        issues: "",
        notes: "",
      });
    }
  }, [log, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", `/api/projects/${projectId}/daily-logs`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Daily log created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'daily-logs'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create daily log",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("PATCH", `/api/daily-logs/${log!.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Daily log updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'daily-logs'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update daily log",
        variant: "destructive",
      });
    },
  });

  const deleteActionPointMutation = useMutation({
    mutationFn: async (actionPointId: string) => {
      return await apiRequest("DELETE", `/api/action-points/${actionPointId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Action point deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'action-points'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete action point",
        variant: "destructive",
      });
    },
  });

  const handleAddActionPoint = () => {
    setEditingActionPoint(undefined);
    setActionPointDialogOpen(true);
  };

  const handleEditActionPoint = (actionPoint: ActionPoint) => {
    setEditingActionPoint(actionPoint);
    setActionPointDialogOpen(true);
  };

  const handleDeleteActionPoint = (actionPointId: string) => {
    if (confirm("Are you sure you want to delete this action point?")) {
      deleteActionPointMutation.mutate(actionPointId);
    }
  };

  const handleCloseActionPointDialog = () => {
    setActionPointDialogOpen(false);
    setEditingActionPoint(undefined);
  };

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Daily Log" : "Add Daily Log"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              {...form.register("date")}
              data-testid="input-log-date"
            />
            {form.formState.errors.date && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="weather">Weather</Label>
            <Input
              id="weather"
              placeholder="e.g., Sunny, Rainy, Cloudy"
              {...form.register("weather")}
              data-testid="input-log-weather"
            />
          </div>

          <div>
            <Label htmlFor="workSummary">Work Summary</Label>
            <Textarea
              id="workSummary"
              placeholder="Describe the work completed today..."
              rows={4}
              {...form.register("workSummary")}
              data-testid="textarea-log-work-summary"
            />
          </div>

          <div>
            <Label htmlFor="issues">Issues / Challenges</Label>
            <Textarea
              id="issues"
              placeholder="Document any issues or challenges encountered..."
              rows={3}
              {...form.register("issues")}
              data-testid="textarea-log-issues"
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any other observations or notes..."
              rows={3}
              {...form.register("notes")}
              data-testid="textarea-log-notes"
            />
          </div>

          {/* Action Points Section - Only show when editing an existing log */}
          {isEditing && log && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Action Points</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Track follow-up items for this daily log
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddActionPoint}
                  data-testid="button-add-action-point-in-log"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Action Point
                </Button>
              </div>

              {log.actionPoints && log.actionPoints.length > 0 ? (
                <div className="space-y-2">
                  {log.actionPoints.map((actionPoint) => (
                    <Card key={actionPoint.id} className="bg-gray-50">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 flex-1">
                            {actionPoint.status === 'completed' ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">{actionPoint.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {actionPoint.priority}
                                </Badge>
                                {actionPoint.assignedTo && (
                                  <span className="text-xs text-gray-600">
                                    {actionPoint.assignedTo}
                                  </span>
                                )}
                                {actionPoint.dueDate && (
                                  <span className="text-xs text-gray-600">
                                    Due: {format(new Date(actionPoint.dueDate), 'MMM d')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditActionPoint(actionPoint)}
                              data-testid={`button-edit-action-point-${actionPoint.id}`}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteActionPoint(actionPoint.id)}
                              data-testid={`button-delete-action-point-${actionPoint.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-3 text-center">
                  No action points yet. Click "Add Action Point" to create one.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-cancel-log"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-log"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : (isEditing ? "Update" : "Create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Nested Action Point Dialog */}
      {isEditing && log && (
        <ActionPointDialog
          open={actionPointDialogOpen}
          onClose={handleCloseActionPointDialog}
          projectId={projectId}
          dailyLogId={log.id}
          actionPoint={editingActionPoint}
        />
      )}
    </Dialog>
  );
}
