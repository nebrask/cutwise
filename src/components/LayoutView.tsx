import React, { useMemo, useState } from "react";
import LayoutCanvas from "./LayoutCanvas";
import Section from "./Section";
import type { PlannerInputs } from "../types";
import {
  computeWastePercent,
  packNaive,
  packImproved,
} from "../utils/packing";
import type { PackResult } from "../utils/packing";

type Props = {
  inputs: PlannerInputs;
  onBack: () => void;
};

export default function LayoutView({ inputs, onBack }: Props) {
  const [allowRotate, setAllowRotate] = useState(true);
  const [sort, setSort] = useState<"height" | "area">("height");

  const baseline: PackResult = useMemo(() => packNaive(inputs), [inputs]);
  const improved: PackResult = useMemo(
    () => packImproved(inputs, { allowRotate, sort }),
    [inputs, allowRotate, sort]
  );

  const wasteBase = computeWastePercent(baseline);
  const wasteImp = computeWastePercent(improved);
  const delta = (wasteBase - wasteImp);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Layout</h2>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-900"
        >
          Back to Inputs
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Section title="Comparison">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium text-gray-300">Baseline (naive)</div>
                <LayoutCanvas
                  sheetWidth={inputs.sheet.width}
                  sheetHeight={inputs.sheet.height}
                  kerf={inputs.kerf}
                  sheet={baseline.sheets[0]}
                />
                <div className="mt-2 text-xs text-gray-400">
                  Waste: <span className="text-gray-100">{wasteBase.toFixed(1)}%</span> • Sheets:{" "}
                  <span className="text-gray-100">{baseline.totalSheets}</span>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-gray-300">Improved (sorted + rotation)</div>
                <LayoutCanvas
                  sheetWidth={inputs.sheet.width}
                  sheetHeight={inputs.sheet.height}
                  kerf={inputs.kerf}
                  sheet={improved.sheets[0]}
                />
                <div className="mt-2 text-xs text-gray-400">
                  Waste: <span className="text-gray-100">{wasteImp.toFixed(1)}%</span> • Sheets:{" "}
                  <span className="text-gray-100">{improved.totalSheets}</span>
                </div>
              </div>
            </div>
          </Section>
        </div>

        <aside className="space-y-4">
          <Section title="Heuristic Controls">
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allowRotate}
                  onChange={(e) => setAllowRotate(e.target.checked)}
                />
                <span>Allow 90° rotation</span>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-gray-300">Sort panels by</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "height" | "area")}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100 outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="height">Height (desc)</option>
                  <option value="area">Area (desc)</option>
                </select>
              </label>
            </div>
          </Section>

          <Section title="Summary">
            <ul className="space-y-1 text-sm">
              <li>
                Baseline waste: <span className="text-gray-100">{wasteBase.toFixed(1)}%</span>
              </li>
              <li>
                Improved waste: <span className="text-gray-100">{wasteImp.toFixed(1)}%</span>
              </li>
              <li>
                Waste delta:{" "}
                <span className={`${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {delta >= 0 ? "▼" : "▲"} {Math.abs(delta).toFixed(1)}%
                </span>
              </li>
              <li className="text-xs text-gray-500 mt-2">
                Note: both methods currently only compare first sheet only in preview, but metrics use all sheets.
              </li>
            </ul>
          </Section>
        </aside>
      </div>
    </div>
  );
}
