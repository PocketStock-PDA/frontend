"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useMaturityAccounts } from "@/hooks/queries/useMaturityAccounts";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { MaturityTriggerAccount } from "@/types/domain/asset";

// "YYYY-MM-DD" → "M월 D일"
function formatMaturity(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${parseInt(m ?? "0", 10)}월 ${parseInt(d ?? "0", 10)}일`;
}

// D-day 강조 색 — 임박할수록 빨강(긴급), 한 달 이내 amber, 그 외 중립.
// (등락 색 토큰 up/down과 겹치지 않게 알림용 red-600 사용 — AssetActionRows의 D-day와 동일 어휘)
function ddayTone(days: number): string {
  if (days <= 7) return "text-red-600";
  if (days <= 30) return "text-amber-600";
  return "text-muted-foreground";
}

export default function MaturitySelectPage() {
  const router = useRouter();
  const { data: accounts = [], isLoading, isError } = useMaturityAccounts();

  if (isLoading) {
    return (
      <>
        <AppHeader variant="sub" title="만기 자금 굴리기" />
        <div className="space-y-4">
          <SkeletonCard lines={2} className="h-16" />
          <SkeletonCard lines={3} className="h-40" />
        </div>
      </>
    );
  }

  if (isError || accounts.length === 0) {
    return (
      <>
        <AppHeader variant="sub" title="만기 자금 굴리기" />
        <EmptyState
          title="만기 예정 예금·적금이 없어요"
          description="만기일이 있는 예금·적금을 연동하면 여기서 골라 굴릴 수 있어요."
        />
      </>
    );
  }

  return (
    <>
      <AppHeader variant="sub" title="만기 자금 굴리기" />

      <div className="space-y-5">
        <header className="px-0.5">
          <h1 className="text-xl font-bold leading-snug text-foreground">
            어떤 예금·적금을 굴릴까요?
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            만기가 가까운 순서예요. 하나를 고르면 그 자금에 맞는 배당주를 추천해드려요.
          </p>
        </header>

        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {accounts.map((acc) => (
            <li key={acc.accountId}>
              <AccountRow
                account={acc}
                onSelect={() =>
                  router.push(`/recommendations/maturity?accountId=${acc.accountId}`)
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function AccountRow({
  account,
  onSelect,
}: {
  account: MaturityTriggerAccount;
  onSelect: () => void;
}) {
  const { accountName, principalAmount, interestRate, maturityDate, daysUntilMaturity } =
    account;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-foreground">{accountName}</p>
        <p className="mt-0.5 font-numeric text-xs tabular-nums text-muted-foreground">
          원금 {formatKRW(principalAmount)} · 연 {interestRate}%
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className={cn("font-numeric text-base font-bold tabular-nums", ddayTone(daysUntilMaturity))}>
          {daysUntilMaturity === 0 ? "D-day" : `D-${daysUntilMaturity}`}
        </p>
        <p className="mt-0.5 font-numeric text-[11px] tabular-nums text-muted-foreground">
          {formatMaturity(maturityDate)} 만기
        </p>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
    </button>
  );
}
