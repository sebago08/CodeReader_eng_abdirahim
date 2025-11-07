export type LayoutType = "grid-3" | "grid-4" | "grid-5" | "grid-6";

export interface LayoutTemplate {
  id: LayoutType;
  name: string;
  description: string;
  slots: number;
  gridClass: string;
  fullWidthSlots?: number[]; // Slots that should span full width
}

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: "grid-3",
    name: "3-Widget Layout",
    description: "Two widgets on top, one full-width below",
    slots: 3,
    gridClass: "grid grid-cols-2 gap-6",
    fullWidthSlots: [3],
  },
  {
    id: "grid-4",
    name: "4-Widget Layout",
    description: "2x2 grid of equal-sized widgets",
    slots: 4,
    gridClass: "grid grid-cols-2 gap-6",
  },
  {
    id: "grid-5",
    name: "5-Widget Layout",
    description: "Four widgets in 2x2 grid, one full-width below",
    slots: 5,
    gridClass: "grid grid-cols-2 gap-6",
    fullWidthSlots: [5],
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
  const template = getLayoutTemplate(layoutType);
  const isFullWidth = template.fullWidthSlots?.includes(slotNumber);
  
  if (isFullWidth) {
    return "col-span-2"; // Full-width slots span both columns
  }
  
  return "";
}

export function isFullWidthSlot(layoutType: LayoutType, slotNumber: number): boolean {
  const template = getLayoutTemplate(layoutType);
  return template.fullWidthSlots?.includes(slotNumber) || false;
}
