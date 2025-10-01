import React from "react";

type Props = {
  label: string;
  value: number | string;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
};

export default function InputNumber({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  suffix,
  placeholder,
  className,
  id,
  required,
}: Props) {
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    const parsed = Number(next);
    if (!Number.isNaN(parsed)) onChange(parsed);
    else if (next === "") onChange(NaN);
  };

  const inputId = id ?? label.replace(/\s+/g, "-").toLowerCase();

  return (
    <label htmlFor={inputId} className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-sm font-medium text-gray-200">{label}</span>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="number"
          value={String(value)}
          onChange={handle}
          min={min} 
          step={step}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100 outline-none focus:ring-2 focus:ring-cyan-500"
        />
        {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
      </div>
    </label>
  );
}
