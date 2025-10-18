import { describe, it, expect } from "vitest";
import {
  packNaive,
  packShelf,
  packShelfBestFit,
  packSkyline,
  packGuillotine,
  computeWastePercent,
} from "../packing";
import type { PlannerInputs } from "../../types";
import { withinBounds, noOverlap, totalAreaPreserved } from "./helpers";

const commonInputs: PlannerInputs = {
  sheet: { width: 2440, height: 1220 },
  kerf: 3.2,
  panels: [
    { id: "p1", width: 1100, height: 600, qty: 2, material: "plywood", label: "Top/Bottom" },
    { id: "p2", width: 600, height: 1200, qty: 2, material: "plywood", label: "Side" },
    { id: "p3", width: 400, height: 500, qty: 2, material: "acrylic", label: "Door" },
  ],
};

describe("Common behavior tests across the packing algorithms", () => {
  const algorithms = [
    { name: "packNaive", fn: packNaive },
    { name: "packShelf", fn: packShelf },
    { name: "packShelfBestFit", fn: packShelfBestFit },
    { name: "packSkyline", fn: packSkyline },
    { name: "packGuillotine", fn: packGuillotine },
  ];

  algorithms.forEach(({ name, fn }) => {
    describe(name, () => {
      it("places all panels without overlaps and within bounds", () => {
        const result = fn(commonInputs, { allowRotate: true, sort: "height" });
        for (const sheet of result.sheets) {
          expect(withinBounds(sheet.rects, commonInputs.sheet.width, commonInputs.sheet.height)).toBe(true);
          expect(noOverlap(sheet.rects, commonInputs.kerf)).toBe(true);
        }
      });

      it("preserves total panel area", () => {
        const result = fn(commonInputs, { allowRotate: true, sort: "height" });
        expect(totalAreaPreserved(commonInputs.panels, result.totalPanelArea)).toBe(true);
      });

      it("groups panels by material onto separate sheets", () => {
        const result = fn(commonInputs, { allowRotate: true, sort: "height" });
        
        for (const sheet of result.sheets) {
          const materialsOnSheet = new Set<string>();
          for (const rect of sheet.rects) {
            const panelMat = commonInputs.panels.find(p => p.id === rect.baseId)?.material ?? "plywood";
            materialsOnSheet.add(panelMat);
          }
          expect(materialsOnSheet.size).toBe(1);
        }
      });

      it("produces waste less than 100%", () => {
        const result = fn(commonInputs, { allowRotate: true, sort: "height" });
        const waste = computeWastePercent(result);
        expect(waste).toBeLessThan(100);
        expect(waste).toBeGreaterThanOrEqual(0);
      });

      it("respects rotation constraints when allowRotate is false", () => {
        const result = fn(commonInputs, { allowRotate: false, sort: "height" });
        for (const sheet of result.sheets) {
          for (const rect of sheet.rects) {
            expect(rect.rotated).toBe(false);
          }
        }
      });
    });
  });
});