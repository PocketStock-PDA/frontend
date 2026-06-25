"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useWelcomeRewardCandidates,
  useWelcomeRewards,
} from "@/hooks/queries/useWelcomeRewards";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { useClaimWelcomeReward } from "@/hooks/mutations/useClaimWelcomeReward";
import { toDecimal } from "@/lib/utils/decimal";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { tradingAutoDetailPath } from "@/lib/navigation/routes";
import type { WelcomeReward } from "@/types/domain/reward";

/** 지급 예산(원) — 백엔드 BUDGET_KRW와 동일 */
const BUDGET_KRW = 1000;

/** 1,000원 → 약 N주 (KRW 종목만 가격으로 추정, 그 외는 금액만 표시) */
function estimateText(currency: string | undefined, price: number | undefined) {
  if (currency === "KRW" && price && price > 0) {
    const qty = toDecimal(BUDGET_KRW).div(price).toDecimalPlaces(4).toString();
    return `${formatKRW(BUDGET_KRW)} → 약 ${qty}주`;
  }
  return `${formatKRW(BUDGET_KRW)}어치`;
}

/** 지급 결과(실제 수량) → 약 N주 */
function grantedText(reward: WelcomeReward) {
  const qty = toDecimal(reward.quantity).toDecimalPlaces(4).toString();
  return `${formatKRW(reward.budgetKrw)} → 약 ${qty}주`;
}

/**
 * 온보딩 4 — 첫 주식 지급(웰컴 보상) 종목 선택 (#36, 시안 270-6857 · 307-397).
 * 자산연동 완료 후 홈 팝업에서 진입 → 후보 중 1종목 선택·지급 → 자동모으기 유도.
 */
export default function RewardPage() {
  const router = useRouter();
  const candidatesQ = useWelcomeRewardCandidates();
  const rewardsQ = useWelcomeRewards();
  const claim = useClaimWelcomeReward();

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  // 지급 완료 후 자동모으기 확인 바텀시트(11)
  const [granted, setGranted] = useState<WelcomeReward | null>(null);

  const candidates = candidatesQ.data ?? [];
  const selected = candidates.find((c) => c.stockCode === selectedCode) ?? null;

  // 선택 종목의 현재가(추정 수량 표시용)
  const detailQ = useStockDetail(selectedCode ?? "");
  // 해외 종목은 price가 null(백엔드 명세) → 옵셔널 체이닝 필수
  const estimate = useMemo(
    () => estimateText(selected?.currency, detailQ.data?.price?.currentPrice),
    [selected?.currency, detailQ.data?.price?.currentPrice],
  );

  // 이미 지급받음 → 홈으로 (1인 1회)
  const alreadyClaimed =
    rewardsQ.isSuccess && (rewardsQ.data?.length ?? 0) > 0;

  const onStart = () => {
    if (!selectedCode || claim.isPending) return;
    claim.mutate(selectedCode, {
      onSuccess: (reward) => setGranted(reward),
      onError: (e) => {
        const msg =
          e instanceof ApiError ? e.message : "지급에 실패했어요. 잠시 후 다시 시도해 주세요.";
        // 이미 지급받은 경우 등 → 홈으로
        if (e instanceof ApiError && e.status === 409) {
          toast.info(msg);
          router.replace("/home");
          return;
        }
        toast.error(msg);
      },
    });
  };

  if (candidatesQ.isLoading || rewardsQ.isLoading) {
    return (
      <div className="space-y-3 pt-6">
        <SkeletonCard lines={2} className="h-24" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard className="h-28" />
          <SkeletonCard className="h-28" />
          <SkeletonCard className="h-28" />
          <SkeletonCard className="h-28" />
        </div>
      </div>
    );
  }

  if (alreadyClaimed && !granted) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <EmptyState
          title="이미 첫 주식을 받았어요"
          description="홈에서 모은 주식을 확인해 보세요."
        />
        <Button onClick={() => router.replace("/home")} className="h-12 px-8">
          홈으로
        </Button>
      </div>
    );
  }

  if (candidatesQ.isError) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <EmptyState
          title="후보 종목을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => candidatesQ.refetch()}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-40 pt-6">
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">2 / 2단계</p>
        <h1 className="mt-1 text-2xl font-bold leading-snug text-foreground">
          시작할 종목을
          <br />
          하나 골라보세요
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          선택한 종목 {formatKRW(BUDGET_KRW)}어치를 바로 드려요
        </p>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-[13px] font-medium text-foreground">
            코스피·나스닥 대표 종목
          </p>
          <button
            type="button"
            onClick={() => candidatesQ.refetch()}
            disabled={candidatesQ.isFetching}
            className="flex items-center gap-1 text-xs text-muted-foreground disabled:opacity-50"
          >
            <RefreshCw
              className={cn("size-3.5", candidatesQ.isFetching && "animate-spin")}
            />
            새로고침
          </button>
        </div>

        {candidates.length === 0 ? (
          <EmptyState className="mt-6" title="추천 종목이 없어요" />
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {candidates.map((c) => {
              const active = c.stockCode === selectedCode;
              const initial = c.stockName.trim().charAt(0).toUpperCase();
              return (
                <button
                  key={c.stockCode}
                  type="button"
                  onClick={() => setSelectedCode(c.stockCode)}
                  className={cn(
                    "relative flex flex-col items-start rounded-2xl border p-4 text-left transition",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card",
                  )}
                >
                  <div className="mb-3 flex w-full items-start justify-between">
                    <Avatar className="size-9">
                      {c.logoUrl && <AvatarImage src={c.logoUrl} alt={c.stockName} />}
                      <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                    </Avatar>
                    {active && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm font-bold text-foreground">
                    {c.stockName}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.stockCode}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 고정 — 선택 요약 + 시작 버튼 */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
        <div className="mb-3 flex items-center justify-between rounded-xl bg-brand-surface px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">선택됨</p>
            <p className="text-sm font-bold text-foreground">
              {selected ? selected.stockName : "종목을 선택하세요"}
            </p>
          </div>
          {selected && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">지급 예정</p>
              <p className="font-numeric text-sm font-bold text-primary">{estimate}</p>
            </div>
          )}
        </div>
        <Button
          onClick={onStart}
          disabled={!selectedCode || claim.isPending}
          className="h-14 w-full text-base font-bold"
        >
          {claim.isPending ? "지급 중…" : "이 종목으로 시작하기"}
        </Button>
      </div>

      {/* 11. 지급 완료 → 자동모으기 확인 바텀시트 */}
      <Sheet
        open={!!granted}
        onOpenChange={(o) => {
          if (!o) router.replace("/home");
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8 pt-6">
          <SheetHeader className="p-0">
            <SheetTitle className="text-lg font-bold text-foreground">
              자동모으기 설정
            </SheetTitle>
            <SheetDescription>
              선택한 종목으로 자동 모으기를 시작해 보세요
            </SheetDescription>
          </SheetHeader>

          {granted && (
            <div className="mt-5 flex items-center justify-between rounded-xl bg-brand-surface px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">받은 종목</p>
                <p className="text-sm font-bold text-foreground">
                  {granted.stockName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">지급 완료</p>
                <p className="font-numeric text-sm font-bold text-primary">
                  {grantedText(granted)}
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={() =>
              granted && router.replace(tradingAutoDetailPath(granted.stockCode))
            }
            className="mt-6 h-14 w-full text-base font-bold"
          >
            자동 모으기 설정하기
          </Button>
          <button
            type="button"
            onClick={() => router.replace("/home")}
            className="mt-2 w-full py-1 text-sm text-muted-foreground"
          >
            나중에
          </button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
