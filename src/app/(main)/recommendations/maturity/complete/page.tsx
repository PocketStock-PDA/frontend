"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, PiggyBank, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppHeader } from "@/components/common/AppHeader";
import { MaturityStepper } from "@/components/features/maturity/MaturityStepper";
import { ExitGuardDialog } from "@/components/features/maturity/ExitGuardDialog";
import { useCreateMaturityReservation } from "@/hooks/mutations/useCreateMaturityReservation";
import { useSetDividendReinvest } from "@/hooks/mutations/useSetDividendReinvest";
import { useCreateDepositRollover } from "@/hooks/mutations/useCreateDepositRollover";
import { useTransferRemainderToCma } from "@/hooks/mutations/useTransferRemainderToCma";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useMaturityAccounts } from "@/hooks/queries/useMaturityAccounts";
import { formatKRW } from "@/lib/utils/currency";
import { parseAccountId } from "@/lib/utils/params";

type DepositAction = "rollover" | "cma" | "skip";

/** items=CODE:AMT,... 파싱 → [{code, amount}] */
function parseItems(raw: string) {
  return raw
    .split(",")
    .flatMap((seg) => {
      const [code, amt] = seg.split(":");
      return code && amt !== undefined ? [{ code, amount: Number(amt) }] : [];
    });
}

/** drip=CODE:1,CODE:0 파싱 → Map<code, enabled> */
function parseDrip(raw: string): Map<string, boolean> {
  const m = new Map<string, boolean>();
  raw.split(",").forEach((seg) => {
    const [code, val] = seg.split(":");
    if (code) m.set(code, val === "1");
  });
  return m;
}

/**
 * Step 5: 완료.
 * 이 페이지에서 처음으로 모든 API를 호출한다 —
 * 예약 생성, DRIP 설정, 예금 재예치 or CMA 이체.
 */
export default function MaturityCompletePage() {
  const router = useRouter();
  const params = useSearchParams();
  const accountId = parseAccountId(params.get("accountId"));
  const rawItems = params.get("items") ?? "";
  const rawDrip = params.get("drip") ?? "";
  const depositAmount = Math.floor(Number(params.get("deposit")) || 0);
  const depositAction = (params.get("depositAction") ?? "skip") as DepositAction;

  const items = useMemo(() => parseItems(rawItems), [rawItems]);
  const dripMap = useMemo(() => parseDrip(rawDrip), [rawDrip]);
  const codes = useMemo(() => items.map((i) => i.code), [items]);

  const [exitOpen, setExitOpen] = useState(false);
  const submittingRef = useRef(false);

  const { data: accounts = [] } = useMaturityAccounts();
  const account = accounts.find((a) => a.accountId === accountId) ?? null;

  const detailQueries = useStockDetails(codes);
  const infoByCode = useMemo(() => {
    const m = new Map<string, { name: string; logoUrl: string | null }>();
    codes.forEach((code, i) => {
      const d = detailQueries[i]?.data;
      m.set(code, { name: d?.stockName ?? code, logoUrl: d?.logoUrl ?? null });
    });
    return m;
  }, [codes, detailQueries]);

  const createReservation = useCreateMaturityReservation();
  const setDrip = useSetDividendReinvest();
  const createRollover = useCreateDepositRollover();
  const transferToCma = useTransferRemainderToCma();

  const isSubmitting =
    createReservation.isPending ||
    setDrip.isPending ||
    createRollover.isPending ||
    transferToCma.isPending;

  const handleSubmit = async () => {
    if (submittingRef.current || !accountId) return;
    submittingRef.current = true;
    try {
      // 1. 배당주 예약 생성 (순차 — 서버 side-effect 순서 보장)
      for (const item of items) {
        await createReservation.mutateAsync({
          linkedBankAccountId: accountId,
          stockCode: item.code,
          buyAmount: item.amount,
        });
      }

      // 2. DRIP 설정 (켜진 종목만)
      const dripTargets = codes.filter((c) => dripMap.get(c) === true);
      for (const code of dripTargets) {
        await setDrip.mutateAsync({ stockCode: code, enabled: true });
      }

      // 3. 예금 처리
      if (depositAmount > 0 && accountId) {
        const body = { linkedBankAccountId: accountId, amount: depositAmount };
        if (depositAction === "rollover") {
          await createRollover.mutateAsync(body);
        } else if (depositAction === "cma") {
          await transferToCma.mutateAsync(body);
        }
      }

      router.replace("/recommendations/maturity/select?tab=history");
    } catch {
      toast.error("예약 중 오류가 발생했어요. 다시 시도해 주세요.");
      submittingRef.current = false;
    }
  };

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const dripOnCount = codes.filter((c) => dripMap.get(c) === true).length;

  return (
    <>
      <AppHeader variant="sub" title="최종 확인" onBack={() => setExitOpen(true)} />
      <MaturityStepper current={5} />

      <div className="space-y-4 pb-32">
        {/* 예약 요약 헤더 */}
        <section className="rounded-2xl bg-brand-surface p-5">
          <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-primary">
            <CheckCircle2 className="size-[17px]" />
            예약 내용 확인
          </div>
          <p className="mt-2.5 text-[15.5px] font-bold leading-snug text-foreground">
            아래 내용으로 예약을 진행해요
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#3c5170]">
            확인 버튼을 누르면 예약이 확정돼요. 예약 후에는 마이 &gt; 투자내역에서 확인할 수 있어요.
          </p>
        </section>

        {/* 예약 종목 목록 */}
        <section>
          <p className="mb-2.5 px-0.5 text-sm font-bold text-muted-foreground">
            배당주 담기 · {formatKRW(totalAmount)}
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {items.map(({ code, amount }) => {
                const info = infoByCode.get(code);
                const name = info?.name ?? code;
                const logoUrl = info?.logoUrl ?? null;
                const dripOn = dripMap.get(code) === true;
                return (
                  <li key={code} className="flex items-center gap-3 px-4 py-3.5">
                    <Avatar className="size-9 shrink-0 rounded-xl">
                      {logoUrl && <AvatarImage src={logoUrl} alt="" />}
                      <AvatarFallback className="rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground">
                        {name.trim().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">{name}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {dripOn ? "배당 재투자 켜짐" : "배당 현금 수령"}
                      </p>
                    </div>
                    <p className="shrink-0 font-numeric text-[13px] font-semibold tabular-nums text-foreground">
                      {formatKRW(amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
          {dripOnCount > 0 && (
            <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-muted-foreground">
              {dripOnCount}종목은 배당이 들어오면 자동으로 같은 주식을 더 사드려요.
            </p>
          )}
        </section>

        {/* 예금 처리 요약 */}
        {depositAmount > 0 && depositAction !== "skip" && (
          <section>
            <p className="mb-2.5 px-0.5 text-sm font-bold text-muted-foreground">
              {depositAction === "rollover" ? "예금 재예치" : "CMA 이체"} · {formatKRW(depositAmount)}
            </p>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-surface text-primary">
                {depositAction === "rollover" ? (
                  <PiggyBank className="size-[18px]" />
                ) : (
                  <RefreshCw className="size-[18px]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {depositAction === "rollover"
                    ? (account?.accountName ?? "만기된 예적금")
                    : "포켓스톡 CMA"}
                </p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {depositAction === "rollover"
                    ? "만기된 상품과 같은 조건으로 재예치"
                    : "만기일에 CMA 원화 잔고로 이체"}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* 하단 CTA */}
      <div className="fixed bottom-[var(--bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background px-5 pb-4 pt-3">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-opacity disabled:opacity-50 active:opacity-80"
        >
          {isSubmitting ? "처리 중..." : "예약 완료하기"}
        </button>
      </div>

      <ExitGuardDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        onConfirm={() => router.back()}
      />
    </>
  );
}
