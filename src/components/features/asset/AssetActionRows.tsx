import { ChevronRight, TrendingUp, CreditCard } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AssetActionRowsProps {
  daysUntilMaturity?: number | undefined;
}

export function AssetActionRows({ daysUntilMaturity }: AssetActionRowsProps) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <ActionRow
        href="/recommendations/maturity"
        icon={<TrendingUp className="size-5" />}
        title="만기 자금 굴리기"
        description="예금·적금 만기 자금을 배당주로"
        badge={
          daysUntilMaturity !== undefined ? (
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold",
                daysUntilMaturity <= 7
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              )}
            >
              D-{daysUntilMaturity}
            </span>
          ) : null
        }
      />
      <ActionRow
        href="/recommendations/cards"
        icon={<CreditCard className="size-5" />}
        title="맞춤 카드 추천"
        description="소비 패턴에 맞는 카드"
        divider
      />
    </div>
  );
}

interface ActionRowProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: React.ReactNode;
  divider?: boolean;
}

function ActionRow({ href, icon, title, description, badge, divider }: ActionRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 active:bg-muted",
        divider && "border-t border-border"
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-surface text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {badge}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
    </Link>
  );
}
