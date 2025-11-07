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
import { LAYOUT_TEMPLATES, getLayoutTemplate, isFullWidthSlot, type LayoutType } from "@/config/dashboard-layouts";
import { Badge } from "@/components/ui/badge";

// New layout structure supporting flexible grids
export type DashboardLayout = {
  layoutType: LayoutType;
  widgets: Record<string, string>; // slot1, slot2, etc.
  widgetConfig?: Record<string, any>;
};

// Old layout format for backward compatibility
type LegacyDashboardLayout = {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  widgetConfig?: Record<string, any>;
};

export type WidgetOption = {
  value: string;
  label: string;
};

interface CustomizeDashboardModalProps {
  open: boolean;
  onClose: () => void;
  currentLayout: DashboardLayout | LegacyDashboardLayout;
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
  { value: "road-tracker", label: "Road Progress Tracker" },
];

// Helper to check if layout is legacy format
function isLegacyLayout(layout: any): layout is LegacyDashboardLayout {
  return layout && 'topLeft' in layout;
}

// Convert legacy quadrant format to new slot format
function convertLegacyLayout(legacy: LegacyDashboardLayout): DashboardLayout {
  return {
    layoutType: "grid-4",
    widgets: {
      slot1: legacy.topLeft,
      slot2: legacy.topRight,
      slot3: legacy.bottomLeft,
      slot4: legacy.bottomRight,
    },
    widgetConfig: legacy.widgetConfig,
  };
}

// Ensure layout has proper structure
function normalizeLayout(layout: DashboardLayout | LegacyDashboardLayout): DashboardLayout {
  if (isLegacyLayout(layout)) {
    return convertLegacyLayout(layout);
  }
  return layout;
}

export default function CustomizeDashboardModal({
  open,
  onClose,
  currentLayout,
  onSave,
  isSaving = false,
}: CustomizeDashboardModalProps) {
  const [layout, setLayout] = useState<DashboardLayout>(() => normalizeLayout(currentLayout));

  // Sync internal state when currentLayout prop changes (e.g., when switching between projects)
  useEffect(() => {
    setLayout(normalizeLayout(currentLayout));
  }, [currentLayout]);

  const handleLayoutTypeChange = (newLayoutType: LayoutType) => {
    const template = getLayoutTemplate(newLayoutType);
    const newWidgets: Record<string, string> = {};
    
    // Preserve existing widgets if they fit in the new layout
    for (let i = 1; i <= template.slots; i++) {
      const slotKey = `slot${i}`;
      newWidgets[slotKey] = layout.widgets[slotKey] || WIDGET_OPTIONS[i - 1]?.value || "basic-info";
    }

    setLayout({
      ...layout,
      layoutType: newLayoutType,
      widgets: newWidgets,
    });
  };

  const handleWidgetChange = (slotKey: string, widgetValue: string) => {
    setLayout({
      ...layout,
      widgets: {
        ...layout.widgets,
        [slotKey]: widgetValue,
      },
    });
  };

  const handleSave = () => {
    onSave(layout);
  };

  const handleCancel = () => {
    setLayout(normalizeLayout(currentLayout)); // Reset to current layout
    onClose();
  };

  const currentTemplate = getLayoutTemplate(layout.layoutType);
  const slotCount = currentTemplate.slots;
  
  // Determine grid columns based on slot count (using static Tailwind classes)
  const gridClassName = slotCount === 6 ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-4";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-[700px]" data-testid="modal-customize-dashboard">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Customize Dashboard Layout
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Layout Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="layout-type" className="text-sm font-medium">
              Layout Type
            </Label>
            <Select
              value={layout.layoutType}
              onValueChange={(value) => handleLayoutTypeChange(value as LayoutType)}
            >
              <SelectTrigger
                id="layout-type"
                data-testid="select-layout-type"
                className="w-full"
              >
                <SelectValue placeholder="Select layout type" />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_TEMPLATES.map((template) => (
                  <SelectItem
                    key={template.id}
                    value={template.id}
                    data-testid={`option-layout-${template.id}`}
                  >
                    {template.name} - {template.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Widget Slot Selectors */}
          <div className={gridClassName}>
            {Array.from({ length: slotCount }, (_, i) => {
              const slotNumber = i + 1;
              const slotKey = `slot${slotNumber}`;
              const isFullWidth = isFullWidthSlot(layout.layoutType, slotNumber);
              
              return (
                <div key={slotKey} className="space-y-2">
                  <Label
                    htmlFor={slotKey}
                    className="text-sm font-medium text-muted-foreground flex items-center gap-2"
                  >
                    Widget Slot {slotNumber}
                    {isFullWidth && (
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        Full Width
                      </Badge>
                    )}
                  </Label>
                  <Select
                    value={layout.widgets[slotKey] || ""}
                    onValueChange={(value) => handleWidgetChange(slotKey, value)}
                  >
                    <SelectTrigger
                      id={slotKey}
                      data-testid={`select-widget-slot-${slotNumber}`}
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
              );
            })}
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
