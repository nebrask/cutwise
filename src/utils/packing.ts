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
  material?: string;
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

function groupCopiesByMaterial(copies: PanelCopy[]): Map<string, PanelCopy[]> {
  const groups = new Map<string, PanelCopy[]>();
  
  copies.forEach(copy => {
    const material = copy.material ?? "plywood";
    if (!groups.has(material)) {
      groups.set(material, []);
    }
    groups.get(material)!.push(copy);
  });
  
  return groups;
}

type OrientationAllowance = {
  allowNormal: boolean;   
  allowRotated: boolean;  
  mustRotate: boolean;    
};

function allowedOrientation(panel: Panel, allowRotateToggle: boolean): OrientationAllowance {
  const mat = panel.material ?? "plywood"; 
  const w = panel.width;
  const h = panel.height;
  const square = w === h;


  if (mat === "plywood" || mat === "mdf" || mat === "acrylic") {
    return {
      allowNormal: true,
      allowRotated: allowRotateToggle, 
      mustRotate: false,
    };
  }

  
  if (mat === "wood-h") {
    if (square) {
      return { allowNormal: true, allowRotated: allowRotateToggle, mustRotate: false };
    }
    if (w > h) {
      return { allowNormal: true, allowRotated: false, mustRotate: false };
    } else {
      return { allowNormal: false, allowRotated: true, mustRotate: true };
    }
  }

  if (mat === "wood-v") {
    if (square) {
      return { allowNormal: true, allowRotated: allowRotateToggle, mustRotate: false };
    }
    if (h > w) {
      return { allowNormal: true, allowRotated: false, mustRotate: false };
    } else {
      return { allowNormal: false, allowRotated: true, mustRotate: true };
    }
  }

  return {
    allowNormal: true,
    allowRotated: allowRotateToggle,
    mustRotate: false,
  };
}

function minHeightAllowed(panel: Panel): number {
  
  const w = panel.width;
  const h = panel.height;
  const mat = panel.material ?? "plywood";
  const square = w === h;

  if (mat === "wood-h") {
    if (square) return Math.min(w, h);
    
    return w > h ? h : w; 
  }
  if (mat === "wood-v") {
    if (square) return Math.min(w, h);
    return h > w ? h : w; 
  }
  
  return Math.min(w, h);
}

export function packNaive(inputs: PlannerInputs): PackResult {
  const { sheet, kerf, panels } = inputs;

  const allCopies = expandCopies(panels);
  const materialGroups = groupCopiesByMaterial(allCopies);
  const sheets: SheetLayout[] = [];
  let totalPanelArea = 0;
  let sheetIndex = 0;

  for (const [material, copies] of materialGroups) {
    const sheetW = sheet.width;
    const sheetH = sheet.height;

    let current: SheetLayout = { index: sheetIndex, rects: [], material: material };
    sheets.push(current);
    sheetIndex++;

    let cursorX = 0;
    let cursorY = 0;
    let rowH = 0;

    const placeOnNewSheet = () => {
      current = { index: sheetIndex, rects: [], material: material };
      sheets.push(current);
      sheetIndex++;
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

    totalPanelArea += copies.reduce((acc, p) => acc + p.width * p.height, 0);
  }

  return {
    sheets,
    totalSheets: sheets.length,
    totalPanelArea,
    sheetAreaEach: sheet.width * sheet.height,
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
  
  const allCopies = expandCopies(panels);
  const materialGroups = groupCopiesByMaterial(allCopies);
  const sheets: SheetLayout[] = [];
  let totalPanelArea = 0;
  let sheetIndex = 0;

  
  for (const [material, copies] of materialGroups) {
    sortCopies(copies, opts.sort);

    const sheetW = sheet.width;
    const sheetH = sheet.height;

    let current: SheetLayout = { index: sheetIndex, rects: [], material: material };
    sheets.push(current);
    sheetIndex++;

    let cursorX = 0;
    let cursorY = 0;
    let rowH = 0;

    const placeOnNewSheet = () => {
      current = { index: sheetIndex, rects: [], material: material };
      sheets.push(current);
      sheetIndex++;
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
      const rot = allowedOrientation(c, opts.allowRotate);

      let w = c.width;
      let h = c.height;
      let rotated = false;

      const spaceOnRow0 = cursorX === 0 ? sheetW : sheetW - (cursorX + kerf);
      let fitsNormal = rot.allowNormal && w <= spaceOnRow0 && h <= (sheetH - cursorY);
      let fitsRotated = rot.allowRotated && h <= spaceOnRow0 && w <= (sheetH - cursorY);

      if (!fitsNormal && !fitsRotated) {
        cursorX = 0;
        cursorY = cursorY + rowH + kerf;
        rowH = 0;

        const spaceOnRow1 = sheetW;
        fitsNormal = rot.allowNormal && w <= spaceOnRow1 && h <= (sheetH - cursorY);
        fitsRotated = rot.allowRotated && h <= spaceOnRow1 && w <= (sheetH - cursorY);

        if (!fitsNormal && !fitsRotated) {
          placeOnNewSheet();
          const spaceOnRow2 = sheetW;
          fitsNormal = rot.allowNormal && w <= spaceOnRow2 && h <= sheetH;
          fitsRotated = rot.allowRotated && h <= spaceOnRow2 && w <= sheetH;
          if (!fitsNormal && !fitsRotated) {
            console.warn(`Panel ${c.label} is too large for sheet (grain/rotation constraints)`);
            continue;
          }
        }
      }

      if (rot.mustRotate && fitsRotated) {
        rotated = true;
        [w, h] = [h, w];
      } else if (fitsNormal && !fitsRotated) {
        const atEdge = (cursorX === 0 ? sheetW : sheetW - (cursorX + kerf)) < sheetW * 0.4;
        const isTall = h > w * 1.5;
        const wouldFitRotatedOnNewRow =
          rot.allowRotated && h <= sheetW && w <= (sheetH - (cursorY + rowH + kerf));
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
        const spaceOnRow = cursorX === 0 ? sheetW : sheetW - (cursorX + kerf);
        const sN = score(spaceOnRow, rowH, w, h);
        const sR = score(spaceOnRow, rowH, h, w);
        if (rot.mustRotate || sR.rowHAfter < sN.rowHAfter || (sR.rowHAfter === sN.rowHAfter && sR.leftover < sN.leftover)) {
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

    totalPanelArea += copies.reduce((acc, p) => acc + p.width * p.height, 0);
  }

  return {
    sheets,
    totalSheets: sheets.length,
    totalPanelArea,
    sheetAreaEach: sheet.width * sheet.height,
  };
}

export function packShelfBestFit(
  inputs: PlannerInputs,
  opts: HeuristicOptions
): PackResult {
  const { sheet, kerf, panels } = inputs;
  
  const allCopies = expandCopies(panels);
  const materialGroups = groupCopiesByMaterial(allCopies);
  const sheets: SheetLayout[] = [];
  let totalPanelArea = 0;
  let sheetIndex = 0;

  
  for (const [material, copies] of materialGroups) {
    sortCopies(copies, opts.sort);

    const sheetW = sheet.width;
    const sheetH = sheet.height;

    type Row = { y: number; h: number; cursorX: number };
    let current: SheetLayout = { index: sheetIndex, rects: [], material: material };
    sheets.push(current);
    sheetIndex++;

    let rows: Row[] = [{ y: 0, h: 0, cursorX: 0 }];

    const placeOnNewSheet = () => {
      current = { index: sheetIndex, rects: [], material: material };
      sheets.push(current);
      sheetIndex++;
      rows = [{ y: 0, h: 0, cursorX: 0 }];
    };

    const startNewRow = () => {
      const last = rows[rows.length - 1];
      const newY = last.y + last.h + (rows.length > 0 ? kerf : 0);
      rows.push({ y: newY, h: 0, cursorX: 0 });
    };

    const tryPlaceInRow = (
      row: Row,
      panel: Panel,
      allowRotateToggle: boolean
    ):
      | { placed: true; x: number; y: number; w: number; h: number; rotated: boolean }
      | { placed: false } => {
      const rot = allowedOrientation(panel, allowRotateToggle);

      const spaceOnRow = row.cursorX === 0 ? sheetW : sheetW - (row.cursorX + kerf);

      let best: { w: number; h: number; rotated: boolean } | null = null;

      if (rot.allowNormal) {
        const w = panel.width, h = panel.height;
        if (w <= spaceOnRow && row.y + h <= sheetH) {
          best = { w, h, rotated: false };
        }
      }
      if (rot.allowRotated) {
        const w = panel.height, h = panel.width;
        if (w <= spaceOnRow && row.y + h <= sheetH) {
          if (!best) best = { w, h, rotated: true };
          else {
            const leftoverBest = spaceOnRow - best.w;
            const leftoverRot = spaceOnRow - w;
            if (rot.mustRotate || leftoverRot < leftoverBest) {
              best = { w, h, rotated: true };
            }
          }
        }
      }

      if (!best) return { placed: false };

      const x = row.cursorX === 0 ? 0 : row.cursorX + kerf;
      const y = row.y;
      return { placed: true, x, y, w: best.w, h: best.h, rotated: best.rotated };
    };

    for (let i = 0; i < copies.length; i++) {
      const c = copies[i];

      let best: { rowIdx: number; x: number; y: number; w: number; h: number; rotated: boolean; leftover: number; } | null = null;

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const res = tryPlaceInRow(row, c, opts.allowRotate);
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

        const minHAllowed = minHeightAllowed(c);
        if (nextY + minHAllowed > sheetH) {
          placeOnNewSheet();
        } else {
          startNewRow();
        }

        const row = rows[rows.length - 1];
        const res = tryPlaceInRow(row, c, opts.allowRotate);

        if (!("placed" in res) || !res.placed) {
          placeOnNewSheet();
          const row2 = rows[rows.length - 1];
          const res2 = tryPlaceInRow(row2, c, opts.allowRotate);
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

    totalPanelArea += copies.reduce((acc, p) => acc + p.width * p.height, 0);
  }

  return {
    sheets,
    totalSheets: sheets.length,
    totalPanelArea,
    sheetAreaEach: sheet.width * sheet.height,
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
  _sheetW: number,
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
      if (segWidth <= 0) { j++; continue; }

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
  const { sheet, kerf, panels } = inputs;
  
  const allCopies = expandCopies(panels);
  const materialGroups = groupCopiesByMaterial(allCopies);
  const sheets: SheetLayout[] = [];
  let totalPanelArea = 0;
  let sheetIndex = 0;

  
  for (const [material, copies] of materialGroups) {
    const sheetW = sheet.width;
    const sheetH = sheet.height;

    
    copies.sort((a, b) => {
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

    let current: SheetLayout = { index: sheetIndex, rects: [], material: material };
    sheets.push(current);
    sheetIndex++;

    let skyline: SkylineNode[] = [{ x: 0, y: 0, width: sheetW }];

    const newSheet = () => {
      current = { index: sheetIndex, rects: [], material: material};
      sheets.push(current);
      sheetIndex++;
      skyline = [{ x: 0, y: 0, width: sheetW }];
    };

    const MAX_NODES = 4096;

    for (let i = 0; i < copies.length; i++) {
      const c = copies[i];
      const rot = allowedOrientation(c, opts.allowRotate);

      let picked: { x: number; y: number; w: number; h: number; rotated: boolean } | null = null;

      if (rot.allowNormal) {
        const posN = findSkylineLevel(skyline, sheetW, sheetH, c.width, c.height, kerf);
        if (posN) picked = { x: posN.x, y: posN.y, w: c.width, h: c.height, rotated: false };
      }

      if (rot.allowRotated) {
        const posR = findSkylineLevel(skyline, sheetW, sheetH, c.height, c.width, kerf);
        if (posR) {
          if (
            !picked ||
            rot.mustRotate ||  
            posR.y < picked.y ||
            (posR.y === picked.y && posR.x < picked.x)
          ) {
            picked = { x: posR.x, y: posR.y, w: c.height, h: c.width, rotated: true };
          }
        }
      }

      if (!picked) {
        newSheet();
        if (rot.allowNormal) {
          const pos2 = findSkylineLevel(skyline, sheetW, sheetH, c.width, c.height, kerf);
          if (pos2) picked = { x: pos2.x, y: pos2.y, w: c.width, h: c.height, rotated: false };
        }
        if (rot.allowRotated) {
          const pos3 = findSkylineLevel(skyline, sheetW, sheetH, c.height, c.width, kerf);
          if (pos3) {
            if (
              !picked ||
              rot.mustRotate ||
              pos3.y < picked.y || (pos3.y === picked.y && pos3.x < picked.x)
            ) {
              picked = { x: pos3.x, y: pos3.y, w: c.height, h: c.width, rotated: true };
            }
          }
        }
        if (!picked) {
          console.warn(`Panel ${c.label} is too large for sheet (grain/rotation constraints)`);
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

    totalPanelArea += copies.reduce((acc, p) => acc + p.width * p.height, 0);
  }

  return {
    sheets,
    totalSheets: sheets.length,
    totalPanelArea,
    sheetAreaEach: sheet.width * sheet.height,
  };
}

type FreeRect = { x: number; y: number; w: number; h: number };

function canFit(fr: FreeRect, w: number, h: number) {
  return w <= fr.w && h <= fr.h;
}

function bestAreaFitIndex(freeRects: FreeRect[], w: number, h: number) {
  let best = -1;
  let bestAreaWaste = Number.POSITIVE_INFINITY;
  let bestShortSide = Number.POSITIVE_INFINITY;

  for (let i = 0; i < freeRects.length; i++) {
    const fr = freeRects[i];
    if (!canFit(fr, w, h)) continue;

    const waste = fr.w * fr.h - w * h;
    const shortSide = Math.min(fr.w - w, fr.h - h);

    if (
      waste < bestAreaWaste ||
      (waste === bestAreaWaste && shortSide < bestShortSide)
    ) {
      best = i;
      bestAreaWaste = waste;
      bestShortSide = shortSide;
    }
  }
  return best;
}

function splitGuillotine(
  freeRects: FreeRect[],
  i: number,
  used: { x: number; y: number; w: number; h: number },
  kerf: number,
  sheetW: number,
  sheetH: number
) {
  const fr = freeRects[i];

  const rightW = Math.max(0, fr.w - used.w - kerf);
  const rightH = used.h;
  const bottomW = fr.w;
  const bottomH = Math.max(0, fr.h - used.h - kerf);

  const areaSplitVertical =
    (rightW > 0 && rightH > 0 ? rightW * rightH : 0) +
    (bottomW > 0 && bottomH > 0 ? bottomW * bottomH : 0);

  const bottom2W = used.w;
  const bottom2H = Math.max(0, fr.h - used.h - kerf);
  const right2W = Math.max(0, fr.w - used.w - kerf);
  const right2H = fr.h;

  const areaSplitHorizontal =
    (bottom2W > 0 && bottom2H > 0 ? bottom2W * bottom2H : 0) +
    (right2W > 0 && right2H > 0 ? right2W * right2H : 0);

  const useVertical = areaSplitVertical >= areaSplitHorizontal;

  const out: FreeRect[] = [];

  if (useVertical) {
    if (rightW > 0 && rightH > 0) {
      out.push({
        x: used.x + used.w + kerf,
        y: used.y,
        w: rightW,
        h: rightH,
      });
    }

    if (bottomW > 0 && bottomH > 0) {
      out.push({
        x: fr.x,
        y: used.y + used.h + kerf,
        w: bottomW,
        h: bottomH,
      });
    }
  } else {
    if (bottom2W > 0 && bottom2H > 0) {
      out.push({
        x: used.x,
        y: used.y + used.h + kerf,
        w: bottom2W,
        h: bottom2H,
      });
    }

    if (right2W > 0 && right2H > 0) {
      out.push({
        x: used.x + used.w + kerf,
        y: fr.y,
        w: right2W,
        h: right2H,
      });
    }
  }

  freeRects.splice(i, 1);
  for (const r of out) {
    const x2 = Math.max(0, Math.min(r.x, sheetW));
    const y2 = Math.max(0, Math.min(r.y, sheetH));
    const w2 = Math.max(0, Math.min(r.w, sheetW - x2));
    const h2 = Math.max(0, Math.min(r.h, sheetH - y2));
    if (w2 > 0 && h2 > 0) freeRects.push({ x: x2, y: y2, w: w2, h: h2 });
  }
}

function pruneContainedOrMerge(freeRects: FreeRect[]) {
  for (let i = 0; i < freeRects.length; i++) {
    const a = freeRects[i];
    for (let j = freeRects.length - 1; j >= 0; j--) {
      if (i === j) continue;
      const b = freeRects[j];
      const contained =
        a.x >= b.x &&
        a.y >= b.y &&
        a.x + a.w <= b.x + b.w &&
        a.y + a.h <= b.y + b.h;
      if (contained) {
        freeRects.splice(i, 1);
        i--;
        break;
      }
    }
  }

  let merged = true;

  while (merged) {
    merged = false;
    outer: for (let i = 0; i < freeRects.length; i++) {
      for (let j = i + 1; j < freeRects.length; j++) {
        const a = freeRects[i];
        const b = freeRects[j];
        if (a.y === b.y && a.h === b.h) {
          if (a.x + a.w === b.x) {
            a.w += b.w;
            freeRects.splice(j, 1);
            merged = true;
            break outer;
          } else if (b.x + b.w === a.x) {
            b.w += a.w;
            b.x = a.x;
            freeRects.splice(i, 1);
            merged = true;
            break outer;
          }
        }

        if (a.x === b.x && a.w === b.w) {
          if (a.y + a.h === b.y) {
            a.h += b.h;
            freeRects.splice(j, 1);
            merged = true;
            break outer;
          } else if (b.y + b.h === a.y) {
            b.h += a.h;
            b.y = a.y;
            freeRects.splice(i, 1);
            merged = true;
            break outer;
          }
        }
      }
    }
  }
}

export function packGuillotine(
  inputs: PlannerInputs,
  opts: HeuristicOptions
): PackResult {
  const { sheet, kerf, panels } = inputs;
  
  const allCopies = expandCopies(panels);
  const materialGroups = groupCopiesByMaterial(allCopies);
  const sheets: SheetLayout[] = [];
  let totalPanelArea = 0;
  let sheetIndex = 0;

  
  for (const [material, copies] of materialGroups) {
    const sheetW = sheet.width;
    const sheetH = sheet.height;

    copies.sort((a, b) => {
      if (opts.sort === "area") {
        return b.width * b.height - a.width * a.height;
      }
      if (opts.sort === "width") {
        return b.width - a.width;
      }
      return b.height - a.height;
    });

    let current: SheetLayout = { index: sheetIndex, rects: [], material: material };
    sheets.push(current);
    sheetIndex++;

    let freeRects: FreeRect[] = [{ x: 0, y: 0, w: sheetW, h: sheetH }];

    const newSheet = () => {
      current = { index: sheetIndex, rects: [], material: material };
      sheets.push(current);
      sheetIndex++;
      freeRects = [{ x: 0, y: 0, w: sheetW, h: sheetH }];
    };

    for (let i = 0; i < copies.length; i++) {
      const c = copies[i];
      const rot = allowedOrientation(c, opts.allowRotate);

      let placement:
        | { i: number; x: number; y: number; w: number; h: number; rotated: boolean }
        | null = null;

      if (rot.allowNormal) {
        const idxN = bestAreaFitIndex(freeRects, c.width, c.height);
        if (idxN !== -1) {
          const fr = freeRects[idxN];
          placement = { i: idxN, x: fr.x, y: fr.y, w: c.width, h: c.height, rotated: false };
        }
      }

      if (rot.allowRotated) {
        const idxR = bestAreaFitIndex(freeRects, c.height, c.width);
        if (idxR !== -1) {
          const fr = freeRects[idxR];
          const cand = { i: idxR, x: fr.x, y: fr.y, w: c.height, h: c.width, rotated: true };
          if (
            !placement ||
            rot.mustRotate ||
            cand.y < (placement?.y ?? Infinity) ||
            (cand.y === placement?.y && cand.x < (placement?.x ?? Infinity))
          ) {
            placement = cand;
          }
        }
      }

      if (!placement) {
        newSheet();
        if (rot.allowNormal) {
          const j = bestAreaFitIndex(freeRects, c.width, c.height);
          if (j !== -1) {
            const fr = freeRects[j];
            placement = { i: j, x: fr.x, y: fr.y, w: c.width, h: c.height, rotated: false };
          }
        }
        if (rot.allowRotated) {
          const k = bestAreaFitIndex(freeRects, c.height, c.width);
          if (k !== -1) {
            const fr = freeRects[k];
            const cand = { i: k, x: fr.x, y: fr.y, w: c.height, h: c.width, rotated: true };
            if (!placement || rot.mustRotate || cand.y < placement.y || (cand.y === placement.y && cand.x < placement.x)) {
              placement = cand;
            }
          }
        }

        if (!placement) {
          console.warn(`Panel ${c.label} is too large for sheet (grain/rotation constraints)`);
          continue;
        }
      }

      current.rects.push({
        id: `s${current.index}-i${i}`,
        baseId: c.id,
        baseIndex: c.baseIndex,
        copyIndex: c.copyIndex,
        label: c.label,
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
        rotated: placement.rotated,
      });

      splitGuillotine(
        freeRects,
        placement.i,
        { x: placement.x, y: placement.y, w: placement.w, h: placement.h },
        kerf,
        sheetW,
        sheetH
      );

      pruneContainedOrMerge(freeRects);
    }

    totalPanelArea += copies.reduce((acc, p) => acc + p.width * p.height, 0);
  }

  return {
    sheets,
    totalSheets: sheets.length,
    totalPanelArea,
    sheetAreaEach: sheet.width * sheet.height,
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