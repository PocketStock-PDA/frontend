import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { cn } from "@/lib/utils";

export interface StockListItemProps {
  name: string;
  ticker?: string;
  logoUrl?: string;
  sub?: string;
  price: number;
  /** 변동액 */
  change?: number;
  /** 변동률(%) */
  changePercent?: number;
  onClick?: () => void;
  className?: string;
}

/** 종목 행: 로고 + 이름 + 가격/등락 (change·percent 동시 표기) */
export function StockListItem({
  name,
  ticker,
  logoUrl,
  sub,
  price,
  change,
  changePercent,
  onClick,
  className,
}: StockListItemProps) {
  const interactive = !!onClick;
  const Tag = interactive ? "button" : "div";
  const initial = (ticker ?? name).trim().charAt(0).toUpperCase();
  const hasChange = change !== undefined || changePercent !== undefined;

  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 py-3 text-left",
        className,
      )}
    >
      <Avatar>
        {logoUrl && <AvatarImage src={logoUrl} alt={name} />}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">{name}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>

      <div className="shrink-0 text-right">
        <AmountDisplay value={price} size="md" className="font-bold" />
        {hasChange && (
          <div className="flex justify-end">
            {change !== undefined ? (
              <ChangeIndicator
                value={change}
                suffix="원"
                size="sm"
                {...(changePercent !== undefined
                  ? { subPercent: changePercent }
                  : {})}
              />
            ) : changePercent !== undefined ? (
              <ChangeIndicator value={changePercent} percent size="sm" />
            ) : null}
          </div>
        )}
      </div>
    </Tag>
  );
}
