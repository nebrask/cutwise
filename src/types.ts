export type SheetConfig = {
  width: number;
  height: number;
};

export type Panel = {
  id: string;
  width: number;
  height: number;
  qty: number;
  material?: "plywood" | "mdf" | "wood-h" | "wood-v" | "acrylic";
  label?: string;
};

export type PlannerInputs = {
  sheet: SheetConfig;
  kerf: number;
  panels: Panel[];
};
