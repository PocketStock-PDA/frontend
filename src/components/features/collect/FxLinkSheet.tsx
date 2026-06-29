"use client";

import { useMemo } from "react";
import { Plane } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { EmptyState } from "@/components/common/EmptyState";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useCollectSettings } from "@/hooks/queries/useCollectSettings";
import { useSaveCollectSettings } from "@/hooks/mutations/useSaveCollectSettings";

interface FxLinkSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * SOL트래블(외화) 잔돈 모으기 on/off — USD 외화 지갑을 CMA 달러 풀로 모을지 토글한다.
 * 계좌 행 옆 스위치로 바로 켜고 끈다. 기본은 ON(설정 없음=수집), 끄면 FX 수집설정을 enabled=false로 저장한다.
 * 저장 = PUT /api/cma/collect/settings(FX). 환전이 아니라 USD→USD 이동이라 기준금액(threshold)은 없다.
 */
export function FxLinkSheet({ open, onOpenChange }: FxLinkSheetProps) {
  const { data: accounts } = useBankAccounts(open);
  const { data: settings } = useCollectSettings(open);
  const save = useSaveCollectSettings();

  // 외화(USD) 지갑만 대상 — 현재 모집단은 SOL트래블 외화예금.
  const eligible = useMemo(
    () => (accounts ?? []).filter((a) => a.currency === "USD"),
    [accounts],
  );
  // FX 수집설정으로 명시적으로 끈 지갑 id (설정 없으면 기본 ON).
  const disabledIds = useMemo(
    () =>
      new Set(
        (settings ?? [])
          .filter((s) => s.sourceType === "FX" && !s.enabled)
          .map((s) => s.sourceRefId),
      ),
    [settings],
  );

  const handleToggle = async (accountId: number, next: boolean) => {
    try {
      await save.mutateAsync([
        { sourceType: "FX", sourceRefId: accountId, enabled: next },
      ]);
      toast.success(
        next ? "SOL트래블 모으기를 켰어요" : "SOL트래블 모으기를 껐어요",
      );
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
          <SheetTitle className="text-lg font-bold">SOL트래블 모으기</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            외화 잔액을 CMA 달러로 모을지 켜고 끌 수 있어요.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 space-y-2 overflow-y-auto py-1">
          {eligible.length === 0 ? (
            <EmptyState title="모을 수 있는 외화 지갑이 없어요" />
          ) : (
            eligible.map((a) => (
              <div
                key={a.accountId}
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Plane className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {a.accountName}
                  </p>
                  <AmountDisplay
                    value={a.balance}
                    currency="USD"
                    size="sm"
                    className="text-xs text-muted-foreground"
                  />
                </div>
                <Switch
                  checked={!disabledIds.has(a.accountId)}
                  onCheckedChange={(v) => handleToggle(a.accountId, v)}
                  disabled={save.isPending}
                  aria-label="SOL트래블 모으기"
                />
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
