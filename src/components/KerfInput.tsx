import InputNumber from "./InputNumber";

type Props = {
  value: number;
  onChange: (v: number) => void;
};

export default function KerfInput({ value, onChange }: Props) {
  return (
    <InputNumber
      label="Kerf (Cut Width)"
      value={value}
      onChange={onChange}
      min={0}
      step={0.1}
      suffix="mm"
      placeholder="e.g., 3.2"
      required
    />
  );
}
