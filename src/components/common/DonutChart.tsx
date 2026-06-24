import { cn } from "@/lib/utils";

export interface DonutChartProps {
  data: { label?: string; value: number; color: string }[];
  /** 지름(px), 기본 160 */
  size?: number;
  /** 링 두께(px), 기본 24 */
  thickness?: number;
  centerLabel?: React.ReactNode;
  className?: string;
  /** 선택된 슬라이스 인덱스 */
  selectedIndex?: number;
  /** 슬라이스 클릭 콜백 */
  onSegmentClick?: (index: number, e: React.MouseEvent<SVGCircleElement>) => void;
  /** 선택 시 튀어나오는 거리(px), 기본 8 */
  popDistance?: number;
  /** 추가 회전 각도(deg) — 내부 -90° 기준 회전에 더해져 세그먼트 배치를 회전시킴 */
  rotate?: number;
}

/** 의존성 없는 SVG 도넛 차트 (포트폴리오 구성/가계부 카테고리) */
export function DonutChart({
  data,
  size = 160,
  thickness = 24,
  centerLabel,
  className,
  selectedIndex,
  onSegmentClick,
  popDistance = 8,
  rotate = 0,
}: DonutChartProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // 음수/비유한 값은 0으로 정규화 (잘못된 arc 방지)
  const segments = data.map((d) => ({
    ...d,
    value: Number.isFinite(d.value) && d.value > 0 ? d.value : 0,
  }));
  const total = segments.reduce((sum, d) => sum + d.value, 0);

  const hasSelection = selectedIndex !== undefined;
  let offset = 0;

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: `rotate(${-90 + rotate}deg)`,
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        overflow="visible"
      >
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

            // SVG 공간 기준 중간 각도 (right=0, clockwise)
            // CSS -rotate-90 때문에 SVG right → visual top 으로 매핑됨
            const theta = ((offset + len / 2) / circumference) * 2 * Math.PI;
            const isSelected = selectedIndex === i;
            const tx = isSelected ? Math.cos(theta) * popDistance : 0;
            const ty = isSelected ? Math.sin(theta) * popDistance : 0;
            const sw = isSelected ? thickness + 6 : thickness;
            const opacity = hasSelection && !isSelected ? 0.3 : 1;

            const seg = (
              <g
                key={i}
                style={{
                  transform: `translate(${tx}px, ${ty}px)`,
                  transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              >
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={sw}
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-offset}
                  style={{
                    transition: "stroke-width 0.25s ease, opacity 0.25s ease",
                    opacity,
                  }}
                />
                {/* 히트 영역 — pointer-events="stroke"로 투명해도 클릭 수신 */}
                {onSegmentClick && (
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={thickness * 2.5}
                    strokeDasharray={`${len} ${circumference - len}`}
                    strokeDashoffset={-offset}
                    pointerEvents="stroke"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => onSegmentClick(i, e)}
                  />
                )}
              </g>
            );
            offset += len;
            return seg;
          })}
      </svg>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel}
        </div>
      )}
    </div>
  );
}
