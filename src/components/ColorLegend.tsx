import type { Panel } from "../types";

type Props = {
  panels: Panel[];
  colorForBaseIndex: (idx: number) => string;
};

export default function ColorLegend({ panels, colorForBaseIndex }: Props) {
  if (panels.length <= 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-1">
      {panels.map((panel, i) => (
        <div key={panel.id} className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ background: colorForBaseIndex(i) }}
          />
          <span>{panel.label?.trim() || `Panel ${i + 1}`}</span>
        </div>
      ))}
    </div>
  );
}