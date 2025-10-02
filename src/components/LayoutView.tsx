import React, { useMemo, useState } from "react";
import LayoutCanvas from "./LayoutCanvas";
import Section from "./Section";
import type { PlannerInputs } from "../types";
import { computeWastePercent, packNaive } from "../utils/packing";
import type { PackResult } from "../utils/packing";

type Props = {
  inputs: PlannerInputs;
  onBack: () => void;
};

export default function LayoutView({ inputs, onBack }: Props) {
  const result: PackResult = useMemo(() => packNaive(inputs), [inputs]);
  const [activeSheet, setActiveSheet] = useState(0);

  const waste = computeWastePercent(result);

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
          <Section title="Sheet Preview">
            {result.sheets.length > 0 ? (
              <LayoutCanvas
                sheetWidth={inputs.sheet.width}
                sheetHeight={inputs.sheet.height}
                kerf={inputs.kerf}
                sheet={result.sheets[activeSheet]}
              />
            ) : (
              <div className="text-sm text-gray-400">No layout available.</div>
            )}
          </Section>
        </div>

        <aside className="space-y-4 pb-24">
          <Section title="Summary">
            <ul className="space-y-1 text-sm">
              <li>
                Sheets used:{" "}
                <span className="text-gray-100">{result.totalSheets}</span>
              </li>
              <li>
                Waste (whitespace only):{" "}
                <span className="text-gray-100">{waste.toFixed(1)}%</span>
              </li>
              <li>
                Kerf: <span className="text-gray-100">{inputs.kerf} mm</span>
              </li>
              <li>
                Sheet:{" "}
                <span className="text-gray-100">
                  {inputs.sheet.width} × {inputs.sheet.height} mm
                </span>
              </li>
            </ul>
          </Section>

          <Section
            title="Sheets"
            right={null}
          >
            {result.sheets.length <= 1 ? (
              <div className="text-sm text-gray-400">Single sheet</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.sheets.map((s, i) => (
                  <button
                    key={s.index}
                    type="button"
                    onClick={() => setActiveSheet(i)}
                    className={`rounded-lg px-3 py-1.5 text-sm ${
                      i === activeSheet
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                    }`}
                  >
                    Sheet {i + 1}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-gray-500">
              Baseline: no rotation, left→right placement with row wraps. Next: add improved heuristics.
            </p>
          </Section>
        </aside>
      </div>
    </div>
  );
}
