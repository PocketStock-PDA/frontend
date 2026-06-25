"use client";

import { cn } from "@/lib/utils";
import type { DailyValuation } from "@/types/domain/trading";

export interface ValuationSparklineProps {
  data: DailyValuation[];
  /** px 높이 */
  height?: number;
  className?: string;
}

/**
 * 평가액 추이 스파크라인 — 라이브러리 없이 SVG. 종가 일별 평가액(evalAmount) 라인+영역.
 * 색은 한국식: 시작 대비 상승=red(up) / 하락=blue(down). 2점 미만이면 안내.
 */
export function ValuationSparkline({
  data,
  height = 64,
  className,
}: ValuationSparklineProps) {
  const points = data.filter((d) => Number.isFinite(d.evalAmount));

  if (points.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-muted/40 text-xs text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        평가 추이가 아직 충분하지 않아요
      </div>
    );
  }

  const W = 100;
  const H = 36;
  const vals = points.map((d) => d.evalAmount);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const n = points.length;
  const coords = points.map((d, i) => {
    const x = (i / (n - 1)) * W;
    const y = H - ((d.evalAmount - min) / span) * H;
    return [x, y] as const;
  });
  const line = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${W.toFixed(2)},${H} L0,${H} Z`;
  const first = points[0];
  const last = points[n - 1];
  const up = first && last ? last.evalAmount >= first.evalAmount : true;

  return (
    <div className={cn("w-full", up ? "text-up" : "text-down", className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="평가액 추이"
      >
        <path d={area} fill="currentColor" fillOpacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
