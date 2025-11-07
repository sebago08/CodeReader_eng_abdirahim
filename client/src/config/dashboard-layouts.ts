export type LayoutType = "grid-3" | "grid-4" | "grid-6";

export interface LayoutTemplate {
  id: LayoutType;
  name: string;
  description: string;
  slots: number;
  gridClass: string;
}

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: "grid-3",
    name: "3-Widget Layout",
    description: "One large widget on left, two smaller on right",
    slots: 3,
    gridClass: "grid grid-cols-2 gap-6",
  },
  {
    id: "grid-4",
    name: "4-Widget Layout",
    description: "2x2 grid of equal-sized widgets",
    slots: 4,
    gridClass: "grid grid-cols-2 gap-6",
  },
  {
    id: "grid-6",
    name: "6-Widget Layout",
    description: "3x2 grid for comprehensive overview",
    slots: 6,
    gridClass: "grid grid-cols-3 gap-4",
  },
];

export function getLayoutTemplate(layoutType: LayoutType): LayoutTemplate {
  return LAYOUT_TEMPLATES.find(t => t.id === layoutType) || LAYOUT_TEMPLATES[1];
}

export function getSlotConfig(layoutType: LayoutType, slotNumber: number): string {
  if (layoutType === "grid-3") {
    if (slotNumber === 1) return "row-span-2";
    return "";
  }
  if (layoutType === "grid-6") {
    return "";
  }
  return "";
}
