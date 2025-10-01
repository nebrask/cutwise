export type SheetConfig = {
  width: number;
  height: number;
};

export type Panel = {
  id: string;
  width: number;
  height: number;
  qty: number;
};

export type PlannerInputs = {
  sheet: SheetConfig;
  kerf: number;
  panels: Panel[];
};
