"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { useLinkedCards } from "@/hooks/queries/useLinkedCards";
import { useCollectSettings } from "@/hooks/queries/useCollectSettings";
import { useSaveCollectSettings } from "@/hooks/mutations/useSaveCollectSettings";
import { cn } from "@/lib/utils";

const CARD_CHIP_COLORS = ["bg-blue-600", "bg-rose-500", "bg-neutral-800"];

interface CardLinkSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 카드 결제 잔돈 수집 카드 설정 — 연동된 신한 체크카드 중 잔돈을 모을 카드를
 * 선택/해제한다. 저장 = PUT /api/cma/collect/settings(CARD).
 */
export function CardLinkSheet({ open, onOpenChange }: CardLinkSheetProps) {
  const { data: cards } = useLinkedCards(open);
  const { data: settings } = useCollectSettings(open);
  const save = useSaveCollectSettings();

  // 결제 잔돈 적립 대상: 신한 체크카드(트래블 제외) — 온보딩 카드 선택과 동일 기준.
  const eligible = useMemo(
    () =>
      (cards ?? []).filter(
        (c) =>
          c.cardType === "CHECK" &&
          c.companyName.includes("신한") &&
          !c.cardName.includes("트래블"),
      ),
    [cards],
  );
  // 현재 활성 라운드업 카드 ID (단일)
  const activeCardId = useMemo(
    () =>
      (settings ?? []).find((s) => s.sourceType === "CARD" && s.enabled)
        ?.sourceRefId ?? null,
    [settings],
  );

  // 시트 열릴 때 현재 설정으로 초기화 — 라운드업 카드는 1장만 선택 가능(라디오).
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 오픈 시 현재 설정으로 1회 동기화
    setSelected(activeCardId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 이미 선택된 카드를 다시 누르면 해제(null), 다른 카드를 누르면 단일 교체.
  const select = (id: number) =>
    setSelected((prev) => (prev === id ? null : id));

  const apply = async () => {
    const payload = eligible.map((c) => ({
      sourceType: "CARD" as const,
      sourceRefId: c.cardId,
      enabled: c.cardId === selected,
    }));
    if (payload.length === 0) {
      onOpenChange(false);
      return;
    }
    try {
      await save.mutateAsync(payload);
      toast.success("카드 잔돈 수집 설정을 저장했어요");
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
          <SheetTitle className="text-lg font-bold">연동 카드 변경</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            결제 잔돈을 모을 카드를 선택하세요. 해제도 여기서 할 수 있어요.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 space-y-2 overflow-y-auto py-1">
          {eligible.length === 0 ? (
            <EmptyState title="연동된 카드가 없어요" />
          ) : (
            eligible.map((c, i) => {
              const on = selected === c.cardId;
              return (
                <button
                  key={c.cardId}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => select(c.cardId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    on ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-10 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white",
                      CARD_CHIP_COLORS[i % CARD_CHIP_COLORS.length],
                    )}
                  >
                    {c.cardType === "CREDIT" ? "신용" : "체크"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {c.cardName}
                    </p>
                    <p className="truncate font-numeric text-xs text-muted-foreground">
                      {c.maskedNo ?? "····-····-····"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                      on
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30",
                    )}
                  >
                    {on && <Check className="size-3 text-primary-foreground" />}
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
