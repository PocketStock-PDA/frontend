"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLinkedCards } from "@/hooks/queries/useLinkedCards";
import { useCollectSettings } from "@/hooks/queries/useCollectSettings";
import { useSaveCollectSettings } from "@/hooks/mutations/useSaveCollectSettings";
import type { LinkedCard } from "@/types/domain/account";

const isShinhanCheck = (card: LinkedCard) =>
  card.cardType === "CHECK" &&
  card.companyName.includes("신한") &&
  !card.cardName.includes("트래블");

export default function CardCollectSettingPage() {
  const router = useRouter();
  const linkedCards = useLinkedCards();
  const collectSettings = useCollectSettings();
  const saveSettings = useSaveCollectSettings();

  const activeCardId = useMemo(() => {
    const active = collectSettings.data?.find(
      (s) => s.sourceType === "CARD" && s.enabled,
    );
    return active?.sourceRefId ?? null;
  }, [collectSettings.data]);

  // undefined이면 서버 설정을 따르고, null이면 사용자가 명시적으로 미선택한 상태.
  const [selectedOverride, setSelectedOverride] = useState<
    number | null | undefined
  >(undefined);
  const selectedId =
    selectedOverride !== undefined ? selectedOverride : activeCardId;

  const handleSave = () => {
    const shinhanCheckCards = (linkedCards.data ?? []).filter(isShinhanCheck);
    const settings = shinhanCheckCards.map((card) => ({
      sourceType: "CARD" as const,
      sourceRefId: card.cardId,
      enabled: card.cardId === selectedId,
    }));
    saveSettings.mutate(settings, {
      onSuccess: () => {
        toast.success("카드 설정이 저장됐어요");
        router.back();
      },
      onError: () => toast.error("저장에 실패했어요. 다시 시도해주세요."),
    });
  };

  const isLoading = linkedCards.isLoading || collectSettings.isLoading;
  const isError = linkedCards.isError || collectSettings.isError;
  const shinhanCheckCards = (linkedCards.data ?? []).filter(isShinhanCheck);

  return (
    <>
      <AppHeader variant="sub" title="잔돈 모으기 카드 설정" />

      <div className="flex flex-col pb-24 pt-2">
        <p className="text-sm text-muted-foreground">
          잔돈을 모을 신한 체크카드를 선택해 주세요.
        </p>

        <div className="mt-4 space-y-2">
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                카드 설정을 불러오지 못했어요.
              </p>
              <button
                type="button"
                onClick={() => {
                  linkedCards.refetch();
                  collectSettings.refetch();
                }}
                className="text-sm font-bold text-primary underline"
              >
                다시 시도
              </button>
            </div>
          ) : shinhanCheckCards.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              연동된 신한 체크카드가 없어요.
            </p>
          ) : (
            shinhanCheckCards.map((card) => {
              const on = selectedId === card.cardId;
              return (
                <button
                  key={card.cardId}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSelectedOverride(on ? null : card.cardId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                    on ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <span className="flex h-7 w-10 shrink-0 items-center justify-center rounded bg-blue-600 text-[9px] font-bold text-white">
                    신한
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {card.cardName}
                    </p>
                    <p className="truncate font-numeric text-xs text-muted-foreground">
                      {card.maskedNo ?? "····-····-····"}
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

        <div className="fixed bottom-[var(--bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-5">
          <Button
            onClick={handleSave}
            disabled={isError || isLoading || saveSettings.isPending}
            className="h-12 w-full text-base font-bold"
          >
            {saveSettings.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </>
  );
}
