import { describe, it, expect } from "vitest";
import { packShelf, packShelfBestFit } from "../packing";
import { withinBounds, noOverlap } from "./helpers";
import type { PlannerInputs } from "../../types";

const shelfInputs: PlannerInputs = {
  sheet: { width: 2440, height: 1220 },
  kerf: 3.2,
  panels: [
    { id: "p1", width: 1100, height: 300, qty: 3, material: "plywood", label: "Shelf" },
    { id: "p2", width: 400, height: 400, qty: 4, material: "plywood", label: "Square" },
    { id: "p3", width: 300, height: 300, qty: 4, material: "plywood", label: "Small" },
  ],
};

describe("Shelf algorithms First-Fit vs Best-Fit", () => {
  it("First-Fit: valid placement", () => {
    const result = packShelf(shelfInputs, { allowRotate: true, sort: "height" });
    for (const sheet of result.sheets) {
      expect(withinBounds(sheet.rects, shelfInputs.sheet.width, shelfInputs.sheet.height)).toBe(true);
      expect(noOverlap(sheet.rects, shelfInputs.kerf)).toBe(true);
    }
  });

  it("Best-Fit: valid placement", () => {
    const result = packShelfBestFit(shelfInputs, { allowRotate: true, sort: "height" });
    for (const sheet of result.sheets) {
      expect(withinBounds(sheet.rects, shelfInputs.sheet.width, shelfInputs.sheet.height)).toBe(true);
      expect(noOverlap(sheet.rects, shelfInputs.kerf)).toBe(true);
    }
  });

  it("both produce valid results with different sort strategies", () => {
    const sorts = ["height", "area", "width"] as const;
    for (const sort of sorts) {
      const first = packShelf(shelfInputs, { allowRotate: true, sort });
      const best = packShelfBestFit(shelfInputs, { allowRotate: true, sort });
      expect(first.sheets.length).toBeGreaterThan(0);
      expect(best.sheets.length).toBeGreaterThan(0);
    }
  });
});