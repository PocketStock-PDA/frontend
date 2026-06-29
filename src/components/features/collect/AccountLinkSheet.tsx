"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { EmptyState } from "@/components/common/EmptyState";
import { InstitutionLogo } from "@/components/common/InstitutionLogo";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useCollectSettings } from "@/hooks/queries/useCollectSettings";
import { useSaveCollectSettings } from "@/hooks/mutations/useSaveCollectSettings";
import { cn } from "@/lib/utils";

const THRESHOLDS = [1000, 5000, 10000];

interface AccountLinkSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 은행 잔돈 수집 계좌 설정 — 비휴면 원화 계좌 중 끝전을 모을 계좌를 선택/해제하고
 * 수집 기준 금액을 정한다. 저장 = PUT /api/cma/collect/settings(ACCOUNT).
 */
export function AccountLinkSheet({ open, onOpenChange }: AccountLinkSheetProps) {
  const { data: accounts } = useBankAccounts(open);
  const { data: settings } = useCollectSettings(open);
  const save = useSaveCollectSettings();

  // 수집 대상 후보: 비휴면 + 원화(외화는 SOL트래블에서 따로 적립).
  const eligible = useMemo(
    () =>
      (accounts ?? []).filter((a) => !a.isDormant && a.currency === "KRW"),
    [accounts],
  );
  const enabledIds = useMemo(
    () =>
      new Set(
        (settings ?? [])
          .filter((s) => s.sourceType === "ACCOUNT" && s.enabled)
          .map((s) => s.sourceRefId),
      ),
    [settings],
  );
  const savedThreshold = useMemo(
    () =>
      (settings ?? []).find((s) => s.sourceType === "ACCOUNT" && s.threshold)
        ?.threshold ?? 5000,
    [settings],
  );

  // 시트 열릴 때 현재 설정으로 초기화.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [threshold, setThreshold] = useState(5000);
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 오픈 시 현재 설정으로 1회 동기화
    setSelected(new Set(enabledIds));
    setThreshold(savedThreshold);
    // 오픈 시점 값으로 충분 → open만 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const apply = async () => {
    const payload = eligible.map((a) => ({
      sourceType: "ACCOUNT" as const,
      sourceRefId: a.accountId,
      enabled: selected.has(a.accountId),
      threshold,
    }));
    if (payload.length === 0) {
      onOpenChange(false);
      return;
    }
    try {
      await save.mutateAsync(payload);
      toast.success("은행 잔돈 수집 설정을 저장했어요");
      onOpenChange(false);
    } catch {
      toast.error("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85vh] max-w-[430px] gap-0 rounded-t-3xl px-5 pb-6 pt-2"
      >
        <SheetHeader className="px-0">
          <SheetTitle className="text-lg font-bold">은행 잔돈 계좌</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            끝전을 모을 계좌를 선택하세요. 기준 금액 미만 잔액만 모아요.
          </SheetDescription>
        </SheetHeader>

        {/* 수집 기준 금액 */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {THRESHOLDS.map((t) => {
            const on = threshold === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setThreshold(t)}
                className={cn(
                  "rounded-lg border py-2 text-sm font-bold transition-colors",
                  on
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-foreground",
                )}
              >
                {t.toLocaleString("ko-KR")}원
              </button>
            );
          })}
        </div>

        <div className="mt-3 space-y-2 overflow-y-auto py-1">
          {eligible.length === 0 ? (
            <EmptyState title="모을 수 있는 계좌가 없어요" />
          ) : (
            eligible.map((a) => {
              const on = selected.has(a.accountId);
              return (
                <button
                  key={a.accountId}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(a.accountId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    on ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <InstitutionLogo
                    code={a.bankCode}
                    name={a.bankName}
                    className="size-9 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {a.accountName}
                    </p>
                    <AmountDisplay
                      value={a.balance}
                      size="sm"
                      className="text-xs text-muted-foreground"
                    />
                  </div>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                      on ? "border-primary" : "border-muted-foreground/30",
                    )}
                  >
                    {on && <span className="size-2.5 rounded-full bg-primary" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <Button
          onClick={apply}
          disabled={save.isPending}
          className="mt-3 h-12 w-full text-base font-bold"
        >
          {save.isPending ? "저장 중..." : "적용"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
