import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface ViewOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface WidgetKebabMenuProps {
  currentView: string;
  viewOptions: ViewOption[];
  onViewChange: (view: string) => void;
  additionalActions?: React.ReactNode;
}

export default function WidgetKebabMenu({
  currentView,
  viewOptions,
  onViewChange,
  additionalActions,
}: WidgetKebabMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          data-testid="button-widget-kebab-menu"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>View Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {viewOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onViewChange(option.value)}
            className={currentView === option.value ? "bg-accent" : ""}
            data-testid={`menu-item-view-${option.value}`}
          >
            {option.icon && <span className="mr-2">{option.icon}</span>}
            {option.label}
            {currentView === option.value && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
        {additionalActions && (
          <>
            <DropdownMenuSeparator />
            {additionalActions}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
