import React, { useEffect, useMemo, useRef, useState } from "react";
import LayoutCanvas from "./LayoutCanvas";
import Section from "./Section";
import type { PlannerInputs } from "../types";
import type { PackResult } from "../utils/packing";
import {
  computeWastePercent,
  packNaive,
  packShelf,
  packSkyline,
  computeWastePercentForSheet,
} from "../utils/packing";
import SheetPager from "./SheetPager";
import { packResultToCSV, downloadCSV } from "../utils/csv";
import { colorForIndex } from "../utils/colors";
import ColorLegend from "./ColorLegend";
import { sheetToSVG, downloadSVG } from "../utils/svg";
import { ChevronDown } from "lucide-react";
import { downloadZip } from "../utils/zip";

type Props = {
  inputs: PlannerInputs;
  onBack: () => void;
};

type ExportAction = "imp_svg" | "imp_svg_all" | "imp_csv" | "base_svg" | "base_svg_all" | "base_csv";

type ExportHandlers = {
  onBaselineCSV: () => void;
  onImprovedCSV: () => void;
  onBaselineSVG: () => void;
  onImprovedSVG: () => void;
  onBaselineSVGAll: () => void;
  onImprovedSVGAll: () => void;
  baselineSheetCount: number;
  improvedSheetCount: number;
  defaultPrimary?: ExportAction;
  busy?: boolean;
};

function SplitExportButton({
  onBaselineCSV,
  onImprovedCSV,
  onBaselineSVG,
  onImprovedSVG,
  onBaselineSVGAll,
  onImprovedSVGAll,
  baselineSheetCount,
  improvedSheetCount,
  defaultPrimary = "imp_svg",
  busy = false,
}: ExportHandlers) {
  const [open, setOpen] = useState(false);
  const [primary, setPrimary] = useState<ExportAction>(defaultPrimary);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handlers = {
    imp_svg: onImprovedSVG,
    imp_svg_all: onImprovedSVGAll,
    imp_csv: onImprovedCSV,
    base_svg: onBaselineSVG,
    base_svg_all: onBaselineSVGAll,
    base_csv: onBaselineCSV,
  };

  const labels = {
    imp_svg: "Export Improved SVG (current)",
    imp_svg_all: `Export Improved All (${improvedSheetCount} sheets, ZIP)`,
    imp_csv: "Export Improved CSV",
    base_svg: "Export Baseline SVG (current)",
    base_svg_all: `Export Baseline All (${baselineSheetCount} sheets, ZIP)`,
    base_csv: "Export Baseline CSV",
  };

  const menuItems = [
    {
      section: "Improved",
      items: [
        { action: "imp_svg" as const, label: labels.imp_svg },
        ...(improvedSheetCount > 1
          ? [{ action: "imp_svg_all" as const, label: labels.imp_svg_all }]
          : []),
        { action: "imp_csv" as const, label: labels.imp_csv },
      ],
    },
    {
      section: "Baseline",
      items: [
        { action: "base_svg" as const, label: labels.base_svg },
        ...(baselineSheetCount > 1
          ? [{ action: "base_svg_all" as const, label: labels.base_svg_all }]
          : []),
        { action: "base_csv" as const, label: labels.base_csv },
      ],
    },
  ];

  const handleAction = (action: ExportAction, makePrimary = false) => {
    if (makePrimary) setPrimary(action);
    handlers[action]();
    if (makePrimary) setOpen(false);
  };

  return (
    <div className="relative">
      <div
        ref={wrapperRef}
        className="inline-flex items-stretch rounded-xl overflow-hidden border border-gray-800"
      >
        <button
          type="button"
          onClick={() => handleAction(primary)}
          className="bg-gray-800 px-3 py-1.5 text-xs hover:bg-gray-700 disabled:opacity-60"
          title={labels[primary]}
          disabled={busy}
        >
          {busy ? "Exporting…" : labels[primary]}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="bg-gray-800 px-2 py-1.5 text-xs hover:bg-gray-700 border-l border-gray-700 disabled:opacity-60"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={busy}
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-800 bg-gray-900 shadow-xl">
            {menuItems.map(({ section, items }, i) => (
              <React.Fragment key={section}>
                {i > 0 && <div className="border-t border-gray-800" />}
                <div className="p-1.5 text-[10px] uppercase tracking-wide text-gray-500">
                  {section}
                </div>
                {items.map(({ action, label }) => (
                  <button
                    key={action}
                    role="menuitem"
                    className="w-full px-2.5 py-1.5 text-left text-xs hover:bg-gray-800"
                    onClick={() => handleAction(action, true)}
                  >
                    {label}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type RightStrategy = "shelf" | "skyline";

export default function LayoutView({ inputs, onBack }: Props) {
  const [allowRotate, setAllowRotate] = useState(true);
  const [sort, setSort] = useState<"height" | "area">("height");
  const [strategy, setStrategy] = useState<RightStrategy>("shelf");
  const [baseIdx, setBaseIdx] = useState(0);
  const [impIdx, setImpIdx] = useState(0);
  const [exporting, setExporting] = useState(false);

  const baseline: PackResult = useMemo(() => packNaive(inputs), [inputs]);

  const improved: PackResult = useMemo(() => {
    if (strategy === "skyline") {
      return packSkyline(inputs, { allowRotate, sort });
    }
    return packShelf(inputs, { allowRotate, sort });
  }, [inputs, allowRotate, sort, strategy]);

  const safeBaseIdx = Math.min(baseIdx, Math.max(0, baseline.totalSheets - 1));
  const safeImpIdx = Math.min(impIdx, Math.max(0, improved.totalSheets - 1));

  const wasteBaseTotal = computeWastePercent(baseline);
  const wasteImpTotal = computeWastePercent(improved);
  const deltaTotal = wasteBaseTotal - wasteImpTotal;

  const wasteBaseSheet = computeWastePercentForSheet(
    baseline.sheets[safeBaseIdx],
    baseline.sheetAreaEach
  );
  const wasteImpSheet = computeWastePercentForSheet(
    improved.sheets[safeImpIdx],
    improved.sheetAreaEach
  );

  const rightLabelShort = strategy === "skyline" ? "Skyline" : "Shelf";
  const rightLabelLong = strategy === "skyline" ? "Skyline (bottom-left)" : "Shelf (FFD)";
  const rightExportPrefix = strategy === "skyline" ? "skyline" : "shelf";

  const onExportBaseline = () => {
    const csv = packResultToCSV(baseline);
    downloadCSV("opticut_baseline.csv", csv);
  };
  const onExportImproved = () => {
    const csv = packResultToCSV(improved);
    downloadCSV(`opticut_${rightExportPrefix}.csv`, csv);
  };

  const onExportBaselineSVG = () => {
    const svg = sheetToSVG({
      sheet: baseline.sheets[safeBaseIdx],
      sheetWidthMm: inputs.sheet.width,
      sheetHeightMm: inputs.sheet.height,
      showLabels: true,
      colorForBaseIndex: colorForIndex,
    });
    downloadSVG(`opticut_baseline_sheet${safeBaseIdx + 1}.svg`, svg);
  };
  const onExportImprovedSVG = () => {
    const svg = sheetToSVG({
      sheet: improved.sheets[safeImpIdx],
      sheetWidthMm: inputs.sheet.width,
      sheetHeightMm: inputs.sheet.height,
      showLabels: true,
      colorForBaseIndex: colorForIndex,
    });
    downloadSVG(
      `opticut_${rightExportPrefix}_sheet${safeImpIdx + 1}.svg`,
      svg
    );
  };

  const onExportAll = async (result: PackResult, prefix: string) => {
    try {
      setExporting(true);
      const files = result.sheets.map((sheet, index) => ({
        name: `${prefix}_sheet${index + 1}.svg`,
        content: sheetToSVG({
          sheet,
          sheetWidthMm: inputs.sheet.width,
          sheetHeightMm: inputs.sheet.height,
          showLabels: true,
          colorForBaseIndex: colorForIndex,
        }),
      }));
      await downloadZip(`opticut_${prefix}_all_sheets.zip`, files);
    } finally {
      setExporting(false);
    }
  };
  const onExportAllBaselineSVG = () => onExportAll(baseline, "baseline");
  const onExportAllImprovedSVG = () => onExportAll(improved, rightExportPrefix);

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
                label={rightLabelShort}
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
                  <span className="text-gray-100">
                    {wasteBaseSheet.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-gray-300">
                  {rightLabelLong}
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
                  <span className="text-gray-100">
                    {wasteImpSheet.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </Section>
        </div>

        <aside className="space-y-3">
          <Section title="Heuristic Controls">
            <div className="space-y-2.5 text-sm">
              <label className="block">
                <span className="mb-1 block text-sm text-gray-300">
                  Right-side strategy
                </span>
                <select
                  value={strategy}
                  onChange={(e) => {
                    setStrategy(e.target.value as RightStrategy);
                    setImpIdx(0);
                  }}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-gray-100 outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="shelf">Shelf (FFD)</option>
                  <option value="skyline">Skyline (bottom-left)</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={allowRotate}
                  onChange={(e) => {
                    setAllowRotate(e.target.checked);
                    setImpIdx(0);
                  }}
                />
                <span>Allow 90° rotation</span>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-gray-300">
                  Sort panels by
                </span>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as "height" | "area");
                    setImpIdx(0);
                  }}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-gray-100 outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="height">Height (desc)</option>
                  <option value="area">Area (desc)</option>
                </select>
              </label>
            </div>
          </Section>

          <Section title="Totals">
            <ul className="space-y-0.5 text-sm">
              <li>
                Baseline waste (all sheets):{" "}
                <span className="text-gray-100">
                  {wasteBaseTotal.toFixed(1)}%
                </span>
              </li>
              <li>
                {rightLabelShort} waste (all sheets):{" "}
                <span className="text-gray-100">
                  {wasteImpTotal.toFixed(1)}%
                </span>
              </li>
              <li>
                Waste delta:{" "}
                <span
                  className={`${
                    deltaTotal >= 0 ? "text-emerald-400" : "text-red-300"
                  }`}
                >
                  {deltaTotal >= 0 ? "▼" : "▲"}{" "}
                  {Math.abs(deltaTotal).toFixed(1)}%
                </span>
              </li>
            </ul>
            <p className="mt-2.5 text-xs text-gray-500">
              Right preview uses the selected strategy; totals compare against
              baseline across all sheets.
            </p>
          </Section>

          <Section title="Export & Legend">
            <div className="space-y-2.5">
              <SplitExportButton
                onBaselineCSV={onExportBaseline}
                onImprovedCSV={onExportImproved}
                onBaselineSVG={onExportBaselineSVG}
                onImprovedSVG={onExportImprovedSVG}
                onBaselineSVGAll={onExportAllBaselineSVG}
                onImprovedSVGAll={onExportAllImprovedSVG}
                baselineSheetCount={baseline.totalSheets}
                improvedSheetCount={improved.totalSheets}
                defaultPrimary="imp_svg"
                busy={exporting}
              />
              <div className="pt-2 border-t border-gray-800">
                <div className="mb-1.5 text-xs text-gray-400">Panel Colors</div>
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
