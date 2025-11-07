import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type DashboardLayout = {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
};

export type WidgetOption = {
  value: string;
  label: string;
};

interface CustomizeDashboardModalProps {
  open: boolean;
  onClose: () => void;
  currentLayout: DashboardLayout;
  onSave: (layout: DashboardLayout) => void;
  isSaving?: boolean;
}

// Available widget options
export const WIDGET_OPTIONS: WidgetOption[] = [
  { value: "basic-info", label: "Basic Information" },
  { value: "financial", label: "Financial Progress" },
  { value: "progress", label: "Progress Overview" },
  { value: "team-members", label: "Team Members" },
  { value: "action-points", label: "Action Points" },
  { value: "milestones", label: "Milestones" },
  { value: "safety", label: "Safety Issues" },
  { value: "recent-updates", label: "Recent Updates" },
];

export default function CustomizeDashboardModal({
  open,
  onClose,
  currentLayout,
  onSave,
  isSaving = false,
}: CustomizeDashboardModalProps) {
  const [layout, setLayout] = useState<DashboardLayout>(currentLayout);

  // Sync internal state when currentLayout prop changes (e.g., when switching between projects)
  useEffect(() => {
    setLayout(currentLayout);
  }, [currentLayout]);

  const handleSave = () => {
    onSave(layout);
  };

  const handleCancel = () => {
    setLayout(currentLayout); // Reset to current layout
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]" data-testid="modal-customize-dashboard">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Customize Dashboard Quadrants
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Top-Left Quadrant */}
          <div className="space-y-2">
            <Label htmlFor="top-left" className="text-sm font-medium text-muted-foreground">
              Top-Left Quadrant
            </Label>
            <Select
              value={layout.topLeft}
              onValueChange={(value) => setLayout({ ...layout, topLeft: value })}
            >
              <SelectTrigger
                id="top-left"
                data-testid="select-top-left-quadrant"
                className="w-full"
              >
                <SelectValue placeholder="Select widget" />
              </SelectTrigger>
              <SelectContent>
                {WIDGET_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    data-testid={`option-${option.value}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Top-Right Quadrant */}
          <div className="space-y-2">
            <Label htmlFor="top-right" className="text-sm font-medium text-muted-foreground">
              Top-Right Quadrant
            </Label>
            <Select
              value={layout.topRight}
              onValueChange={(value) => setLayout({ ...layout, topRight: value })}
            >
              <SelectTrigger
                id="top-right"
                data-testid="select-top-right-quadrant"
                className="w-full"
              >
                <SelectValue placeholder="Select widget" />
              </SelectTrigger>
              <SelectContent>
                {WIDGET_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    data-testid={`option-${option.value}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bottom-Left Quadrant */}
          <div className="space-y-2">
            <Label htmlFor="bottom-left" className="text-sm font-medium text-muted-foreground">
              Bottom-Left Quadrant
            </Label>
            <Select
              value={layout.bottomLeft}
              onValueChange={(value) => setLayout({ ...layout, bottomLeft: value })}
            >
              <SelectTrigger
                id="bottom-left"
                data-testid="select-bottom-left-quadrant"
                className="w-full"
              >
                <SelectValue placeholder="Select widget" />
              </SelectTrigger>
              <SelectContent>
                {WIDGET_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    data-testid={`option-${option.value}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bottom-Right Quadrant */}
          <div className="space-y-2">
            <Label htmlFor="bottom-right" className="text-sm font-medium text-muted-foreground">
              Bottom-Right Quadrant
            </Label>
            <Select
              value={layout.bottomRight}
              onValueChange={(value) => setLayout({ ...layout, bottomRight: value })}
            >
              <SelectTrigger
                id="bottom-right"
                data-testid="select-bottom-right-quadrant"
                className="w-full"
              >
                <SelectValue placeholder="Select widget" />
              </SelectTrigger>
              <SelectContent>
                {WIDGET_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    data-testid={`option-${option.value}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            data-testid="button-cancel-customize"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            data-testid="button-save-dashboard-layout"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
