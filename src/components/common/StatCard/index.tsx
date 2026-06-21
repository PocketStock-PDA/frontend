import { cn } from "@/lib/utils";

type Orientation = "row" | "tile";

export interface StatCardProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  value: React.ReactNode;
  /** row: 가로(카드 사용 잔돈) / tile: 세로 타일(포인트 등) */
  orientation?: Orientation;
  onClick?: () => void;
  className?: string;
}

/** 정보 카드. 가로 행 / 세로 타일 2가지 형태 */
export function StatCard({
  icon,
  title,
  subtitle,
  value,
  orientation = "row",
  onClick,
  className,
}: StatCardProps) {
  const interactive = !!onClick;
  const Tag = interactive ? "button" : "div";

  if (orientation === "tile") {
    return (
      <Tag
        type={interactive ? "button" : undefined}
        onClick={onClick}
        className={cn(
          "flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left",
          className,
        )}
      >
        {icon && (
          <span className="mb-1 flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
        )}
        <span className="text-sm font-bold text-foreground">{title}</span>
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
        <span className="text-sm font-bold text-foreground">{value}</span>
      </Tag>
    );
  }

  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left",
        className,
      )}
    >
      {icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <span className="shrink-0 text-base font-bold text-foreground">
        {value}
      </span>
    </Tag>
  );
}
