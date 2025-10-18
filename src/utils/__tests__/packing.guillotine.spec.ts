import { describe, it, expect } from "vitest";
import { packGuillotine } from "../packing";
import { withinBounds, noOverlap } from "./helpers";
import type { PlannerInputs } from "../../types";

const guillotineInputs: PlannerInputs = {
  sheet: { width: 2440, height: 1220 },
  kerf: 3.2,
  panels: [
    { id: "p1", width: 600, height: 1200, qty: 2, material: "plywood", label: "Tall" },
    { id: "p2", width: 1100, height: 300, qty: 3, material: "plywood", label: "Wide" },
    { id: "p3", width: 500, height: 250, qty: 3, material: "plywood", label: "Small" },
  ],
};

describe("packGuillotine split logic", () => {
  it("produces placements that fit within bounds without overlap", () => {
    const result = packGuillotine(guillotineInputs, { allowRotate: true, sort: "area" });
    for (const sheet of result.sheets) {
      expect(withinBounds(sheet.rects, guillotineInputs.sheet.width, guillotineInputs.sheet.height)).toBe(true);
      expect(noOverlap(sheet.rects, guillotineInputs.kerf)).toBe(true);
    }
  });

  it("places all panels correctly", () => {
    const result = packGuillotine(guillotineInputs, { allowRotate: true, sort: "area" });
    const allRects = result.sheets.flatMap(s => s.rects);
    expect(allRects.length).toBe(8); // 2 + 3 + 3
  });

  it("handles all sort variants correctly", () => {
    const sorts = ["height", "area", "width"] as const;
    for (const sort of sorts) {
      const result = packGuillotine(guillotineInputs, { allowRotate: true, sort });
      
      const allRects = result.sheets.flatMap(s => s.rects);
      expect(allRects.length).toBe(8);
      
      for (const sheet of result.sheets) {
        expect(withinBounds(sheet.rects, guillotineInputs.sheet.width, guillotineInputs.sheet.height)).toBe(true);
        expect(noOverlap(sheet.rects, guillotineInputs.kerf)).toBe(true);
      }
    }
  });
});