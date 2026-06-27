"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useWelcomeRewardCandidates,
  useWelcomeRewards,
} from "@/hooks/queries/useWelcomeRewards";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useClaimWelcomeReward } from "@/hooks/mutations/useClaimWelcomeReward";
import { toDecimal } from "@/lib/utils/decimal";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { tradingAutoDetailPath } from "@/lib/navigation/routes";
import type { WelcomeReward, WelcomeRewardCandidate } from "@/types/domain/reward";

/** 지급 예산(원) — 백엔드 BUDGET_KRW와 동일 */
const BUDGET_KRW = 1000;

/** 단일 퍼즐 조각(시그니처 "조각 모으기") — lucide Puzzle path */
const PUZZLE_PATH =
  "M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.526-.967 1.02Z";

/** 받을 양 — KRW만 가격으로 "1,000원 → 약 N주" 추정, 해외(가격 null)는 금액만 */
function estimateText(currency: string | undefined, price: number | undefined) {
  if (currency === "KRW" && price && price > 0) {
    const qty = toDecimal(BUDGET_KRW).div(price).toDecimalPlaces(4).toString();
    return `${formatKRW(BUDGET_KRW)} → 약 ${qty}주`;
  }
  return `${formatKRW(BUDGET_KRW)}어치`;
}

/** 지급 결과(실제 수량) → "N주" */
function grantedShares(reward: WelcomeReward) {
  return `${toDecimal(reward.quantity).toDecimalPlaces(4).toString()}주`;
}

/**
 * 온보딩 4 — 첫 주식 지급(웰컴 보상) 종목 선택 (#36).
 * 자산연동 완료 후 홈 팝업에서 진입 → 국내/해외 거래대금 상위 중 1종목 선택·지급 → 자동모으기 유도.
 */
export default function RewardPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const candidatesQ = useWelcomeRewardCandidates();
  const rewardsQ = useWelcomeRewards();
  const claim = useClaimWelcomeReward();

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  // 지급 완료 → 딜라이트(조각 모임) 오버레이
  const [granted, setGranted] = useState<WelcomeReward | null>(null);

  const candidates = candidatesQ.data ?? [];
  const codes = candidates.map((c) => c.stockCode);
  // 후보별 현재가(받을 양 추정용). 해외는 price=null(백엔드 명세)
  const details = useStockDetails(codes);
  // 현재가 변동만 메모 재계산 트리거로 — 의존성은 단순 문자열로 추출.
  const priceSig = details.map((d) => d.data?.price?.currentPrice).join(",");

  const estByCode = useMemo(() => {
    const m = new Map<string, string>();
    candidates.forEach((c, i) => {
      m.set(
        c.stockCode,
        estimateText(c.currency, details[i]?.data?.price?.currentPrice),
      );
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, priceSig]);

  // 국내(KRW) / 해외(USD)로 분리 — 각 거래대금 상위
  const kr = candidates.filter((c) => c.currency !== "USD");
  const ov = candidates.filter((c) => c.currency === "USD");

  const selected = candidates.find((c) => c.stockCode === selectedCode) ?? null;

  const alreadyClaimed = rewardsQ.isSuccess && (rewardsQ.data?.length ?? 0) > 0;

  const onClaim = () => {
    if (!selectedCode || claim.isPending) return;
    claim.mutate(selectedCode, {
      onSuccess: (reward) => setGranted(reward),
      onError: (e) => {
        const msg =
          e instanceof ApiError
            ? e.message
            : "지급에 실패했어요. 잠시 후 다시 시도해 주세요.";
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
      <div className="space-y-4 pt-6">
        <SkeletonCard lines={2} className="h-24" />
        <SkeletonCard lines={2} className="h-32" />
        <SkeletonCard lines={2} className="h-32" />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => candidatesQ.refetch()}
            >
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-44 pt-6">
      <div className="flex-1">
        {/* 헤더 */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-surface px-3 py-1.5 text-[12.5px] font-bold text-accent-foreground">
          <Gift className="size-3.5" />첫 가입 선물
        </span>
        <h1 className="mt-3.5 text-2xl font-bold leading-snug text-foreground">
          어떤 주식을
          <br />
          <span className="text-primary">모아볼까요?</span>
        </h1>

        {/* 선물 배너 */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-brand-surface p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Gift className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">
              고른 종목을 무료로 드려요
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              받은 조각으로 잔돈 자동 모으기를 시작해요
            </p>
          </div>
        </div>

        {/* 시장별 그룹 카드 */}
        {candidates.length === 0 ? (
          <EmptyState className="mt-6" title="추천 종목이 없어요" />
        ) : (
          <div className="mt-6 space-y-4">
            {kr.length > 0 && (
              <MarketCard
                title="국내 · 거래대금 상위"
                items={kr}
                estByCode={estByCode}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
                reduce={!!reduce}
              />
            )}
            {ov.length > 0 && (
              <MarketCard
                title="해외 · 거래대금 상위"
                items={ov}
                estByCode={estByCode}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
                reduce={!!reduce}
              />
            )}
          </div>
        )}
      </div>

      {/* 하단 고정 — 선택 요약 + 받기 */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] border-t bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between rounded-xl bg-brand-surface px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              선택한 종목
            </p>
            <p
              className={cn(
                "mt-0.5 truncate text-sm font-bold",
                selected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {selected ? selected.stockName : "종목을 선택하세요"}
            </p>
          </div>
          {selected && (
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium text-muted-foreground">받을 양</p>
              <p className="font-numeric text-sm font-bold text-primary">
                {estByCode.get(selected.stockCode)}
              </p>
            </div>
          )}
        </div>
        <Button
          onClick={onClaim}
          disabled={!selectedCode || claim.isPending}
          className="h-14 w-full text-base font-bold"
        >
          {claim.isPending ? "지급 중…" : "이 종목으로 받기"}
        </Button>
      </div>

      {/* 지급 완료 → 조각이 모이는 딜라이트 */}
      {granted && (
        <GrantedOverlay
          reward={granted}
          reduce={!!reduce}
          onAuto={() => router.replace(tradingAutoDetailPath(granted.stockCode))}
          onLater={() => router.replace("/home")}
        />
      )}
    </div>
  );
}

/** 시장 그룹 카드 — 헤더 + 종목 행(divide-y). 중첩 카드 아님(행은 테두리 없는 리스트). */
function MarketCard({
  title,
  items,
  estByCode,
  selectedCode,
  onSelect,
  reduce,
}: {
  title: string;
  items: WelcomeRewardCandidate[];
  estByCode: Map<string, string>;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  reduce: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <p className="px-4 pb-2.5 pt-3.5 text-[13px] font-bold text-foreground">
        {title}
      </p>
      <div className="divide-y divide-border border-t border-border">
        {items.map((c, i) => (
          <CandidateRow
            key={c.stockCode}
            candidate={c}
            rank={i + 1}
            est={estByCode.get(c.stockCode) ?? ""}
            active={c.stockCode === selectedCode}
            onSelect={() => onSelect(c.stockCode)}
            reduce={reduce}
          />
        ))}
      </div>
    </section>
  );
}

/** 종목 행 — 로고(+순위 메달) · 이름 · 받을 양 · 첫 조각 퍼즐 selector */
function CandidateRow({
  candidate: c,
  rank,
  est,
  active,
  onSelect,
  reduce,
}: {
  candidate: WelcomeRewardCandidate;
  rank: number;
  est: string;
  active: boolean;
  onSelect: () => void;
  reduce: boolean;
}) {
  const initial = c.stockName.trim().charAt(0).toUpperCase();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active && "bg-primary/5",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="size-10">
          {c.logoUrl && <AvatarImage src={c.logoUrl} alt="" />}
          <AvatarFallback className="text-sm">{initial}</AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1.5 rounded-full border-[1.5px] border-card bg-brand-surface px-1.5 py-0.5 text-[9px] font-bold leading-none text-accent-foreground">
          {rank}위
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-foreground">
          {c.stockName}
        </p>
        <p className="font-numeric text-xs font-medium text-muted-foreground">
          {est}
        </p>
      </div>

      <motion.span
        className="shrink-0"
        animate={{ scale: reduce ? 1 : active ? [0.6, 1.1, 1] : 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.32, ease: "easeOut" }}
      >
        <svg viewBox="0 0 24 24" className="size-7">
          <path
            d={PUZZLE_PATH}
            strokeWidth={1.6}
            className={cn(
              "transition-[fill,stroke] duration-200",
              active
                ? "fill-primary stroke-primary"
                : "fill-none stroke-muted-foreground/30",
            )}
          />
        </svg>
      </motion.span>
    </button>
  );
}

/** 지급 완료 딜라이트 — 로고에 조각이 톡 끼워지고(스프링) 글린트 한 번 */
function GrantedOverlay({
  reward,
  reduce,
  onAuto,
  onLater,
}: {
  reward: WelcomeReward;
  reduce: boolean;
  onAuto: () => void;
  onLater: () => void;
}) {
  const initial = reward.stockName.trim().charAt(0).toUpperCase();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="relative mb-6 size-24">
        <div className="absolute inset-0 m-auto flex size-[72px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
          {initial}
        </div>
        <motion.span
          className="absolute -bottom-0.5 -right-0.5 block size-12"
          initial={reduce ? false : { scale: 0.4 }}
          animate={{ scale: 1 }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 520, damping: 17, mass: 0.6, delay: 0.12 }
          }
        >
          <svg viewBox="0 0 24 24" className="size-12">
            <path d={PUZZLE_PATH} className="fill-primary stroke-primary" strokeWidth={1.6} />
            {!reduce && (
              <motion.path
                d={PUZZLE_PATH}
                className="fill-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.85, 0] }}
                transition={{ delay: 0.32, duration: 0.6, ease: "easeOut", times: [0, 0.35, 1] }}
              />
            )}
          </svg>
        </motion.span>
      </div>

      <h2 className="text-xl font-bold leading-snug text-foreground">
        {reward.stockName}{" "}
        <span className="font-numeric text-primary">{grantedShares(reward)}</span>가
        <br />
        모였어요
      </h2>
      <p className="mt-2.5 text-sm text-muted-foreground">
        이제 잔돈이 쌓이면 자동으로 모아드려요
      </p>

      <div className="mt-7 w-full max-w-[320px]">
        <Button onClick={onAuto} className="h-14 w-full text-base font-bold">
          자동 모으기 시작하기
        </Button>
        <Button
          variant="ghost"
          onClick={onLater}
          className="mt-2 h-11 w-full font-normal text-muted-foreground"
        >
          나중에
        </Button>
      </div>
    </motion.div>
  );
}
