import type { SheetLayout } from "./packing";

export function sheetToSVG(opts: {
  sheet: SheetLayout;
  sheetWidthMm: number;
  sheetHeightMm: number;
  showLabels?: boolean;
  colorForBaseIndex?: (idx: number) => string;
}): string {
  const {
    sheet,
    sheetWidthMm,
    sheetHeightMm,
    showLabels = true,
    colorForBaseIndex,
  } = opts;

  const parts: string[] = [];
  
  parts.push(
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidthMm}mm" height="${sheetHeightMm}mm" viewBox="0 0 ${sheetWidthMm} ${sheetHeightMm}">`,
    `<defs>`,
    `<style>
      .label { font: 12px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,'Helvetica Neue',Arial,'Noto Sans',sans-serif; fill: #e5e7eb; }
      .outline { fill: none; stroke: #3f3f46; stroke-width: 0.6; } /* hairline-ish in mm */
      .rect-stroke { fill: none; stroke: #0ea5e9; stroke-width: 0.4; }
    </style>`,
    `</defs>`
  );

  parts.push(
    `<rect x="0" y="0" width="${sheetWidthMm}" height="${sheetHeightMm}" fill="#0a0a0a" />`,
    `<rect x="0.3" y="0.3" width="${sheetWidthMm - 0.6}" height="${sheetHeightMm - 0.6}" class="outline" />`
  );

  sheet.rects.forEach((r) => {
    const fill = colorForBaseIndex ? colorForBaseIndex(r.baseIndex) : "#0891b2";
    parts.push(
      `<g>`,

      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${fill}" />`,

      `<rect x="${r.x + 0.2}" y="${r.y + 0.2}" width="${Math.max(0, r.w - 0.4)}" height="${Math.max(0, r.h - 0.4)}" class="rect-stroke" />`,

      showLabels
        ? `<text class="label" x="${r.x + 6}" y="${r.y + 14}">${escapeXml(
            r.label
          )}</text>`
        : ``,
      `</g>`
    );
  });

  parts.push(`</svg>`);
  return parts.join("\n");
}

export function downloadSVG(filename: string, svg: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
