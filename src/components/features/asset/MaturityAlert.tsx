import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKRW } from "@/lib/utils/currency";
import type { MaturityTriggerAccount } from "@/types/domain/asset";

// 만기까지 이 일수 이하면 "만기 임박" 알림을 노출(리밸런싱 탭 맨 위).
const IMMINENT_DAYS = 30;

/**
 * 만기 임박(≤ 1개월) 예적금 알림 — 리밸런싱 탭 최상단(순자산보다 위)에 노출.
 * 서비스 메인 톤(흰 배경 + primary 테두리/포인트)으로, 만기가 아주 가까울 때만(≤7일) D-day를 강조한다.
 * 만기가 한 달보다 더 남았으면 렌더하지 않는다.
 */
export function MaturityAlert({ account }: { account: MaturityTriggerAccount }) {
  const { accountName, principalAmount, maturityDate, daysUntilMaturity, accountId } = account;
  if (daysUntilMaturity > IMMINENT_DAYS) return null;

  const [, m, d] = maturityDate.split("-");
  const dateLabel = `${parseInt(m ?? "0")}월 ${parseInt(d ?? "0")}일`;
  const urgent = daysUntilMaturity <= 7;

  return (
    <Link
      href={`/recommendations/maturity?accountId=${accountId}`}
      className="ps-rise-in flex items-center gap-3 rounded-2xl border border-primary/30 bg-card p-3 transition-transform duration-150 active:scale-[0.99]"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-surface text-primary">
        <CalendarClock className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-primary">만기 임박</span>
          <span
            className={cn(
              "font-numeric text-[11px] font-bold",
              urgent ? "text-destructive ps-badge-urgent" : "text-muted-foreground",
            )}
          >
            D-{daysUntilMaturity}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm font-bold text-foreground">{accountName}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {formatKRW(principalAmount)} · {dateLabel} 만기 · 예금 vs 배당주 비교
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}
