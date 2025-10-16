import type { Panel } from "../types";
import { nanoid } from "nanoid";
import MaterialSelect, { MATERIAL_LABELS } from "./MaterialSelect";
import type { Material } from "./MaterialSelect";
import { HelpCircle } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

type Props = {
  items: Panel[];
  onChange: (next: Panel[]) => void;
};

export default function PanelListForm({ items, onChange }: Props) {
  const update = (id: string, patch: Partial<Panel>) => {
    onChange(items.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const add = () => {
    onChange([
      ...items,
      {
        id: nanoid(8),
        width: 600,
        height: 300,
        qty: 1,
        material: "plywood",
        label: "",
      },
    ]);
  };

  const remove = (id: string) => {
    onChange(items.filter(p => p.id !== id));
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="space-y-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={add}
            className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          >
            Add Panel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="px-2">Label</th>
                <th className="px-2">Width (mm)</th>
                <th className="px-2">Height (mm)</th>
                <th className="px-2">Qty</th>
                <th className="px-2">
                  <div className="inline-flex items-center gap-1">
                    <span>Material</span>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="bottom"
                          align="start"
                          className="z-[9999] w-72 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300 shadow-xl"
                          sideOffset={4}
                        >
                          <div className="space-y-2">
                            <p className="font-medium text-gray-100">Material Types:</p>
                            <ul className="space-y-1 text-gray-400">
                              <li><span className="text-gray-300">Plywood, MDF, Acrylic:</span> Can be rotated freely</li>
                              <li><span className="text-gray-300">Wood (H-grain):</span> Grain runs horizontally (along width)</li>
                              <li><span className="text-gray-300">Wood (V-grain):</span> Grain runs vertically (along height)</li>
                            </ul>
                            <p className="text-gray-500 text-[10px] mt-2">
                              Grain control ensures solid wood panels maintain proper grain direction for strength and appearance.
                            </p>
                          </div>
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </div>
                </th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-3 text-gray-400">
                    No panels yet. Click "Add Panel".
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="rounded-xl bg-gray-900">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-36 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-gray-100 focus:ring-2 focus:ring-cyan-500"
                        value={p.label || ""}
                        placeholder="Optional"
                        onChange={(e) => update(p.id, { label: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className="w-24 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-gray-100 focus:ring-2 focus:ring-cyan-500"
                        value={p.width}
                        min={1}
                        step={1}
                        onChange={(e) => update(p.id, { width: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className="w-24 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-gray-100 focus:ring-2 focus:ring-cyan-500"
                        value={p.height}
                        min={1}
                        step={1}
                        onChange={(e) => update(p.id, { height: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className="w-20 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-gray-100 focus:ring-2 focus:ring-cyan-500"
                        value={p.qty}
                        min={1}
                        step={1}
                        onChange={(e) => update(p.id, { qty: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="min-w-[210px]">
                        <MaterialSelect
                          compactLabel
                          value={(p.material as Material) ?? "plywood"}
                          onChange={(m) => update(p.id, { material: m })}
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        className="rounded-lg bg-gray-800 px-3 py-1 text-sm text-red-300 hover:bg-gray-700"
                        title={`Remove (${MATERIAL_LABELS[(p.material as Material) ?? "plywood"]})`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Tooltip.Provider>
  );
}