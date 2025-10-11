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
      x,
      y,
      w,
      h,
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
  sort: "height" | "area" | "width";
};

function sortCopies(
  copies: { width: number; height: number }[],
  sort: "height" | "area" | "width"
) {
  copies.sort((a, b) => {
    if (sort === "area") return b.width * b.height - a.width * a.height;
    if (sort === "width") return b.width - a.width;
    return b.height - a.height;
  });
}

export function packShelf(
  inputs: PlannerInputs,
  opts: HeuristicOptions
): PackResult {
  const { sheet, kerf, panels } = inputs;
  const copies = expandCopies(panels);

  sortCopies(copies, opts.sort);

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

    let spaceOnRow = cursorX === 0 ? sheetW : sheetW - (cursorX + kerf);
    let fitsNormal = w <= spaceOnRow && h <= sheetH - cursorY;
    let fitsRotated = opts.allowRotate ? h <= spaceOnRow && w <= sheetH - cursorY : false;

    if (!fitsNormal && !fitsRotated) {
      cursorX = 0;
      cursorY = cursorY + rowH + kerf;
      rowH = 0;

      if (h > sheetH - cursorY && (!opts.allowRotate || w > sheetH - cursorY)) {
        placeOnNewSheet();
      }

      spaceOnRow = cursorX === 0 ? sheetW : sheetW - (cursorX + kerf);
      fitsNormal = w <= spaceOnRow && h <= sheetH - cursorY;
      fitsRotated = opts.allowRotate ? h <= spaceOnRow && w <= sheetH - cursorY : false;

      if (!fitsNormal && !fitsRotated) {
        placeOnNewSheet();
        spaceOnRow = sheetW;
        fitsNormal = w <= spaceOnRow && h <= sheetH;
        fitsRotated = opts.allowRotate ? h <= spaceOnRow && w <= sheetH : false;
        if (!fitsNormal && !fitsRotated) {
          console.warn(`Panel ${c.label} too large for sheet`);
          continue;
        }
      }
    }

    if (fitsNormal && !fitsRotated) {
      const atEdge = spaceOnRow < sheetW * 0.4;
      const isTall = h > w * 1.5;
      const wouldFitRotatedOnNewRow =
        opts.allowRotate && h <= sheetW && w <= sheetH - (cursorY + rowH + kerf);
      if (atEdge && isTall && wouldFitRotatedOnNewRow) {
        cursorX = 0;
        cursorY = cursorY + rowH + kerf;
        rowH = 0;
        if (cursorY + w > sheetH) {
          placeOnNewSheet();
        }
        rotated = true;
        [w, h] = [h, w];
      }
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
      x,
      y,
      w,
      h,
      rotated,
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

export function packShelfBestFit(
  inputs: PlannerInputs,
  opts: HeuristicOptions
): PackResult {
  const { sheet, kerf } = inputs;
  const sheetW = sheet.width;
  const sheetH = sheet.height;
  const sheetArea = sheetW * sheetH;

  const copies = expandCopies(inputs.panels);
  sortCopies(copies, opts.sort);

  type Row = { y: number; h: number; cursorX: number };
  const sheets: SheetLayout[] = [];
  let current: SheetLayout = { index: 0, rects: [] };
  sheets.push(current);

  let rows: Row[] = [{ y: 0, h: 0, cursorX: 0 }];

  const placeOnNewSheet = () => {
    current = { index: sheets.length, rects: [] };
    sheets.push(current);
    rows = [{ y: 0, h: 0, cursorX: 0 }];
  };

  const startNewRow = () => {
    const last = rows[rows.length - 1];
    const newY = last.y + last.h + (rows.length > 0 ? kerf : 0);
    rows.push({ y: newY, h: 0, cursorX: 0 });
  };

  const tryPlaceInRow = (
    row: Row,
    w0: number,
    h0: number,
    allowRot: boolean
  ):
    | { placed: true; x: number; y: number; w: number; h: number; rotated: boolean }
    | { placed: false } => {
    let w = w0;
    let h = h0;
    let rotated = false;

    const spaceOnRow = row.cursorX === 0 ? sheetW : sheetW - (row.cursorX + kerf);
    const fitsN = w <= spaceOnRow && row.y + h <= sheetH;
    const fitsR = allowRot ? h <= spaceOnRow && row.y + w <= sheetH : false;

    if (!fitsN && !fitsR) return { placed: false };

    if (fitsN && fitsR) {
      const leftoverN = spaceOnRow - w;
      const leftoverR = spaceOnRow - h;
      if (leftoverR < leftoverN) {
        rotated = true;
        [w, h] = [h, w];
      }
    } else if (!fitsN && fitsR) {
      rotated = true;
      [w, h] = [h, w];
    }

    const x = row.cursorX === 0 ? 0 : row.cursorX + kerf;
    const y = row.y;
    return { placed: true, x, y, w, h, rotated };
  };

  for (let i = 0; i < copies.length; i++) {
    const c = copies[i];

    let best:
      | {
          rowIdx: number;
          x: number;
          y: number;
          w: number;
          h: number;
          rotated: boolean;
          leftover: number;
        }
      | null = null;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const res = tryPlaceInRow(row, c.width, c.height, opts.allowRotate);
      if (!("placed" in res) || !res.placed) continue;

      const spaceOnRow = row.cursorX === 0 ? sheetW : sheetW - (row.cursorX + kerf);
      const leftover = spaceOnRow - res.w;
      if (best === null || leftover < best.leftover) {
        best = {
          rowIdx: r,
          x: res.x,
          y: res.y,
          w: res.w,
          h: res.h,
          rotated: res.rotated,
          leftover,
        };
      }
    }

    if (!best) {
      const last = rows[rows.length - 1];
      const nextY = last.y + last.h + (rows.length > 0 ? kerf : 0);

      if (nextY + Math.min(c.height, c.width) > sheetH) {
        placeOnNewSheet();
      } else {
        startNewRow();
      }

      const row = rows[rows.length - 1];
      const res = tryPlaceInRow(row, c.width, c.height, opts.allowRotate);

      if (!("placed" in res) || !res.placed) {
        placeOnNewSheet();
        const row2 = rows[rows.length - 1];
        const res2 = tryPlaceInRow(row2, c.width, c.height, opts.allowRotate);
        if (!("placed" in res2) || !res2.placed) continue;

        current.rects.push({
          id: `s${current.index}-i${i}`,
          baseId: c.id,
          baseIndex: c.baseIndex,
          copyIndex: c.copyIndex,
          label: c.label,
          x: res2.x,
          y: res2.y,
          w: res2.w,
          h: res2.h,
          rotated: res2.rotated,
        });
        row2.cursorX = res2.x + res2.w;
        row2.h = Math.max(row2.h, res2.h);
      } else {
        current.rects.push({
          id: `s${current.index}-i${i}`,
          baseId: c.id,
          baseIndex: c.baseIndex,
          copyIndex: c.copyIndex,
          label: c.label,
          x: res.x,
          y: res.y,
          w: res.w,
          h: res.h,
          rotated: res.rotated,
        });
        row.cursorX = res.x + res.w;
        row.h = Math.max(row.h, res.h);
      }
    } else {
      const row = rows[best.rowIdx];
      current.rects.push({
        id: `s${current.index}-i${i}`,
        baseId: c.id,
        baseIndex: c.baseIndex,
        copyIndex: c.copyIndex,
        label: c.label,
        x: best.x,
        y: best.y,
        w: best.w,
        h: best.h,
        rotated: best.rotated,
      });
      row.cursorX = best.x + best.w;
      row.h = Math.max(row.h, best.h);
    }
  }

  const totalPanelArea = copies.reduce((acc, p) => acc + p.width * p.height, 0);
  return {
    sheets,
    totalSheets: sheets.length,
    totalPanelArea,
    sheetAreaEach: sheetArea,
  };
}

type SkylineNode = { x: number; y: number; width: number };

function mergeSkyline(nodes: SkylineNode[]) {
  nodes.sort((a, b) => a.x - b.x);
  let i = 0;
  while (i < nodes.length - 1) {
    const cur = nodes[i];
    const nxt = nodes[i + 1];
    if (cur.y === nxt.y && cur.x + cur.width === nxt.x) {
      cur.width += nxt.width;
      nodes.splice(i + 1, 1);
    } else {
      i++;
    }
  }
}

function findSkylineLevel(
 nodes: SkylineNode[],
 sheetW: number,
 sheetH: number,
 rectW: number,
 rectH: number,
 kerf: number
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;

  for (let start = 0; start < nodes.length; start++) {
    let x = nodes[start].x;
    let y = nodes[start].y;
    let widthLeft = rectW;

    if (x > 0) {
      x += kerf;
      if (x >= nodes[start].x + nodes[start].width) continue;
    }

    let j = start;
    let curX = x;
    let maxY = y;

    while (widthLeft > 0 && j < nodes.length) {
      const n = nodes[j];
      const segStart = Math.max(curX, n.x);
      const segEnd = n.x + n.width;
      const segWidth = Math.max(0, segEnd - segStart);
      if (segWidth <= 0) {
        j++;
        continue;
      }

      maxY = Math.max(maxY, n.y);
      widthLeft -= segWidth;
      curX = segEnd;
      j++;
    }

    if (widthLeft > 0) continue;
    if (maxY + rectH > sheetH) continue;

    if (!best || maxY < best.y || (maxY === best.y && x < best.x)) {
      best = { x, y: maxY };
    }
  }

  return best;
}

function addSkylineLevel(
  nodes: SkylineNode[],
  placeX: number,
  placeY: number,
  rectW: number,
  rectH: number,
  kerf: number
) {
  const targetStart = placeX;
  const targetEnd = placeX + rectW;
  const next: SkylineNode[] = [];

  for (const n of nodes) {
    const nStart = n.x;
    const nEnd = n.x + n.width;

    if (nEnd <= targetStart || nStart >= targetEnd) {
      next.push(n);
      continue;
    }

    if (nStart < targetStart) {
      next.push({ x: nStart, y: n.y, width: targetStart - nStart });
    }

    if (nEnd > targetEnd) {
      next.push({ x: targetEnd, y: n.y, width: nEnd - targetEnd });
    }
  }

  const newNode: SkylineNode = {
    x: targetStart,
    y: placeY + rectH + kerf,
    width: rectW,
  };
  next.push(newNode);

  mergeSkyline(next);

  nodes.length = 0;
  nodes.push(...next);
}

export function packSkyline(
  inputs: PlannerInputs,
  opts: HeuristicOptions
): PackResult {
  const { sheet, kerf } = inputs;
  const sheetW = sheet.width;
  const sheetH = sheet.height;
  const sheetArea = sheetW * sheetH;

  const copies = (() => {
    const arr: (Panel & { baseIndex: number; copyIndex: number; label: string })[] = [];
    inputs.panels.forEach((p, baseIndex) => {
      const baseNumber = baseIndex + 1;
      for (let ci = 0; ci < p.qty; ci++) {
        const copyNumber = ci + 1;
        arr.push({ ...p, baseIndex, copyIndex: ci, label: `${baseNumber}-${copyNumber}` });
      }
    });
    arr.sort((a, b) => {
      if (opts.sort === "area") {
        const d = b.width * b.height - a.width * a.height;
        if (d !== 0) return d;
      } else if (opts.sort === "width") {
        if (b.width !== a.width) return b.width - a.width;
      } else {
        if (b.height !== a.height) return b.height - a.height;
      }
      if (b.width !== a.width) return b.width - a.width;
      const areaDiff = b.width * b.height - a.width * a.height;
      if (areaDiff !== 0) return areaDiff;
      return a.baseIndex - b.baseIndex;
    });
    return arr;
  })();

  const sheets: SheetLayout[] = [];
  let current: SheetLayout = { index: 0, rects: [] };
  sheets.push(current);

  let skyline: SkylineNode[] = [{ x: 0, y: 0, width: sheetW }];

  const newSheet = () => {
    current = { index: sheets.length, rects: [] };
    sheets.push(current);
    skyline = [{ x: 0, y: 0, width: sheetW }];
  };

  const MAX_NODES = 4096;

  for (let i = 0; i < copies.length; i++) {
    const c = copies[i];
    let picked: { x: number; y: number; w: number; h: number; rotated: boolean } | null = null;
    const posN = findSkylineLevel(skyline, sheetW, sheetH, c.width, c.height, kerf);

    if (posN) picked = { x: posN.x, y: posN.y, w: c.width, h: c.height, rotated: false };

    if (opts.allowRotate) {
      const posR = findSkylineLevel(skyline, sheetW, sheetH, c.height, c.width, kerf);
      if (posR) {
        if (!picked || posR.y < picked.y || (posR.y === picked.y && posR.x < picked.x)) {
          picked = { x: posR.x, y: posR.y, w: c.height, h: c.width, rotated: true };
        }
      }
    }

    if (!picked) {
      newSheet();
      const pos2 = findSkylineLevel(skyline, sheetW, sheetH, c.width, c.height, kerf);
      if (pos2) {
        picked = { x: pos2.x, y: pos2.y, w: c.width, h: c.height, rotated: false };
      } else if (opts.allowRotate) {
        const pos3 = findSkylineLevel(skyline, sheetW, sheetH, c.height, c.width, kerf);
        if (pos3) picked = { x: pos3.x, y: pos3.y, w: c.height, h: c.width, rotated: true };
      }
      if (!picked) {
        console.warn(`Panel ${c.label} is too large for sheet`);
        continue;
      }
    }

    addSkylineLevel(skyline, picked.x, picked.y, picked.w, picked.h, kerf);

    if (skyline.length > MAX_NODES) {
      newSheet();
    }

    current.rects.push({
      id: `s${current.index}-i${i}`,
      baseId: c.id,
      baseIndex: c.baseIndex,
      copyIndex: c.copyIndex,
      label: c.label,
      x: picked.x,
      y: picked.y,
      w: picked.w,
      h: picked.h,
      rotated: picked.rotated,
    });
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
