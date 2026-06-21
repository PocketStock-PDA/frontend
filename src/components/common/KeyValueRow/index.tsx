import { cn } from "@/lib/utils";

export interface KeyValueRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** 값 강조(색상 등) 커스텀 */
  valueClassName?: string;
  className?: string;
}

/**
 * 라벨(좌)–값(우) 한 줄. 예수금/평가금액/잔액 등.
 */
export function KeyValueRow({
  label,
  value,
  valueClassName,
  className,
}: KeyValueRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 py-1.5 text-sm",
        className,
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-foreground", valueClassName)}>
        {value}
      </span>
    </div>
  );
}
