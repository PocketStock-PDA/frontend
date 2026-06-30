"use client";

import { useState } from "react";
import { PiggyBank } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { MaturityStepper } from "@/components/features/maturity/MaturityStepper";
import { ExitGuardDialog } from "@/components/features/maturity/ExitGuardDialog";
import { useMaturityAccounts } from "@/hooks/queries/useMaturityAccounts";
import { formatKRW } from "@/lib/utils/currency";
import { parseAccountId } from "@/lib/utils/params";

/**
 * Step 4: 예금 재예치.
 * 선택(재예치 or CMA 이체)만 받고 API는 호출하지 않는다 —
 * depositAction=rollover|cma 파라미터로 step 5(완료)에 전달.
 */
export default function MaturityDepositPage() {
  const router = useRouter();
  const params = useSearchParams();
  const accountId = parseAccountId(params.get("accountId"));
  const amount = Math.floor(Number(params.get("deposit")) || 0);
  const rawItems = params.get("items") ?? "";
  const dripParam = params.get("drip") ?? "";
  const [exitOpen, setExitOpen] = useState(false);

  const { data: accounts = [] } = useMaturityAccounts();
  const account = accounts.find((a) => a.accountId === accountId) ?? null;

  const goComplete = (depositAction: "rollover" | "cma") => {
    const base = `items=${rawItems}&accountId=${accountId ?? ""}&drip=${dripParam}&deposit=${amount}&depositAction=${depositAction}`;
    router.push(`/recommendations/maturity/complete?${base}`);
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
      <AppHeader variant="sub" title="예금 재예치" onBack={() => setExitOpen(true)} />
      <MaturityStepper current={4} />

      <div className="space-y-4 pb-28">
        {/* 재예치 금액 */}
        <section className="rounded-2xl bg-brand-surface p-5">
          <p className="text-sm font-semibold text-primary">예금으로 다시 맡길 금액</p>
          <p className="mt-1 font-numeric text-[30px] font-semibold leading-tight tabular-nums text-foreground">
            {formatKRW(amount)}
          </p>
          <p className="mt-1.5 text-[12.5px] text-[#3c5170]">
            만기 자금 중 배당주에 담지 않은 금액이에요. 만기된 상품과 같은 조건으로 다시 맡겨요.
          </p>
        </section>

        {/* 재예치 상품 */}
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

      {/* 하단 버튼 */}
      <div className="fixed bottom-[var(--bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background px-5 pb-4 pt-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => goComplete("rollover")}
            className="h-12 flex-1 rounded-xl border border-border text-sm font-semibold text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            같은 상품으로 재예치
          </button>
          <button
            type="button"
            onClick={() => goComplete("cma")}
            className="h-12 flex-1 rounded-xl bg-primary text-sm font-semibold text-white transition-opacity active:scale-95 active:opacity-80"
          >
            CMA로 이체
          </button>
        </div>
      </div>

      <ExitGuardDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        onConfirm={() => router.push("/recommendations/maturity/select")}
      />
    </>
  );
}
