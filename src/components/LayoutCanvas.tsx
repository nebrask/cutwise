import React, { useEffect, useMemo, useRef } from "react";
import type { SheetLayout } from "../utils/packing";
import { useElementSize } from "../hooks/useElementSize";

type Props = {
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
  sheet: SheetLayout;
  maxViewportHeightRatio?: number;
  colorForBaseIndex?: (idx: number) => string;
};

export default function LayoutCanvas({
  sheetWidth,
  sheetHeight,
  kerf,
  sheet,
  maxViewportHeightRatio = 0.9,
  colorForBaseIndex,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: boxRef, size: boxSize } = useElementSize<HTMLDivElement>();

  const { pxW, pxH, scale } = useMemo(() => {
    const availableW = Math.max(0, boxSize.width);
    const maxH = Math.floor(window.innerHeight * maxViewportHeightRatio);
    const availableH = Math.max(360, maxH);

    if (availableW <= 0) return { pxW: 0, pxH: 0, scale: 1 };

    const marginFactor = 0.93;
    const s = Math.min(
      (availableW * marginFactor) / sheetWidth,
      (availableH * marginFactor) / sheetHeight
    );

    return {
      pxW: Math.max(1, Math.floor(sheetWidth * s)),
      pxH: Math.max(1, Math.floor(sheetHeight * s)),
      scale: s,
    };
  }, [boxSize.width, sheetWidth, sheetHeight, maxViewportHeightRatio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pxW === 0 || pxH === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(pxW * dpr);
    canvas.height = Math.floor(pxH * dpr);
    canvas.style.width = `${pxW}px`;
    canvas.style.height = `${pxH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, pxW, pxH);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, pxW, pxH);


    const sx = 0.5;
    const sy = 0.5;
    const sw = pxW - 1;
    const sh = pxH - 1;

    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    ctx.clip();

    sheet.rects.forEach((r) => {
      const x = sx + r.x * scale;
      const y = sy + r.y * scale;
      const w = r.w * scale;
      const h = r.h * scale;

      const fill = colorForBaseIndex ? colorForBaseIndex(r.baseIndex) : "#0891b2";
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));

      ctx.fillStyle = "#e5e7eb";
      ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.fillText(r.label, x + 6, y + 16);
    });

    ctx.restore();
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, sw, sh);
  }, [pxW, pxH, scale, sheet, colorForBaseIndex]);

  return (
    <div ref={boxRef} className="w-full" style={{ overflow: "hidden" }}>
      <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
        <canvas
          ref={canvasRef}
          style={{ display: "block", marginLeft: "auto", marginRight: "auto" }}
        />
        <div className="mt-2 text-center text-xs text-gray-400">
          Preview scaled to fit • Sheet {sheet.index + 1}
        </div>
      </div>
    </div>
  );
}
