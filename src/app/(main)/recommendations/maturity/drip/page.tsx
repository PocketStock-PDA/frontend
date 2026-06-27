"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Calendar, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { SectionHeader } from "@/components/common/SectionHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Switch } from "@/components/ui/switch";
import { useDividendReinvest } from "@/hooks/queries/useDividendReinvest";
import { useDividendHistory } from "@/hooks/queries/useDividendHistory";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useSetDividendReinvest } from "@/hooks/mutations/useSetDividendReinvest";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { DividendPayout, DividendPayoutStatus } from "@/types/domain/trading";

/**
 * 배당 재투자(DRIP) — 만기 매수 예약 직후 도착하는 화면.
 * 받은 배당으로 같은 주식을 더 사 복리를 굴리는 설정·현황을 한 화면에 모은다.
 *
 * 데이터: ledger-api /api/trading/dividend-reinvest (설정·내역). 복리 요약은
 * 전용 API가 없어 지급 내역(history)에서 파생한다(받은 배당 Σgross, 재투자됨 Σreinvest).
 */

function formatShares(n: number): string {
  return Number(n).toLocaleString("ko-KR", { maximumFractionDigits: 4 });
}

function formatMD(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${parseInt(m ?? "0", 10)}/${parseInt(d ?? "0", 10)}`;
}

const STATUS_CHIP: Record<DividendPayoutStatus, { label: string; cls: string }> = {
  REINVESTED: { label: "재투자", cls: "bg-brand-surface text-primary" },
  PAID: { label: "CMA 입금", cls: "bg-muted text-muted-foreground" },
  REINVEST_FAILED: { label: "재투자 실패", cls: "bg-destructive/10 text-destructive" },
};

function Logo({ children, sm }: { children: React.ReactNode; sm?: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-[#e2ecfb] bg-brand-surface font-numeric font-bold text-primary",
        sm ? "size-8 text-xs" : "size-9 text-sm",
      )}
    >
      {children}
    </div>
  );
}

export default function MaturityDripPage() {
  const router = useRouter();
  const { data: settings, isLoading, isError } = useDividendReinvest();
  const { data: history = [], isLoading: historyLoading } = useDividendHistory();
  const { data: holdings = [] } = useHoldings();
  const setReinvest = useSetDividendReinvest();
  // 토글이 처리 중인 종목 — 같은 종목 연속 토글로 응답 순서가 엇갈리는 것을 막는다.
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const qtyByCode = useMemo(
    () => new Map(holdings.map((h) => [h.stockCode, h.quantity])),
    [holdings],
  );

  const { received, reinvested, reinvestCount } = useMemo(() => {
    const recv = history.reduce((sum, p) => sum + p.grossAmount, 0);
    const done = history.filter((p) => p.status === "REINVESTED");
    return {
      received: recv,
      reinvested: done.reduce((sum, p) => sum + (p.reinvestAmount ?? 0), 0),
      reinvestCount: done.length,
    };
  }, [history]);

  const list = settings ?? [];
  const onCount = list.filter((s) => s.enabled).length;
  const hasHistory = received > 0;

  const handleToggle = (stockCode: string, enabled: boolean) => {
    setPendingCode(stockCode);
    setReinvest.mutate(
      { stockCode, enabled },
      {
        onError: () =>
          toast.error("설정을 변경하지 못했어요. 잠시 후 다시 시도해 주세요."),
        onSettled: () => setPendingCode(null),
      },
    );
  };

  // 복리 요약은 history 파생값이라, 내역 로딩 중에는 "받은 배당 없음"을 띄우지 않는다.
  if (isLoading || historyLoading) {
    return (
      <>
        <AppHeader variant="sub" title="배당 재투자" />
        <div className="space-y-4">
          <SkeletonCard lines={3} className="h-32" />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <AppHeader variant="sub" title="배당 재투자" />
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
        />
      </>
    );
  }

  return (
    <>
      <AppHeader variant="sub" title="배당 재투자" />

      <div className="space-y-6 pb-6">
        {/* ── 복리 요약 (지급 내역 파생) ──────────────────────────────────── */}
        {hasHistory ? (
          <section className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">지금까지 받은 배당</p>
            <p className="font-numeric mt-1 text-[26px] font-bold leading-tight tabular-nums text-foreground">
              {formatKRW(received)}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              받은 배당으로 같은 주식을 더 사서,{" "}
              <b className="font-bold text-foreground">배당이 또 배당을 낳고</b> 있어요.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <FlowStep label="받은 배당" value={formatKRW(received)} />
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/40" />
              <FlowStep label="재투자됨" value={formatKRW(reinvested)} />
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/40" />
              <FlowStep label="재투자 횟수" value={`${reinvestCount}회`} />
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold text-foreground">
              받은 배당을 자동으로 재투자해요
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              배당주를 켜두면, 지급된 배당으로 같은 주식을 더 사 복리를 굴려드려요.
              아직 받은 배당이 없어요.
            </p>
          </section>
        )}

        {/* ── 내 배당주 토글 ────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="내 배당주"
            action={
              list.length > 0 ? (
                <span className="font-numeric text-xs tabular-nums text-muted-foreground">
                  {list.length}종목 · {onCount}개 켜짐
                </span>
              ) : null
            }
          />
          {list.length === 0 ? (
            <EmptyState
              title="배당 재투자할 종목이 없어요"
              description="국내 배당주를 보유하면 여기서 재투자를 켤 수 있어요."
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <ul className="divide-y divide-border">
                  {list.map((s) => {
                    const qty = qtyByCode.get(s.stockCode);
                    return (
                      <li
                        key={s.stockCode}
                        className="flex items-center gap-3 px-4 py-3.5"
                      >
                        <Logo>{s.stockName.slice(0, 1)}</Logo>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground">
                            {s.stockName}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                            {s.enabled ? (
                              qty !== undefined ? (
                                <>
                                  보유{" "}
                                  <span className="font-numeric tabular-nums">
                                    {formatShares(qty)}주
                                  </span>{" "}
                                  · 배당 재투자 중
                                </>
                              ) : (
                                "배당 재투자 중"
                              )
                            ) : (
                              "꺼짐 · 배당을 현금으로 받아요"
                            )}
                          </p>
                        </div>
                        <Switch
                          checked={s.enabled}
                          disabled={pendingCode === s.stockCode}
                          onCheckedChange={(v) => handleToggle(s.stockCode, v)}
                          aria-label={`${s.stockName} 배당 재투자 ${s.enabled ? "끄기" : "켜기"}`}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
              <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-muted-foreground">
                소액 배당(1,000원 미만)은 CMA 잔돈으로 채워 1,000원어치 사드려요.
              </p>
            </>
          )}
        </section>

        {/* ── 배당 내역 ─────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <section>
            <SectionHeader title="배당 내역" />
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <ul className="divide-y divide-border">
                {history.map((h) => (
                  <HistoryRow key={h.id} payout={h} />
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── 캘린더 위임 ───────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => router.push("/budget")}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Calendar className="size-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-foreground">
              배당 일정 캘린더 보기
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              다가오는 배당·실적일 전체 보기
            </p>
          </div>
          <ChevronRight className="ml-auto size-5 shrink-0 text-muted-foreground/50" />
        </button>
      </div>
    </>
  );
}

function FlowStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl bg-brand-surface px-1.5 py-2.5 text-center">
      <p className="text-[10px] font-medium text-[#41556f]">{label}</p>
      <p className="font-numeric mt-0.5 text-[12.5px] font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function HistoryRow({ payout }: { payout: DividendPayout }) {
  const chip = STATUS_CHIP[payout.status];
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <Logo sm>{payout.stockName.slice(0, 1)}</Logo>
      <div className="min-w-0">
        <p className="text-[13.5px] font-bold text-foreground">
          {payout.stockName}
        </p>
        <p className="font-numeric mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {formatMD(payout.payDate)} · {formatShares(payout.holdingQty)}주 배당
        </p>
      </div>
      <div className="ml-auto text-right">
        <p className="font-numeric text-[13.5px] font-bold tabular-nums text-foreground">
          {formatKRW(payout.grossAmount)}
        </p>
        <span
          className={cn(
            "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
            chip.cls,
          )}
        >
          {chip.label}
        </span>
      </div>
    </li>
  );
}
