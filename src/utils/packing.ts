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
    return b.width * b.height - a.width * a.height;
  }
  return b.height - a.height;
})

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

    let w = c.width;
    let h = c.height;
    let rotated = false;

    const spaceOnRow = (cursorX === 0 ? sheetW : sheetW - (cursorX + kerf));
    const fitsNormal = w <= spaceOnRow && h <= (sheetH - cursorY);
    const fitsRotated = opts.allowRotate
      ? (h <= spaceOnRow && w <= (sheetH - cursorY))
      : false;

    if (!fitsNormal && fitsRotated) {
      rotated = true;
      [w, h] = [h, w];
    } else if (fitsNormal && fitsRotated) {
      const leftoverNormal = spaceOnRow - w;
      const leftoverRot = spaceOnRow - h;
      if (leftoverRot >= 0 && leftoverRot < leftoverNormal) {
        rotated = true;
        [w, h] = [h, w];
      }
    } else if (!fitsNormal && !fitsRotated) {
      cursorX = 0;
      cursorY = cursorY + rowH + kerf;
      rowH = 0;

      if (h > (sheetH - cursorY) && (!opts.allowRotate || w > (sheetH - cursorY))) {
        placeOnNewSheet();
      }
      const spaceOnRow2 = (cursorX === 0 ? sheetW : sheetW - (cursorX + kerf));
      const fitsNormal2 = w <= spaceOnRow2 && h <= (sheetH - cursorY);
      const fitsRotated2 = opts.allowRotate
        ? (h <= spaceOnRow2 && w <= (sheetH - cursorY))
        : false;

      if (!fitsNormal2 && fitsRotated2) {
        rotated = true;
        [w, h] = [h, w];
      } else if (!fitsNormal2 && !fitsRotated2) {
        continue;
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