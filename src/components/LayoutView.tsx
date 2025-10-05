import React, { useMemo, useState } from "react";
import LayoutCanvas from "./LayoutCanvas";
import Section from "./Section";
import type { PlannerInputs } from "../types";
import type { PackResult } from "../utils/packing";
import {
  computeWastePercent,
  packNaive,
  packImproved,
  computeWastePercentForSheet,
} from "../utils/packing";
import SheetPager from "./SheetPager";
import { packResultToCSV, downloadCSV } from "../utils/csv";
import { colorForIndex } from "../utils/colors";
import ColorLegend from "./ColorLegend";

type Props = {
  inputs: PlannerInputs;
  onBack: () => void;
};

export default function LayoutView({ inputs, onBack }: Props) {
  const [allowRotate, setAllowRotate] = useState(true);
  const [sort, setSort] = useState<"height" | "area">("height");
  const [baseIdx, setBaseIdx] = useState(0);
  const [impIdx, setImpIdx] = useState(0);

  const baseline: PackResult = useMemo(() => packNaive(inputs), [inputs]);
  const improved: PackResult = useMemo(
    () => packImproved(inputs, { allowRotate, sort }),
    [inputs, allowRotate, sort]
  );

  const safeBaseIdx = Math.min(baseIdx, Math.max(0, baseline.totalSheets - 1));
  const safeImpIdx  = Math.min(impIdx,  Math.max(0, improved.totalSheets - 1));

  const wasteBaseTotal = computeWastePercent(baseline);
  const wasteImpTotal  = computeWastePercent(improved);
  const deltaTotal = wasteBaseTotal - wasteImpTotal;

  const wasteBaseSheet = computeWastePercentForSheet(
    baseline.sheets[safeBaseIdx],
    baseline.sheetAreaEach
  );
  const wasteImpSheet = computeWastePercentForSheet(
    improved.sheets[safeImpIdx],
    improved.sheetAreaEach
  );

  const onExportBaseline = () => {
    const csv = packResultToCSV(baseline);
    downloadCSV("opticut_baseline.csv", csv);
  };
  const onExportImproved = () => {
    const csv = packResultToCSV(improved);
    downloadCSV("opticut_improved.csv", csv);
  };

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-6 pb-28">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Section title="Comparison">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <SheetPager
                label="Baseline"
                total={baseline.totalSheets}
                index={safeBaseIdx}
                onChange={setBaseIdx}
              />
              <SheetPager
                label="Improved"
                total={improved.totalSheets}
                index={safeImpIdx}
                onChange={setImpIdx}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium text-gray-300">
                  Baseline (naive)
                </div>
                <LayoutCanvas
                  sheetWidth={inputs.sheet.width}
                  sheetHeight={inputs.sheet.height}
                  kerf={inputs.kerf}
                  sheet={baseline.sheets[safeBaseIdx]}
                  maxViewportHeightRatio={0.92}
                  colorForBaseIndex={colorForIndex}
                />
                <div className="mt-2 text-xs text-gray-400">
                  Sheet {safeBaseIdx + 1}/{baseline.totalSheets} • Waste:{" "}
                  <span className="text-gray-100">{wasteBaseSheet.toFixed(1)}%</span>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-gray-300">
                  Improved (sorted + rotation)
                </div>
                <LayoutCanvas
                  sheetWidth={inputs.sheet.width}
                  sheetHeight={inputs.sheet.height}
                  kerf={inputs.kerf}
                  sheet={improved.sheets[safeImpIdx]}
                  maxViewportHeightRatio={0.92}
                  colorForBaseIndex={colorForIndex}
                />
                <div className="mt-2 text-xs text-gray-400">
                  Sheet {safeImpIdx + 1}/{improved.totalSheets} • Waste:{" "}
                  <span className="text-gray-100">{wasteImpSheet.toFixed(1)}%</span>
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
                  onChange={(e) => {
                    setAllowRotate(e.target.checked);
                    setImpIdx(0);
                  }}
                />
                <span>Allow 90° rotation</span>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-gray-300">Sort panels by</span>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as "height" | "area");
                    setImpIdx(0);
                  }}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100 outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="height">Height (desc)</option>
                  <option value="area">Area (desc)</option>
                </select>
              </label>
            </div>
          </Section>

          <Section title="Totals">
            <ul className="space-y-1 text-sm">
              <li>
                Baseline waste (all sheets):{" "}
                <span className="text-gray-100">{wasteBaseTotal.toFixed(1)}%</span>
              </li>
              <li>
                Improved waste (all sheets):{" "}
                <span className="text-gray-100">{wasteImpTotal.toFixed(1)}%</span>
              </li>
              <li>
                Waste delta:{" "}
                <span className={`${deltaTotal >= 0 ? "text-emerald-400" : "text-red-300"}`}>
                  {deltaTotal >= 0 ? "▼" : "▲"} {Math.abs(deltaTotal).toFixed(1)}%
                </span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              Previews show the selected sheet for each strategy. Totals are computed across all sheets.
            </p>
          </Section>

          <Section title="Export & Legend">
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onExportBaseline}
                  className="rounded-xl bg-gray-800 px-3 py-1.5 text-xs hover:bg-gray-700"
                >
                  Export Baseline CSV
                </button>
                <button
                  type="button"
                  onClick={onExportImproved}
                  className="rounded-xl bg-gray-800 px-3 py-1.5 text-xs hover:bg-gray-700"
                >
                  Export Improved CSV
                </button>
              </div>

              <div className="pt-2 border-t border-gray-800">
                <div className="mb-2 text-xs text-gray-400">Panel Colors</div>
                <ColorLegend
                  count={inputs.panels.length}
                  colorForBaseIndex={colorForIndex}
                />
              </div>
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}
