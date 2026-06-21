"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowUp,
  BookText,
  Coins,
  CreditCard,
  Landmark,
  PieChart,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { HomeHeader } from "@/components/common/HomeHeader";
import { BalanceCard } from "@/components/common/BalanceCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { StatCard } from "@/components/common/StatCard";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import { useCollectChange } from "@/hooks/mutations/useCollectChange";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { CollectSourceType, Currency } from "@/types/domain/cma";

const SOURCE_ICON: Record<
  CollectSourceType,
  React.ComponentType<{ className?: string }>
> = {
  ACCOUNT: Landmark,
  CARD: CreditCard,
  POINT: Coins,
};

const SOURCE_LABEL: Record<CollectSourceType, string> = {
  ACCOUNT: "계좌",
  CARD: "카드",
  POINT: "포인트",
};

interface QuickLink {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  highlight?: boolean;
}

// TODO: 라우트 일부 미확정 — 사용자 지정 대기 중 (#)
const QUICK_LINKS: QuickLink[] = [
  { label: "주식 모으기", icon: TrendingUp, href: "#", highlight: true },
  { label: "환전", icon: ArrowLeftRight, href: "/exchange" },
  { label: "가계부", icon: BookText, href: "/budget" },
  { label: "포트폴리오", icon: PieChart, href: "/portfolio" },
  { label: "자산", icon: Wallet, href: "/asset" },
  { label: "적립식 설정", icon: Settings, href: "/trading/auto" },
  { label: "거래 내역", icon: Receipt, href: "#" },
  { label: "포인트", icon: Coins, href: "#" },
];

export default function HomePage() {
  // TODO: 인사말 이름은 사용자 프로필 API 연동 시 교체 (/home 응답엔 없음)
  const [currency, setCurrency] = useState<Currency>("KRW");
  const { data, isLoading, isError, refetch } = useCmaHome();
  const collect = useCollectChange();

  if (isLoading) {
    return (
      <div className="space-y-4 pt-6">
        <SkeletonCard lines={2} className="h-32" />
        <SkeletonCard lines={3} className="h-48" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="pt-6">
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  const ratePct = Number((data.interestRate * 100).toFixed(2));

  return (
    <>
      <HomeHeader
        userName="회원"
        currency={currency}
        onCurrencyChange={setCurrency}
      />
      <div className="space-y-4 pb-6 pt-3">
        <BalanceCard
          label="포켓스톡 CMA"
          amount={data.cmaBalance[currency]}
          currency={currency}
          caption={`연 ${ratePct}% · 오늘 이자 +${data.todayInterest.toLocaleString("ko-KR")}원`}
          actionLabel="상세보기"
        />

        {/* 수집 잔돈 통합 블록 */}
        <div className="rounded-2xl bg-brand-surface p-4">
          <SectionHeader
            className="mb-2"
            title="수집한 잔돈"
            action={
              <span className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
                총
                <AmountDisplay
                  value={data.collectedToday}
                  size="sm"
                  className="font-bold text-primary"
                />
              </span>
            }
          />
          {/* TODO: 카드 사용 잔돈 등 수집 내역 상세 — /home 응답에 없음, 백엔드 확정 후 추가 */}

          <p className="mb-2 mt-4 text-[13px] font-medium text-muted-foreground">
            수집 가능한 잔돈
          </p>
          {data.collectSources.length === 0 ? (
            <EmptyState title="수집 가능한 잔돈이 없어요" />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {data.collectSources.map((s) => {
                const Icon = SOURCE_ICON[s.sourceType];
                return (
                  <StatCard
                    key={`${s.sourceType}-${s.name}`}
                    orientation="tile"
                    icon={<Icon className="size-4" />}
                    title={s.name}
                    subtitle={SOURCE_LABEL[s.sourceType]}
                    value={
                      <AmountDisplay value={s.amount} size="sm" className="font-bold" />
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          onClick={() => collect.mutate()}
          disabled={data.totalCollectable <= 0 || collect.isPending}
          className="h-12 w-full border-primary text-base font-bold text-primary hover:bg-brand-surface"
        >
          <ArrowUp />
          {formatKRW(data.totalCollectable)} CMA로 모으기
        </Button>

        <Separator />

        {/* 바로가기 */}
        <section>
          <p className="mb-3 text-[13px] font-medium text-muted-foreground">
            바로가기
          </p>
          <div className="flex flex-wrap justify-between gap-y-5">
            {QUICK_LINKS.map(({ label, icon: Icon, href, highlight }) => (
              <Link
                key={label}
                href={href}
                className="flex w-[5.25rem] flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    "flex size-14 items-center justify-center rounded-2xl",
                    highlight
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-foreground",
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <span className="whitespace-nowrap text-xs text-foreground">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
