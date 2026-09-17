"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const PX_PER_INCH = 96;
const MIN_MARGIN = 0;
const MIN_CONTENT = 200;

export const DEFAULT_MARGIN = 56;

interface MarginRulerProps {
  left: number;
  right: number;
  onChange: (next: { left: number; right: number }) => void;
}

export function MarginRuler({ left, right, onChange }: MarginRulerProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(816);
  const dragRef = useRef<{
    side: "left" | "right";
    startX: number;
    startLeft: number;
    startRight: number;
  } | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setWidth(el.clientWidth || 816);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clamp = useCallback(
    (l: number, r: number) => {
      const maxEach = Math.max(0, Math.floor(width / 2 - MIN_CONTENT / 2));
      let nl = Math.min(Math.max(Math.round(l), MIN_MARGIN), maxEach);
      let nr = Math.min(Math.max(Math.round(r), MIN_MARGIN), maxEach);
      if (nl + nr > width - MIN_CONTENT) {
        if (dragRef.current?.side === "left") {
          nl = Math.max(0, width - MIN_CONTENT - nr);
        } else {
          nr = Math.max(0, width - MIN_CONTENT - nl);
        }
      }
      return { left: nl, right: nr };
    },
    [width],
  );

  const beginDrag = (side: "left" | "right", clientX: number) => {
    dragRef.current = { side, startX: clientX, startLeft: left, startRight: right };
  };

  const moveDrag = (clientX: number) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = clientX - d.startX;
    if (d.side === "left") {
      onChange(clamp(d.startLeft + dx, d.startRight));
    } else {
      onChange(clamp(d.startLeft, d.startRight - dx));
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => moveDrag(e.clientX);
    const onUp = () => endDrag();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, right, width, onChange]);

  const ticks = [];
  for (let x = 0; x <= width; x += 12) {
    const isInch = x % PX_PER_INCH === 0;
    const isHalf = x % (PX_PER_INCH / 2) === 0;
    ticks.push(
      <div
        key={x}
        aria-hidden="true"
        className="absolute top-0 w-px bg-[#bdc1c6]"
        style={{
          left: x,
          height: isInch ? 14 : isHalf ? 10 : 6,
          opacity: isInch ? 1 : 0.7,
        }}
      />,
    );
    if (isInch && x > 0 && x < width) {
      ticks.push(
        <span
          key={`n-${x}`}
          aria-hidden="true"
          className="absolute top-[13px] -translate-x-1/2 text-[9px] leading-none text-[#5f6368]"
          style={{ left: x }}
        >
          {x / PX_PER_INCH}
        </span>
      );
    }
  }

  const step = (side: "left" | "right", dir: 1 | -1, big: boolean) => {
    const d = big ? 8 : 1;
    if (side === "left") onChange(clamp(left + dir * d, right));
    else onChange(clamp(left, right + dir * d));
  };

  const handleClass =
    "group absolute top-0 z-10 flex h-full w-4 -translate-x-1/2 cursor-ew-resize touch-none items-stretch justify-center outline-none focus-visible:bg-[#e8f0fe]";

  return (
    <div
      ref={trackRef}
      role="group"
      aria-label="Page margin ruler. Drag markers to change side margins."
      className="relative hidden h-7 w-full overflow-hidden rounded-t-md border border-[#dadce0] border-b-0 bg-white select-none sm:block print:hidden"
    >
      {/* margin shading */}
      <div className="absolute inset-y-0 left-0 bg-[#f1f3f4]" style={{ width: left }} aria-hidden="true" />
      <div className="absolute inset-y-0 right-0 bg-[#f1f3f4]" style={{ width: right }} aria-hidden="true" />
      {/* ticks */}
      <div className="absolute inset-0" aria-hidden="true">
        {ticks}
      </div>
      {/* content edge lines */}
      <div className="absolute inset-y-0 w-px bg-[#1a73e8]/60" style={{ left }} aria-hidden="true" />
      <div className="absolute inset-y-0 w-px bg-[#1a73e8]/60" style={{ left: width - right }} aria-hidden="true" />

      {/* left marker */}
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Left margin ${(left / PX_PER_INCH).toFixed(2)} inches`}
        aria-valuemin={0}
        aria-valuemax={Math.floor(width / 2 - MIN_CONTENT / 2)}
        aria-valuenow={Math.round(left)}
        title={`Left margin ${(left / PX_PER_INCH).toFixed(2)} in. Double-click resets.`}
        className={cn(handleClass)}
        style={{ left }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          beginDrag("left", e.clientX);
        }}
        onDoubleClick={() => onChange(clamp(DEFAULT_MARGIN, right))}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            step("left", -1, e.shiftKey);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            step("left", 1, e.shiftKey);
          } else if (e.key === "Home") {
            e.preventDefault();
            onChange(clamp(0, right));
          }
        }}
      >
        <span className="mt-0 block h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-[#1a73e8] drop-shadow-sm" aria-hidden="true" />
      </div>

      {/* right marker */}
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Right margin ${(right / PX_PER_INCH).toFixed(2)} inches`}
        aria-valuemin={0}
        aria-valuemax={Math.floor(width / 2 - MIN_CONTENT / 2)}
        aria-valuenow={Math.round(right)}
        title={`Right margin ${(right / PX_PER_INCH).toFixed(2)} in. Double-click resets.`}
        className={cn(handleClass)}
        style={{ left: width - right }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          beginDrag("right", e.clientX);
        }}
        onDoubleClick={() => onChange(clamp(left, DEFAULT_MARGIN))}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            step("right", 1, e.shiftKey);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            step("right", -1, e.shiftKey);
          } else if (e.key === "Home") {
            e.preventDefault();
            onChange(clamp(left, 0));
          }
        }}
      >
        <span className="mt-0 block h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-[#1a73e8] drop-shadow-sm" aria-hidden="true" />
      </div>
    </div>
  );
}
