import type { PlacedRect } from "../packing";

export function withinBounds(rects: PlacedRect[], W: number, H: number): boolean {
  return rects.every(r => r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H);
}

export function noOverlap(rects: PlacedRect[], kerf: number): boolean {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      const sepX = (a.x + a.w + kerf) <= b.x || (b.x + b.w + kerf) <= a.x;
      const sepY = (a.y + a.h + kerf) <= b.y || (b.y + b.h + kerf) <= a.y;
      if (!(sepX || sepY)) return false;
    }
  }
  return true;
}

export function totalAreaPreserved(panels: Array<{ width: number; height: number; qty: number }>, totalAreaUsed: number): boolean {
  const expected = panels.reduce((acc, p) => acc + (p.width * p.height * p.qty), 0);
  return Math.abs(expected - totalAreaUsed) < 1;
}
