import type { Panel, PlannerInputs } from "../types";

export type PlacedRect = {
  id: string;
  baseId: string;
  baseIndex: number;
  copyIndex: number;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated?: boolean;
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

type PanelCopy = Panel & {
  baseIndex: number;
  copyIndex: number;
  label: string;
};

function expandCopies(panels: Panel[]): PanelCopy[] {
  const copies: PanelCopy[] = [];
  panels.forEach((p, baseIndex) => {
    const baseNumber = baseIndex + 1;
    for (let ci = 0; ci < p.qty; ci += 1) {
      const copyNumber = ci + 1;
      copies.push({
        ...p,
        baseIndex,
        copyIndex: ci,
        label: `${baseNumber}-${copyNumber}`,
      });
    }
  });
  return copies;
}

export function packNaive(inputs: PlannerInputs): PackResult {
  const { sheet, kerf, panels } = inputs;

  const copies = expandCopies(panels);
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
      if (w > sheetW) continue;
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
      baseIndex: c.baseIndex,
      copyIndex: c.copyIndex,
      label: c.label,
      x, y, w, h,
      rotated: false,
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

export type HeuristicOptions = {
  allowRotate: boolean;
  sort: "height" | "area";
};

export function packImproved(
  inputs: PlannerInputs,
  opts: HeuristicOptions
): PackResult {
  const { sheet, kerf, panels } = inputs;
  const copies = expandCopies(panels);

  copies.sort((a, b) => {
    if (opts.sort === "area") {
      const areaDiff = (b.width * b.height) - (a.width * a.height);
      if (areaDiff !== 0) return areaDiff;
      const bLong = Math.max(b.width, b.height);
      const aLong = Math.max(a.width, a.height);
      if (bLong !== aLong) return bLong - aLong;
      if (b.width !== a.width) return b.width - a.width;
      return a.baseIndex - b.baseIndex;
    }

    if (b.height !== a.height) return b.height - a.height;
    if (b.width !== a.width) return b.width - a.width;
    const areaDiff = (b.width * b.height) - (a.width * a.height);
    if (areaDiff !== 0) return areaDiff;
    
    return a.baseIndex - b.baseIndex;
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


  const score = (spaceOnRow: number, rowHNow: number, wCand: number, hCand: number) => {
    const rowHAfter = Math.max(rowHNow, hCand);
    const leftover = spaceOnRow - wCand;
    return { rowHAfter, leftover };
  };

  for (let i = 0; i < copies.length; i += 1) {
    const c = copies[i];

    let w = c.width;
    let h = c.height;
    let rotated = false;

    let spaceOnRow = (cursorX === 0 ? sheetW : sheetW - (cursorX + kerf));
    let fitsNormal = w <= spaceOnRow && h <= (sheetH - cursorY);
    let fitsRotated = opts.allowRotate
      ? (h <= spaceOnRow && w <= (sheetH - cursorY))
      : false;

    if (!fitsNormal && !fitsRotated) {
      cursorX = 0;
      cursorY = cursorY + rowH + kerf;
      rowH = 0;

      if (h > (sheetH - cursorY) && (!opts.allowRotate || w > (sheetH - cursorY))) {
        placeOnNewSheet();
      }

      spaceOnRow = (cursorX === 0 ? sheetW : sheetW - (cursorX + kerf));
      fitsNormal = w <= spaceOnRow && h <= (sheetH - cursorY);
      fitsRotated = opts.allowRotate
        ? (h <= spaceOnRow && w <= (sheetH - cursorY))
        : false;

      if (!fitsNormal && !fitsRotated) {
        continue;
      }
    }

    if (fitsNormal && !fitsRotated) {
      // keep as is
    } else if (!fitsNormal && fitsRotated) {
      rotated = true;
      [w, h] = [h, w];
    } else if (fitsNormal && fitsRotated) {
      const sN = score(spaceOnRow, rowH, w, h);
      const sR = score(spaceOnRow, rowH, h, w);
      if (sR.rowHAfter < sN.rowHAfter || (sR.rowHAfter === sN.rowHAfter && sR.leftover < sN.leftover)) {
        rotated = true;
        [w, h] = [h, w];
      }
    }

    const x = cursorX === 0 ? 0 : cursorX + kerf;
    const y = cursorY;

    current.rects.push({
      id: `s${current.index}-i${i}`,
      baseId: c.id,
      baseIndex: c.baseIndex,
      copyIndex: c.copyIndex,
      label: c.label,
      x, y, w, h, rotated,
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

export function sheetUsedArea(sheet: SheetLayout): number {
  return sheet.rects.reduce((acc, r) => acc + r.w * r.h, 0);
}

export function computeWastePercentForSheet(
  sheet: SheetLayout,
  sheetAreaEach: number
): number {
  if (sheetAreaEach <= 0) return 0;
  const used = sheetUsedArea(sheet);
  const waste = sheetAreaEach - used;
  return Math.max(0, (waste / sheetAreaEach) * 100);
}
