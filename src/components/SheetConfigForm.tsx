import InputNumber from "./InputNumber";
import type { SheetConfig } from "../types";

type Props = {
  value: SheetConfig;
  onChange: (next: SheetConfig) => void;
};

export default function SheetConfigForm({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <InputNumber
        label="Sheet Width"
        value={value.width}
        onChange={(v) => onChange({ ...value, width: v })}
        min={1}
        step={1}
        suffix="mm"
        placeholder="e.g., 2440"
        required
      />
      <InputNumber
        label="Sheet Height"
        value={value.height}
        onChange={(v) => onChange({ ...value, height: v })}
        min={1}
        step={1}
        suffix="mm"
        placeholder="e.g., 1220"
        required
      />
    </div>
  );
}
