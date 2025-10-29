import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertActionPointSchema, type ActionPoint } from "@shared/schema";
import { format } from "date-fns";
import { z } from "zod";

interface ActionPointDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  dailyLogId?: string | null;
  actionPoint?: ActionPoint;
}

const formSchema = insertActionPointSchema.extend({
  description: z.string().min(1, "Description is required"),
});

type FormData = z.infer<typeof formSchema>;

export function ActionPointDialog({ open, onClose, projectId, dailyLogId, actionPoint }: ActionPointDialogProps) {
  const { toast } = useToast();
  const isEditing = !!actionPoint;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: actionPoint?.description || "",
      assignedTo: actionPoint?.assignedTo || "",
      priority: (actionPoint?.priority || "medium") as "low" | "medium" | "high",
      status: (actionPoint?.status || "open") as "open" | "completed",
      dueDate: actionPoint?.dueDate || "",
    },
  });

  useEffect(() => {
    if (actionPoint) {
      form.reset({
        description: actionPoint.description,
        assignedTo: actionPoint.assignedTo || "",
        priority: actionPoint.priority as "low" | "medium" | "high",
        status: actionPoint.status as "open" | "completed",
        dueDate: actionPoint.dueDate || "",
      });
    } else {
      form.reset({
        description: "",
        assignedTo: "",
        priority: "medium" as "low" | "medium" | "high",
        status: "open" as "open" | "completed",
        dueDate: "",
      });
    }
  }, [actionPoint, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", `/api/projects/${projectId}/action-points`, {
        ...data,
        dailyLogId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Action point created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'action-points'] });
      if (dailyLogId) {
        queryClient.invalidateQueries({ queryKey: ['/api/daily-logs', dailyLogId, 'action-points'] });
      }
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create action point",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("PATCH", `/api/action-points/${actionPoint!.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Action point updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'action-points'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update action point",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Action Point" : "Add Action Point"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the action point..."
              rows={3}
              {...form.register("description")}
              data-testid="textarea-action-description"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(value) => form.setValue("priority", value as "low" | "medium" | "high")}
              >
                <SelectTrigger id="priority" data-testid="select-action-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => form.setValue("status", value as "open" | "completed")}
              >
                <SelectTrigger id="status" data-testid="select-action-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Input
              id="assignedTo"
              placeholder="Name or role of person responsible"
              {...form.register("assignedTo")}
              data-testid="input-action-assigned-to"
            />
          </div>

          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              {...form.register("dueDate")}
              data-testid="input-action-due-date"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-cancel-action"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-action"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : (isEditing ? "Update" : "Create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
