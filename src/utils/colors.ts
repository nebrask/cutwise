const PALETTE = [
    "#60a5fa",
    "#f472b6",
    "#34d399",
    "#f59e0b",
    "#a78bfa",
    "#fb7185",
    "#22d3ee",
    "#fbbf24",
    "#4ade80",
    "#c084fc",
];

export function colorForIndex(i: number): string {
  if (i < PALETTE.length) return PALETTE[i];
  const hue = (i * 137.508) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}