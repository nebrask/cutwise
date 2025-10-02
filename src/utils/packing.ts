import type { Panel, PlannerInputs } from "../types";

export type PlacedRect = {
  id: string;
  baseId: string;
  x: number;
  y: number; 
  w: number;
  h: number;       
};

export type SheetLayout = {
  index: number;
  rects: PlacedRect[];
};

export type PackResult = {
  sheets: SheetLayout[];
  totalSheets: number;
  totalPanelArea: number;
  sheetAreaEach: number;
};

export function packNaive(inputs: PlannerInputs): PackResult {
  const { sheet, kerf, panels } = inputs;

  const copies: Panel[] = [];
  panels.forEach((p) => {
    for (let i = 0; i < p.qty; i += 1) {
      copies.push({ ...p });
    }
  });

  const sheetW = sheet.width;
  const sheetH = sheet.height;
  const sheetArea = sheetW * sheetH;

  const sheets: SheetLayout[] = [];
  let current: SheetLayout = { index: 0, rects: [] };
  sheets.push(current);

  let cursorX = 0;
  let cursorY = 0;
  let rowH = 0;

  const placeOnNewSheet = () => {
    current = { index: sheets.length, rects: [] };
    sheets.push(current);
    cursorX = 0;
    cursorY = 0;
    rowH = 0;
  };

  for (let i = 0; i < copies.length; i += 1) {
    const c = copies[i];

    const w = c.width;
    const h = c.height;

    if (cursorX === 0) {
      if (w > sheetW) {
        continue;
      }
    } else if (cursorX + kerf + w > sheetW) {
      cursorX = 0;
      cursorY = cursorY + rowH + kerf;
      rowH = 0;
    }

    if (cursorY + h > sheetH) {
      placeOnNewSheet();
    }

    const x = cursorX === 0 ? 0 : cursorX + kerf; 
    const y = cursorY;

    current.rects.push({
      id: `s${current.index}-i${i}`,
      baseId: c.id,
      x,
      y,
      w,
      h,
    });

    cursorX = x + w;
    rowH = Math.max(rowH, h);
  }

  const totalPanelArea = copies.reduce((acc, p) => acc + p.width * p.height, 0);

  return {
    sheets,
    totalSheets: sheets.length,
    totalPanelArea,
    sheetAreaEach: sheetArea,
  };
}

export function computeWastePercent(result: PackResult): number {
  const used = result.totalPanelArea;
  const total = result.totalSheets * result.sheetAreaEach;
  if (total === 0) return 0;
  const waste = total - used;
  return (waste / total) * 100;
}
