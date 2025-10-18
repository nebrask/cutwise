import { describe, it, expect } from "vitest";
import { allowedOrientation, minHeightAllowed } from "../packing";
import type { Panel } from "../../types";

describe("Grain orientation rules", () => {
  describe("wood-h (horizontal grain)", () => {
    it("prefers horizontal orientation when wider than tall", () => {
      const panel: Panel = { id: "w1", width: 900, height: 300, qty: 1, material: "wood-h", label: "" };
      const rot = allowedOrientation(panel, true);
      expect(rot.allowNormal).toBe(true);
      expect(rot.allowRotated).toBe(false);
    });

    it("forces rotation when taller than wide", () => {
      const panel: Panel = { id: "w2", width: 300, height: 900, qty: 1, material: "wood-h", label: "" };
      const rot = allowedOrientation(panel, true);
      expect(rot.mustRotate).toBe(true);
      expect(rot.allowRotated).toBe(true);
    });

    it("allows rotation for square pieces", () => {
      const panel: Panel = { id: "w3", width: 400, height: 400, qty: 1, material: "wood-h", label: "" };
      const rot = allowedOrientation(panel, true);
      expect(rot.allowRotated).toBe(true);
    });
  });

  describe("wood-v (vertical grain)", () => {
    it("prefers vertical orientation when taller than wide", () => {
      const panel: Panel = { id: "w4", width: 300, height: 900, qty: 1, material: "wood-v", label: "" };
      const rot = allowedOrientation(panel, true);
      expect(rot.allowNormal).toBe(true);
      expect(rot.allowRotated).toBe(false);
    });

    it("forces rotation when wider than tall", () => {
      const panel: Panel = { id: "w5", width: 900, height: 300, qty: 1, material: "wood-v", label: "" };
      const rot = allowedOrientation(panel, true);
      expect(rot.mustRotate).toBe(true);
    });
  });

  describe("minHeightAllowed", () => {
    it("returns smaller dimension for plywood (no grain constraint)", () => {
      const panel: Panel = { id: "p1", width: 900, height: 300, qty: 1, material: "plywood", label: "" };
      expect(minHeightAllowed(panel)).toBe(300);
    });

    it("respects wood-h grain constraint", () => {
      const panel: Panel = { id: "w1", width: 900, height: 300, qty: 1, material: "wood-h", label: "" };
      expect(minHeightAllowed(panel)).toBe(300);
    });

    it("respects wood-v grain constraint", () => {
      const panel: Panel = { id: "w2", width: 300, height: 900, qty: 1, material: "wood-v", label: "" };
      expect(minHeightAllowed(panel)).toBe(900);
    });
  });
});