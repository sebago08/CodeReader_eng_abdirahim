import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertDailyLogSchema, type DailyLog, type DailyLogWithActionPoints } from "@shared/schema";
import { format } from "date-fns";
import { z } from "zod";

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
    </Dialog>
  );
}
