import React, { useEffect, useMemo, useRef, useState } from "react";
import type { SheetLayout, PlacedRect } from "../utils/packing";
import { useElementSize } from "../hooks/useElementSize";

type Props = {
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
  sheet: SheetLayout;
  maxViewportHeightRatio?: number;
  colorForBaseIndex?: (idx: number) => string;
  panels?: Array<{ id: string; label?: string; material?: string }>;
};

type HoverInfo = {
  rect: PlacedRect;
  panelLabel?: string;
  material?: string;
  mouseX: number;
  mouseY: number;
};

export default function LayoutCanvas({
  sheetWidth,
  sheetHeight,
  kerf,
  sheet,
  maxViewportHeightRatio = 0.9,
  colorForBaseIndex,
  panels = [],
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { ref: boxRef, size: boxSize } = useElementSize<HTMLDivElement>();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

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

  const findRectPosition = (mouseX: number, mouseY: number): PlacedRect | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = mouseX - rect.left;
    const y = mouseY - rect.top;

    const sx = 0.5;
    const sy = 0.5;

    for (const r of sheet.rects) {
      const rectX = sx + r.x * scale;
      const rectY = sy + r.y * scale;
      const rectW = r.w * scale;
      const rectH = r.h * scale;

      if (x >= rectX && x <= rectX + rectW && y >= rectY && y <= rectY + rectH) {
        return r;
      }
    }

    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const hoveredRect = findRectPosition(e.clientX, e.clientY);
    
    if (hoveredRect) {
      const panel = panels.find(p => p.id === hoveredRect.baseId);
      const container = containerRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        setHoverInfo({
          rect: hoveredRect,
          panelLabel: panel?.label,
          material: panel?.material,
          mouseX: e.clientX - containerRect.left,
          mouseY: e.clientY - containerRect.top,
        });
      }
    } else {
      setHoverInfo(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

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

      const isHovered = hoverInfo?.rect.id === r.id;
      const fill = colorForBaseIndex ? colorForBaseIndex(r.baseIndex) : "#0891b2";
      
      ctx.fillStyle = isHovered ? fill : fill;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = isHovered ? "#fff" : "#0ea5e9";
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));

      ctx.fillStyle = "#e5e7eb";
      ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.fillText(r.label, x + 6, y + 16);
    });

    ctx.restore();
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, sw, sh);
  }, [pxW, pxH, scale, sheet, colorForBaseIndex, hoverInfo]);

  return (
    <div ref={boxRef} className="w-full" style={{ overflow: "hidden" }}>
      <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
        <div 
          ref={containerRef}
          className="relative"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: hoverInfo ? 'pointer' : 'default' }}
        >
          <canvas
            ref={canvasRef}
            style={{ display: "block", marginLeft: "auto", marginRight: "auto" }}
          />
          
          {hoverInfo && (
            <div
              className="absolute z-10 pointer-events-none"
              style={{
                left: `${hoverInfo.mouseX}px`,
                top: `${hoverInfo.mouseY}px`,
                transform: `translate(${
                  hoverInfo.mouseX > boxSize.width - 200 ? '-100%' : '12px'
                }, ${
                  hoverInfo.mouseY > boxSize.height - 150 ? '-100%' : '12px'
                })`,
              }}
            >
              <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 shadow-xl text-xs space-y-1 min-w-[160px]">
                <div className="font-medium text-gray-100">
                  {hoverInfo.panelLabel || `Panel ${hoverInfo.rect.baseIndex + 1}`}
                </div>
                <div className="text-gray-400">
                  Copy: {hoverInfo.rect.copyIndex + 1}
                </div>
                <div className="text-gray-400">
                  Size: {hoverInfo.rect.w} × {hoverInfo.rect.h} mm
                </div>
                {hoverInfo.rect.rotated && (
                  <div className="text-cyan-400">
                    Rotated 90°
                  </div>
                )}
                <div className="text-gray-400">
                  Material: {hoverInfo.material || sheet.material || "unknown"}
                </div>
                <div className="text-gray-400">
                  Position: ({Math.round(hoverInfo.rect.x)}, {Math.round(hoverInfo.rect.y)})
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-2 text-center text-xs text-gray-400">
          Preview scaled to fit
          {sheet.material && ` • ${sheet.material}`}
        </div>
      </div>
    </div>
  );
}