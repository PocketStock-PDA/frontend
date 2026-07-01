"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AmountInput } from "@/components/common/AmountInput";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { InstitutionLogo } from "@/components/common/InstitutionLogo";
import { useAutoChargeSettings, useUpdateAutoChargeSettings } from "@/hooks/queries/useAutoChargeSettings";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { BankAccount } from "@/types/domain/account";

interface Props {
  onSaved?: () => void;
  /** Sheet 안에 쓸 때 true — 버튼을 fixed 대신 인라인으로 렌더 */
  inline?: boolean;
}

function BankAccountOption({
  bank,
  active,
  onClick,
}: {
  bank: BankAccount;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 py-4"
    >
      <InstitutionLogo code={bank.bankCode} name={bank.bankName} className="size-10" />
      <div className="min-w-0 flex-1 text-left">
        <p className={cn("text-[15px]", active ? "font-bold text-foreground" : "font-medium text-foreground")}>
          {bank.bankName}
        </p>
        <p className="font-numeric mt-0.5 truncate text-[13px] text-muted-foreground">
          {bank.accountName}
        </p>
      </div>
      <p className="font-numeric shrink-0 text-[13px] font-semibold text-foreground">
        {formatKRW(bank.balance)}
      </p>
      {active && <Check className="size-4.5 shrink-0 text-brand" />}
    </button>
  );
}

export function AutoChargeSettingsForm({ onSaved, inline = false }: Props) {
  const settingsQ = useAutoChargeSettings();
  const bankQ = useBankAccounts();
  const update = useUpdateAutoChargeSettings();

  const [enabled, setEnabled] = useState(false);
  const [sourceAccountId, setSourceAccountId] = useState<number | null>(null);
  const [maxChargePerTx, setMaxChargePerTx] = useState<number>(100000);
  const [sheetOpen, setSheetOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!settingsQ.data) return;
    setEnabled(settingsQ.data.enabled);
    setSourceAccountId(settingsQ.data.sourceAccountId ?? null);
    setMaxChargePerTx(settingsQ.data.maxChargePerTx ?? 100000);
  }, [settingsQ.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const banks = Array.isArray(bankQ.data) ? bankQ.data : [];
  const selectedBank = banks.find((b) => b.accountId === sourceAccountId) ?? null;

  const handleSave = () => {
    update.mutate(
      {
        enabled,
        ...(sourceAccountId !== null && { sourceAccountId }),
        maxChargePerTx,
      },
      {
        onSuccess: () => {
          toast.success("자동충전 설정을 저장했어요");
          onSaved?.();
        },
        onError: () => toast.error("저장에 실패했어요. 잠시 후 다시 시도해 주세요."),
      },
    );
  };

  if (settingsQ.isLoading || bankQ.isLoading) {
    return <SkeletonCard lines={4} className="h-48" />;
  }

  return (
    <div className={cn("space-y-5", !inline && "pb-32")}>
      {/* ON/OFF */}
      <label className="flex items-center justify-between rounded-xl border border-border px-4 py-3.5">
        <div>
          <p className="text-sm font-bold text-foreground">부족금액 자동충전</p>
          <p className="text-xs text-muted-foreground">
            잔액이 부족할 때 연동 은행계좌에서 자동으로 충전해요
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>

      {/* 충전 계좌 드롭다운 */}
      <div className={cn("space-y-2", !enabled && "pointer-events-none opacity-40")}>
        <p className="text-sm font-bold text-foreground">충전 계좌</p>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => banks.length > 0 && setSheetOpen(true)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && banks.length > 0 && setSheetOpen(true)}
            className={cn(
              "flex items-center gap-3.5 rounded-2xl border border-border px-4 py-3.5 transition-colors",
              banks.length > 0 ? "cursor-pointer active:bg-muted/40" : "cursor-default opacity-60",
            )}
          >
            {selectedBank && (
              <InstitutionLogo
                code={selectedBank.bankCode}
                name={selectedBank.bankName}
                className="size-10"
              />
            )}

            <div className="min-w-0 flex-1">
              {selectedBank ? (
                <>
                  <p className="text-[15px] font-semibold text-foreground">{selectedBank.bankName}</p>
                  <p className="font-numeric mt-0.5 truncate text-[13px] text-muted-foreground">
                    {selectedBank.accountName}
                  </p>
                </>
              ) : (
                <p className="text-[15px] font-medium text-muted-foreground">
                  {banks.length === 0 ? "연동된 은행 계좌가 없어요" : "계좌를 선택해 주세요"}
                </p>
              )}
            </div>

            {selectedBank && (
              <p className="font-numeric shrink-0 text-[13px] font-semibold text-foreground">
                {formatKRW(selectedBank.balance)}
              </p>
            )}

            {banks.length > 0 && (
              <ChevronDown
                className={cn(
                  "size-4.5 shrink-0 text-muted-foreground transition-transform duration-200",
                  sheetOpen && "rotate-180",
                )}
              />
            )}
          </div>

          <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl px-0 pb-safe">
            <SheetHeader className="shrink-0 px-5 pb-2 pt-4">
              <SheetTitle className="text-left text-base font-bold">충전 계좌 선택</SheetTitle>
            </SheetHeader>

            <div className="scrollbar-thin overflow-y-auto px-5 pb-6 pt-2">
              <div className="divide-y divide-border/50">
                {banks.map((b) => (
                  <BankAccountOption
                    key={b.accountId}
                    bank={b}
                    active={sourceAccountId === b.accountId}
                    onClick={() => {
                      setSourceAccountId(b.accountId);
                      setSheetOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 1회 충전 한도 */}
      <div className={cn("space-y-2", !enabled && "pointer-events-none opacity-40")}>
        <p className="text-sm font-bold text-foreground">1회 충전 한도</p>
        <div className="rounded-2xl bg-muted/50 p-4">
          <AmountInput
            value={maxChargePerTx}
            onChange={setMaxChargePerTx}
            suffix="원"

          />
        </div>
        <p className="text-xs text-muted-foreground">
          1회 최대 {formatKRW(maxChargePerTx)} 충전
        </p>
      </div>

      {inline ? (
        <div className="space-y-2">
          {enabled && sourceAccountId === null && (
            <p className="text-center text-xs text-destructive">충전 계좌를 선택해 주세요</p>
          )}
          <Button
            onClick={handleSave}
            disabled={update.isPending || (enabled && sourceAccountId === null)}
            className="h-12 w-full text-base font-bold"
          >
            {update.isPending ? "저장 중…" : "저장"}
          </Button>
        </div>
      ) : (
        <div className="fixed bottom-[var(--bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-5 pb-4">
          {enabled && sourceAccountId === null && (
            <p className="mb-2 text-center text-xs text-destructive">충전 계좌를 선택해 주세요</p>
          )}
          <Button
            onClick={handleSave}
            disabled={update.isPending || (enabled && sourceAccountId === null)}
            className="h-12 w-full text-base font-bold"
          >
            {update.isPending ? "저장 중…" : "저장"}
          </Button>
        </div>
      )}
    </div>
  );
}
