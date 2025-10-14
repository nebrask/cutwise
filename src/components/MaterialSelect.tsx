import React from "react";
import { Info } from "lucide-react";

export type Material = "plywood" | "mdf" | "wood-h" | "wood-v" | "acrylic";

export const MATERIAL_LABELS: Record<Material, string> = {
  plywood: "Plywood (free)",
  mdf: "MDF (free)",
  "wood-h": "Solid Wood (grain →)",
  "wood-v": "Solid Wood (grain ↑)",
  acrylic: "Acrylic (free)",
};

const MATERIAL_OPTIONS: Material[] = ["plywood", "mdf", "wood-h", "wood-v", "acrylic"];

type Props = {
  value: Material;
  onChange: (m: Material) => void;
  id?: string;
  compactLabel?: boolean;
};

export default function MaterialSelect({ value, onChange, id, compactLabel }: Props) {
  return (
    <div>
      {!compactLabel && (
        <div className="flex items-center gap-1.5 mb-1">
          <label htmlFor={id} className="text-sm text-gray-300">Material</label>
          <span
            className="inline-flex items-center text-gray-400"
            title={`Grain control:
                - Plywood/MDF/Acrylic: free rotation
                - Solid Wood → : long side fixed horizontal
                - Solid Wood ↑ : long side fixed vertical`}
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        </div>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as Material)}
        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-gray-100 outline-none focus:ring-2 focus:ring-cyan-500"
      >
        {MATERIAL_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {MATERIAL_LABELS[m]}
          </option>
        ))}
      </select>
    </div>
  );
}
