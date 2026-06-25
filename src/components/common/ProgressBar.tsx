import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  /** 막대 색 (카테고리별). 기본 브랜드 */
  color?: string;
  /** 스크린리더용 라벨 (무엇의 진행인지) */
  "aria-label"?: string;
  className?: string;
  trackClassName?: string;
}

/** 선형 진행 막대 (비중/예산 사용률 등) */
export function ProgressBar({
  value,
  color,
  "aria-label": ariaLabel,
  className,
  trackClassName,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        trackClassName,
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", !color && "bg-primary")}
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
