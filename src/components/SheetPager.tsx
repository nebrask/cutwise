import React from "react";

type Props = {
  total: number;
  index: number;
  onChange: (idx: number) => void;
  label?: string;
};

export default function SheetPager({ total, index, onChange, label }: Props) {
  if (total <= 1) {
    return (
      <div className="text-xs text-gray-400">
        {label ? `${label}: ` : ""}Single sheet
      </div>
    );
  }

  const prev = () => onChange(Math.max(0, index - 1));
  const next = () => onChange(Math.min(total - 1, index + 1));

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-400">{label}</span>}
      <button
        type="button"
        onClick={prev}
        disabled={index === 0}
        className="rounded-lg bg-gray-800 px-2 py-1 text-xs text-gray-200 disabled:opacity-40 hover:bg-gray-700"
      >
        Prev
      </button>
      <select
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-100 outline-none focus:ring-2 focus:ring-cyan-500"
      >
        {Array.from({ length: total }).map((_, i) => (
          <option key={i} value={i}>
            Sheet {i + 1} / {total}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={next}
        disabled={index === total - 1}
        className="rounded-lg bg-gray-800 px-2 py-1 text-xs text-gray-200 disabled:opacity-40 hover:bg-gray-700"
      >
        Next
      </button>
    </div>
  );
}
