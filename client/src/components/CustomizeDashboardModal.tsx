import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWidgetOptions, type DashboardLayout, type WidgetId, defaultLayout } from "@/lib/widgetRegistry";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CustomizeDashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentLayout?: DashboardLayout | null;
}

export default function CustomizeDashboardModal({
  open,
  onOpenChange,
  projectId,
  currentLayout,
}: CustomizeDashboardModalProps) {
  const { toast } = useToast();
  const layout = (currentLayout as DashboardLayout) || defaultLayout;
  
  const [topLeft, setTopLeft] = useState<WidgetId>(layout.topLeft);
  const [topRight, setTopRight] = useState<WidgetId>(layout.topRight);
  const [bottomLeft, setBottomLeft] = useState<WidgetId>(layout.bottomLeft);
  const [bottomRight, setBottomRight] = useState<WidgetId>(layout.bottomRight);

  const widgetOptions = getWidgetOptions();

  const saveMutation = useMutation({
    mutationFn: async (dashboardLayout: DashboardLayout) => {
      return await apiRequest(`/api/projects/${projectId}/dashboard-layout`, {
        method: "PATCH",
        body: JSON.stringify({ dashboardLayout }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast({
        title: "Dashboard updated",
        description: "Your dashboard layout has been saved successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save dashboard layout",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const newLayout: DashboardLayout = {
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
    };
    saveMutation.mutate(newLayout);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Customize Dashboard Quadrants</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="top-left">Top-Left Quadrant</Label>
            <Select value={topLeft} onValueChange={(value) => setTopLeft(value as WidgetId)}>
              <SelectTrigger id="top-left" data-testid="select-top-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {widgetOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="top-right">Top-Right Quadrant</Label>
            <Select value={topRight} onValueChange={(value) => setTopRight(value as WidgetId)}>
              <SelectTrigger id="top-right" data-testid="select-top-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {widgetOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bottom-left">Bottom-Left Quadrant</Label>
            <Select value={bottomLeft} onValueChange={(value) => setBottomLeft(value as WidgetId)}>
              <SelectTrigger id="bottom-left" data-testid="select-bottom-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {widgetOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bottom-right">Bottom-Right Quadrant</Label>
            <Select value={bottomRight} onValueChange={(value) => setBottomRight(value as WidgetId)}>
              <SelectTrigger id="bottom-right" data-testid="select-bottom-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {widgetOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            data-testid="button-save-changes"
          >
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
