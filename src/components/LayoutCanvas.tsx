import React, { useEffect, useMemo, useRef } from "react";
import type { SheetLayout } from "../utils/packing";
import { useElementSize } from "../hooks/useElementSize";

type Props = {
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
  sheet: SheetLayout;
  maxViewportHeightRatio?: number;
};

export default function LayoutCanvas({
  sheetWidth,
  sheetHeight,
  kerf,
  sheet,
  maxViewportHeightRatio = 0.6,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { ref: boxRef, size: boxSize } = useElementSize<HTMLDivElement>();

  const { pxW, pxH, scale } = useMemo(() => {
    const availableW = Math.max(0, boxSize.width);
    const maxH = Math.floor(window.innerHeight * maxViewportHeightRatio);
    const availableH = Math.max(200, maxH);

    if (availableW <= 0) {
      return { pxW: 0, pxH: 0, scale: 1 };
    }

    const marginFactor = 0.95;
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

    canvas.width = pxW;
    canvas.height = pxH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, pxW, pxH);

    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, pxW - 2, pxH - 2);

    sheet.rects.forEach((r, idx) => {
      const x = Math.round(r.x * scale);
      const y = Math.round(r.y * scale);
      const w = Math.round(r.w * scale);
      const h = Math.round(r.h * scale);

      ctx.fillStyle = "#0891b2";
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

      ctx.fillStyle = "#e5e7eb";
      ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.fillText(r.label, x + 6, y + 16);
    });
  }, [pxW, pxH, scale, sheet]);

  return (
    <div
      ref={boxRef}
      className="w-full"
      style={{
        overflow: "hidden",
      }}
    >
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
