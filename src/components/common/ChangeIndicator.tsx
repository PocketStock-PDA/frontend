import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export interface ChangeIndicatorProps {
  /** 변동 값 (양수=상승, 음수=하락) */
  value: number;
  /** % 표기 여부 (true면 값 뒤에 % 부착) */
  percent?: boolean;
  /** 값 뒤 단위 (예: "원"). percent와 동시 사용 안 함 */
  suffix?: string;
  /** 값 앞 단위 (예: "$"). 부호 다음·숫자 앞에 붙음 */
  prefix?: string;
  /** 함께 표시할 수익률(%) — 지정 시 "값(X.XX%)"로 괄호 병기 (같은 색·한 줄) */
  subPercent?: number;
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
  prefix = "",
  subPercent,
  showSign = true,
  size = "md",
  className,
}: ChangeIndicatorProps) {
  const isUp = value > 0;
  const isDown = value < 0;
  const abs = Math.abs(value);

  // 퍼센트는 소수점 2자리 고정(10.60%), 금액은 정수/센트(.00 강제 안 함)
  const formatted = abs.toLocaleString(
    "ko-KR",
    percent
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { maximumFractionDigits: 2 },
  );

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
      <span>
        {sign}
        {prefix}
        {formatted}
        {unit}
        {subPercent !== undefined &&
          ` (${Math.abs(subPercent).toLocaleString("ko-KR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}%)`}
      </span>
    </span>
  );
}
