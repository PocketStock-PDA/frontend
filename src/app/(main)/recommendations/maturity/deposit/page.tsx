"use client";

import { PiggyBank } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { MaturityStepper } from "@/components/features/maturity/MaturityStepper";
import { useMaturityAccounts } from "@/hooks/queries/useMaturityAccounts";
import { useCreateDepositRollover } from "@/hooks/mutations/useCreateDepositRollover";
import { useTransferRemainderToCma } from "@/hooks/mutations/useTransferRemainderToCma";
import { ApiError } from "@/lib/api/client";
import { formatKRW } from "@/lib/utils/currency";
import { parseAccountId } from "@/lib/utils/params";

/**
 * 예금 재예치 — 만기 자금 중 배당주에 담지 않은 '남은 예금'을 만기된 예적금과 같은 상품으로 다시 맡긴다.
 * 상품 선택 없이 만기 계좌의 상품·금리·기간을 그대로 재예치(서버가 계좌에서 도출).
 */
export default function MaturityDepositPage() {
  const router = useRouter();
  const params = useSearchParams();
  const accountId = parseAccountId(params.get("accountId"));
  const amount = Math.floor(Number(params.get("amount")) || 0);

  const { data: accounts = [] } = useMaturityAccounts();
  const account = accounts.find((a) => a.accountId === accountId) ?? null;
  const createRollover = useCreateDepositRollover();
  const transferToCma = useTransferRemainderToCma();
  const busy = createRollover.isPending || transferToCma.isPending;

  const goHistory = () => router.replace("/recommendations/maturity/select?tab=history");

  const handleReinvest = () => {
    if (!accountId || amount <= 0 || busy) return;
    createRollover.mutate(
      { linkedBankAccountId: accountId, amount },
      {
        onSuccess: () => {
          toast.success("같은 상품으로 예금 재예치가 예약됐어요.");
          goHistory();
        },
        onError: (e) =>
          toast.error(
            e instanceof ApiError
              ? e.message
              : "재예치하지 못했어요. 잠시 후 다시 시도해 주세요.",
          ),
      },
    );
  };

  const handleTransferToCma = () => {
    if (!accountId || amount <= 0 || busy) return;
    transferToCma.mutate(
      { linkedBankAccountId: accountId, amount },
      {
        onSuccess: () => {
          toast.success("만기일에 포켓스톡 CMA로 이체되도록 예약했어요.");
          goHistory();
        },
        onError: (e) =>
          toast.error(
            e instanceof ApiError
              ? e.message
              : "CMA로 이체하지 못했어요. 잠시 후 다시 시도해 주세요.",
          ),
      },
    );
  };

  if (!accountId || amount <= 0) {
    return (
      <>
        <AppHeader variant="sub" title="예금 재예치" />
        <EmptyState
          title="재예치할 금액이 없어요"
          description="만기 자금에서 예금으로 남길 금액이 있을 때 이용할 수 있어요."
        />
      </>
    );
  }

  return (
    <>
      <AppHeader variant="sub" title="예금 재예치" />
      <MaturityStepper current={4} />

      <div className="space-y-4 pb-28">
        {/* ── 요약: 재예치 금액 ─────────────────────────────────────────── */}
        <section className="rounded-2xl bg-brand-surface p-5">
          <p className="text-sm font-semibold text-primary">예금으로 다시 맡길 금액</p>
          <p className="mt-1 font-numeric text-[30px] font-semibold leading-tight tabular-nums text-foreground">
            {formatKRW(amount)}
          </p>
          <p className="mt-1.5 text-[12.5px] text-[#3c5170]">
            만기 자금 중 배당주에 담지 않은 금액이에요. 만기된 상품과 같은 조건으로 다시 맡겨요.
          </p>
        </section>

        {/* ── 같은 상품 ─────────────────────────────────────────────────── */}
        <section>
          <p className="mb-2.5 px-0.5 text-sm font-bold text-muted-foreground">재예치 상품</p>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-surface text-primary">
              <PiggyBank className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-foreground">
                {account?.accountName ?? "만기된 예적금"}
              </p>
              <p className="mt-0.5 font-numeric text-[12px] tabular-nums text-muted-foreground">
                만기된 상품과 같은 조건
                {account ? ` · 연 ${account.interestRate}%` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-brand-surface px-2.5 py-1 text-[11px] font-bold text-primary">
              같은 상품
            </span>
          </div>
          <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-muted-foreground">
            만기일에 같은 상품·금리로 자동 재예치돼요. 재예치하지 않으면 만기일에 포켓스톡 CMA로 이체할 수 있어요.
          </p>
        </section>
      </div>

      {/* ── 하단 고정 버튼 — 같은 상품 재예치 / CMA로 이체 ──────────────────── */}
      <div className="fixed bottom-[var(--bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background px-5 pb-4 pt-3">
        <button
          type="button"
          onClick={handleReinvest}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {createRollover.isPending ? "재예치 중…" : "같은 상품으로 재예치"}
        </button>
        <button
          type="button"
          onClick={handleTransferToCma}
          disabled={busy}
          className="mt-2 flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-primary transition-colors hover:bg-brand-surface disabled:opacity-50"
        >
          {transferToCma.isPending ? "이체 중…" : "재예치 없이 CMA로 이체"}
        </button>
      </div>
    </>
  );
}
