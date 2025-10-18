import { describe, it, expect } from "vitest";
import { packSkyline } from "../packing";
import { withinBounds, noOverlap } from "./helpers";
import type { PlannerInputs } from "../../types";

const skylineInputs: PlannerInputs = {
  sheet: { width: 2440, height: 1220 },
  kerf: 3.2,
  panels: [
    { id: "p1", width: 1100, height: 600, qty: 2, material: "plywood", label: "Panel A" },
    { id: "p2", width: 500, height: 800, qty: 3, material: "plywood", label: "Panel B" },
    { id: "p3", width: 400, height: 400, qty: 4, material: "plywood", label: "Panel C" },
  ],
};

describe("packSkyline specific behavior", () => {
  it("handles varied aspect ratios efficiently", () => {
    const result = packSkyline(skylineInputs, { allowRotate: true, sort: "height" });
    for (const sheet of result.sheets) {
      expect(withinBounds(sheet.rects, skylineInputs.sheet.width, skylineInputs.sheet.height)).toBe(true);
      expect(noOverlap(sheet.rects, skylineInputs.kerf)).toBe(true);
    }
    expect(result.sheets.length).toBeGreaterThan(0);
  });

  it("produces valid results with area sort", () => {
    const result = packSkyline(skylineInputs, { allowRotate: true, sort: "area" });
    const allRects = result.sheets.flatMap(s => s.rects);
    expect(allRects.length).toBe(9); // qty -> 2 + 3 + 4
  });

  it("produces valid results with width sort", () => {
    const result = packSkyline(skylineInputs, { allowRotate: true, sort: "width" });
    const allRects = result.sheets.flatMap(s => s.rects);
    expect(allRects.length).toBe(9);
  });
});
