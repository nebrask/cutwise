import React from "react";

type Props = {
  count: number;
  colorForBaseIndex: (idx: number) => string;
};

export default function ColorLegend({ count, colorForBaseIndex }: Props) {
  if (count <= 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ background: colorForBaseIndex(i) }}
          />
          <span>Panel {i + 1}</span>
        </div>
      ))}
    </div>
  );
}
