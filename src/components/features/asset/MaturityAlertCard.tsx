import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatKRW } from "@/lib/utils/currency";
import type { MaturityTriggerAccount } from "@/types/domain/asset";

interface MaturityAlertCardProps {
  account: MaturityTriggerAccount;
}

export function MaturityAlertCard({ account }: MaturityAlertCardProps) {
  const { accountName, principalAmount, maturityDate, daysUntilMaturity } = account;

  const parts = maturityDate.split("-");
  const formattedDate = `${parseInt(parts[1] ?? "0")}월 ${parseInt(parts[2] ?? "0")}일`;

  const isUrgent = daysUntilMaturity <= 7;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {/* 계좌명 + D-day */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{accountName}</p>
        <span
          className={cn(
            "font-numeric shrink-0 text-sm font-bold tabular-nums",
            isUrgent ? "text-destructive ps-badge-urgent" : "text-muted-foreground",
          )}
        >
          D-{daysUntilMaturity}
        </span>
      </div>

      {/* 원금 + 만기일 */}
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-numeric text-xl font-bold tabular-nums text-foreground">
          {formatKRW(principalAmount)}
        </span>
        <span className="text-xs text-muted-foreground">{formattedDate} 만기</span>
      </div>

      {/* CTA */}
      <Link
        href={`/recommendations/maturity?accountId=${account.accountId}`}
        className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.98]"
      >
        예금 vs 배당주 비교해보기
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
