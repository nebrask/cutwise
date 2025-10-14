import type { PackResult } from "./packing";

function esc(v: string | number | boolean): string {
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export function packResultToCSV(result: PackResult): string {
  const header = [
    "sheet_index",
    "material",
    "base_id",
    "base_number",
    "copy_number",
    "label",
    "x_mm", "y_mm", "w_mm", "h_mm",
    "rotated"
  ].join(",");

  const rows: string[] = [header];

  result.sheets.forEach((sheet, sIdx) => {
    sheet.rects.forEach(r => {
      const baseNum = r.baseIndex + 1;
      const copyNum = r.copyIndex + 1;
      
      rows.push([
        sIdx,
        esc(sheet.material || "unknown"),
        esc(`p${baseNum}`),
        baseNum,
        copyNum,
        esc(`'${r.label}`),
        r.x, r.y, r.w, r.h,
        r.rotated ? "true" : "false",
      ].join(","));
    });
  });

  return rows.join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}