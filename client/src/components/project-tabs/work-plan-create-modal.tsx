import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface WorkPlanCreateModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
}

export function WorkPlanCreateModal({ open, onClose, projectId, onSuccess }: WorkPlanCreateModalProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const createWorkPlanMutation = useMutation({
    mutationFn: async (data: { name: string; startDate?: string; description?: string }) => {
      const response = await fetch(`/api/projects/${projectId}/work-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          ownerId: user?.id,
          status: "Not Started",
        }),
      });
      if (!response.ok) throw new Error("Failed to create work plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "work-plans"] });
      toast({
        title: "Success",
        description: "Work plan created successfully",
      });
      handleClose();
      onSuccess?.();
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to create work plan");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a plan name");
      return;
    }

    createWorkPlanMutation.mutate({
      name: name.trim(),
      startDate: startDate || undefined,
      description: description.trim() || undefined,
    });
  };

  const handleClose = () => {
    setName("");
    setStartDate("");
    setDescription("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="work-plan-create-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create New Work Plan</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Fill in the details below to start a new plan.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">
                Plan Name<span className="text-red-500">*</span>
              </Label>
              <Input
                id="plan-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Q4 Marketing Campaign Launch"
                data-testid="input-plan-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a brief summary of the work plan's goals"
              rows={4}
              data-testid="input-description"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400" data-testid="error-message">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createWorkPlanMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createWorkPlanMutation.isPending}
              data-testid="button-create-plan"
            >
              {createWorkPlanMutation.isPending ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
