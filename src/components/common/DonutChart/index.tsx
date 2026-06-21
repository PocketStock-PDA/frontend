import { cn } from "@/lib/utils";

export interface DonutChartProps {
  data: { label?: string; value: number; color: string }[];
  /** 지름(px), 기본 160 */
  size?: number;
  /** 링 두께(px), 기본 24 */
  thickness?: number;
  centerLabel?: React.ReactNode;
  className?: string;
}

/** 의존성 없는 SVG 도넛 차트 (포트폴리오 구성/가계부 카테고리) */
export function DonutChart({
  data,
  size = 160,
  thickness = 24,
  centerLabel,
  className,
}: DonutChartProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // 음수/비유한 값은 0으로 정규화 (잘못된 arc 방지)
  const segments = data.map((d) => ({
    ...d,
    value: Number.isFinite(d.value) && d.value > 0 ? d.value : 0,
  }));
  const total = segments.reduce((sum, d) => sum + d.value, 0);

  let offset = 0;

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={thickness}
        />
        {total > 0 &&
          segments.map((d, i) => {
            const len = (d.value / total) * circumference;
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return seg;
          })}
      </svg>
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel}
        </div>
      )}
    </div>
  );
}
