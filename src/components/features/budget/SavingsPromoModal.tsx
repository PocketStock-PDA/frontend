"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useBudgetSavings } from "@/hooks/queries/useBudget";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useSetTransferAccount } from "@/hooks/mutations/useSetTransferAccount";
import { useAgreeCollect } from "@/hooks/mutations/useAgreeCollect";
import { TxnAuthDialog } from "@/components/common/TxnAuthDialog";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

/**
 * 가계부 첫 진입(소비 분석 → 가계부 시작하기) 직후 1회 노출되는 절약금 모으기 제안 모달.
 * 1단계(제안) → 2단계(이체 계좌 선택 + 동의). 동의 시 useSetTransferAccount + useAgreeCollect.
 * 노출 제어/1회성은 호출부(BudgetPage)가 담당한다.
 */
export function SavingsPromoModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"promo" | "setup">("promo");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [txnAuthOpen, setTxnAuthOpen] = useState(false);

  const savingsQ = useBudgetSavings();
  const bankAccountsQ = useBankAccounts(open);
  const setTransferAccount = useSetTransferAccount();
  const agreeCollect = useAgreeCollect();

  const budget = savingsQ.data?.totalBudget ?? 0;
  const spent = savingsQ.data?.spentAmount ?? 0;
  const saveable = Math.max(0, budget - spent);
  const spentPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  // 절약금 이체 가능 계좌: 원화 입출금(비휴면)만
  const eligibleAccounts = (bankAccountsQ.data ?? []).filter(
    (a) => a.currency === "KRW" && a.accountType === "DEMAND" && !a.isDormant,
  );

  const pending = setTransferAccount.isPending || agreeCollect.isPending;

  // 거래 인증(계좌 비밀번호) 입력 중에는 제안 모달이 닫히지 않게 막는다.
  const handleOpenChange = (next: boolean) => {
    if (!next && txnAuthOpen) return;
    onOpenChange(next);
  };

  const handleStart = () => {
    if (selectedId === null || !agreeChecked || pending) return;
    setTransferAccount.mutate(selectedId, {
      onSuccess: () =>
        agreeCollect.mutate(undefined, {
          onSuccess: () => onOpenChange(false),
        }),
      onError: (err) => {
        // 이체 계좌 등록은 거래 인증 필요 — 미인증/만료(TXN_AUTH_REQUIRED)면
        // 계좌 비밀번호 입력을 띄우고, 인증 성공 후 동일 동작을 재시도한다.
        if (err instanceof ApiError && err.code === "TXN_AUTH_REQUIRED") {
          setTxnAuthOpen(true);
          return;
        }
        toast.error(
          err instanceof ApiError ? err.message : "잠시 후 다시 시도해 주세요.",
        );
      },
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[340px]">
        {step === "promo" ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-6 text-primary" />
            </div>
            <DialogTitle className="mt-3 text-[17px] font-bold leading-snug">
              이번 달, 이만큼 아낄 수 있어요
            </DialogTitle>
            <DialogDescription className="sr-only">
              남은 예산을 월말에 자동으로 저금하는 절약금 모으기 제안
            </DialogDescription>

            <div className="mt-4 w-full rounded-2xl border border-border p-4 text-left">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-muted-foreground">이번 달 예산</span>
                <span className="font-numeric text-sm font-bold text-foreground">
                  {formatKRW(budget)}
                </span>
              </div>
              <div
                className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-muted"
                aria-hidden
              >
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${spentPct}%` }}
                />
                {spentPct < 100 && (
                  <>
                    <div className="h-full w-[2px] shrink-0 bg-background" />
                    <div className="h-full flex-1 bg-[#38BDF8]" />
                  </>
                )}
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-primary" />
                  <span className="text-muted-foreground">쓴 돈</span>
                  <span className="font-numeric font-bold text-primary">
                    {formatKRW(spent)}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">아낄 수 있는 돈</span>
                  <span className="font-numeric font-bold text-[#0369A1]">
                    {formatKRW(saveable)}
                  </span>
                  <span className="size-2 rounded-[2px] bg-[#38BDF8]" />
                </span>
              </div>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
              안 쓴 예산을 매월 말일 자동으로 CMA에 저금하고 굴려보세요.
            </p>

            <Button
              className="mt-5 h-14 w-full text-base font-bold"
              onClick={() => setStep("setup")}
            >
              절약금 모으기 시작
            </Button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-2 py-1.5 text-[13px] text-muted-foreground"
            >
              다음에 할게요
            </button>
          </div>
        ) : (
          <div>
            <DialogTitle className="text-base font-bold">절약금 이체 설정</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              절약금을 받을 입출금 계좌를 선택해 주세요.
            </DialogDescription>

            <div className="mt-4">
              {bankAccountsQ.isLoading ? (
                <SkeletonCard lines={3} />
              ) : eligibleAccounts.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    절약금을 받을 입출금 통장이 없어요.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push("/asset-link")}
                  >
                    계좌 연동하기
                  </Button>
                </div>
              ) : (
                <div className="max-h-[40vh] space-y-2.5 overflow-y-auto">
                  {eligibleAccounts.map((a) => (
                    <button
                      key={a.accountId}
                      type="button"
                      onClick={() => setSelectedId(a.accountId)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors",
                        selectedId === a.accountId
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {a.bankName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {a.accountName}
                        </p>
                      </div>
                      {selectedId === a.accountId && (
                        <CheckCircle2 className="size-5 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {eligibleAccounts.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setAgreeChecked((v) => !v)}
                  className="mt-4 flex w-full items-start gap-2.5 text-left"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                      agreeChecked
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background",
                    )}
                  >
                    {agreeChecked && <Check className="size-3.5" />}
                  </span>
                  <span className="text-[13px] leading-snug text-muted-foreground">
                    매달 쓰고 남은 예산을 선택한 계좌로 자동 이체하는 절약금 모으기
                    서비스 이용에 동의합니다.
                  </span>
                </button>
                <Button
                  className="mt-5 h-14 w-full text-base font-bold"
                  disabled={selectedId === null || !agreeChecked || pending}
                  onClick={handleStart}
                >
                  {pending ? "처리 중..." : "동의하고 시작"}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    <TxnAuthDialog
      open={txnAuthOpen}
      onOpenChange={setTxnAuthOpen}
      onVerified={handleStart}
    />
    </>
  );
}
