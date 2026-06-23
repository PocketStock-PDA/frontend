import { AmountDisplay } from "@/components/common/AmountDisplay";
import { cn } from "@/lib/utils";

export interface TransactionItemProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** 부호 포함 금액 (+입금 / -출금) */
  amount: number;
  currency?: "KRW" | "USD";
  onClick?: () => void;
  className?: string;
}

/** 거래/알림 행: 아이콘 + 제목/부제 + 금액(±) */
export function TransactionItem({
  icon,
  title,
  subtitle,
  amount,
  currency = "KRW",
  onClick,
  className,
}: TransactionItemProps) {
  const interactive = !!onClick;
  const Tag = interactive ? "button" : "div";

  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 py-3 text-left",
        className,
      )}
    >
      {icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <AmountDisplay
        value={amount}
        currency={currency}
        signed
        className={cn(
          "shrink-0 font-bold",
          amount > 0 && "text-up",
          amount < 0 && "text-down",
        )}
      />
    </Tag>
  );
}
