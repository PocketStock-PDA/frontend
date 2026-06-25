"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const ITEM_H = 44; // 한 항목 높이(px)
const VISIBLE = 5; // 보이는 항목 수(홀수 → 가운데 선택)

export interface WheelPickerOption<T extends string | number> {
  label: string;
  value: T;
}

export interface WheelPickerProps<T extends string | number> {
  options: WheelPickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * iOS식 휠 피커 — 세로 스크롤 스냅 + 가운데 선택 밴드.
 * 스크롤이 멎으면 가운데 항목으로 onChange. 모을 요일/날짜 선택 등에 사용.
 */
export function WheelPicker<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: WheelPickerProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const lastIdx = useRef(-1);
  const raf = useRef<number | null>(null);
  const pad = (ITEM_H * (VISIBLE - 1)) / 2;

  // 최초 마운트 시 현재 값 위치로 스크롤(스냅 시작점)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = Math.max(
      0,
      options.findIndex((o) => o.value === value),
    );
    el.scrollTop = idx * ITEM_H;
    lastIdx.current = idx;
    // 마운트 1회만 — 이후 스크롤은 사용자 주도
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const idx = Math.min(
        options.length - 1,
        Math.max(0, Math.round(el.scrollTop / ITEM_H)),
      );
      const opt = options[idx];
      if (opt && idx !== lastIdx.current) {
        lastIdx.current = idx;
        onChange(opt.value);
      }
    });
  };

  return (
    <div
      className={cn("relative", className)}
      style={{ height: ITEM_H * VISIBLE }}
    >
      {/* 가운데 선택 밴드 */}
      <div
        className="pointer-events-none absolute inset-x-2 rounded-xl bg-muted"
        style={{ top: pad, height: ITEM_H }}
      />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="scrollbar-none h-full overflow-y-auto"
        style={{
          scrollSnapType: "y mandatory",
          paddingTop: pad,
          paddingBottom: pad,
          maskImage:
            "linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)",
        }}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <div
              key={String(o.value)}
              className={cn(
                "relative flex items-center justify-center font-numeric transition-colors",
                active
                  ? "text-lg font-bold text-foreground"
                  : "text-base text-muted-foreground",
              )}
              style={{ height: ITEM_H, scrollSnapAlign: "center" }}
            >
              {o.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
