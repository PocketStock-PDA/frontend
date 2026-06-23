import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, string> = {
  sm: "text-xs gap-0.5 [&_svg]:size-3",
  md: "text-sm gap-0.5 [&_svg]:size-3.5",
  lg: "text-base gap-1 [&_svg]:size-4",
};

export interface ChangeIndicatorProps {
  /** 변동 값 (양수=상승, 음수=하락) */
  value: number;
  /** % 표기 여부 (true면 값 뒤에 % 부착) */
  percent?: boolean;
  /** 값 뒤 단위 (예: "원"). percent와 동시 사용 안 함 */
  suffix?: string;
  /** ▲▼ 화살표 표시 (기본 true) */
  showArrow?: boolean;
  /** 부호(+) 표시 (기본 true) */
  showSign?: boolean;
  size?: Size;
  className?: string;
}

/**
 * 등락 표시. 한국식 컬러(상승=red, 하락=blue).
 * 종목 가격·수익률·자산 변동 등 전 화면 공용.
 */
export function ChangeIndicator({
  value,
  percent = false,
  suffix = "",
  showArrow = true,
  showSign = true,
  size = "md",
  className,
}: ChangeIndicatorProps) {
  const isUp = value > 0;
  const isDown = value < 0;
  const abs = Math.abs(value);

  const formatted = abs.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  });

  const sign = showSign ? (isUp ? "+" : isDown ? "-" : "") : "";
  const unit = percent ? "%" : suffix;

  return (
    <span
      className={cn(
        "inline-flex items-center font-numeric font-semibold tabular-nums",
        sizeMap[size],
        isUp && "text-up",
        isDown && "text-down",
        !isUp && !isDown && "text-muted-foreground",
        className,
      )}
    >
      {showArrow && isUp && <ArrowUp aria-hidden />}
      {showArrow && isDown && <ArrowDown aria-hidden />}
      <span>
        {sign}
        {formatted}
        {unit}
      </span>
    </span>
  );
}
