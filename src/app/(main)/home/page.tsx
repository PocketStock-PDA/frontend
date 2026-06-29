"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, Landmark, Plane, Settings } from "lucide-react";
import { PointsQuickIcon } from "@/components/icons/QuickLinkIcons";
import { HomeHeader } from "@/components/common/HomeHeader";
import { CmaBalanceCard } from "@/components/features/cma/CmaBalanceCard";
import { CollectCoinsOverlay } from "@/components/features/cma/CollectCoinsOverlay";
import { PartnerPointSheet } from "@/components/features/points/PartnerPointSheet";
import { AccountLinkSheet } from "@/components/features/collect/AccountLinkSheet";
import { CardLinkSheet } from "@/components/features/collect/CardLinkSheet";
import { SectionHeader } from "@/components/common/SectionHeader";
import { StatCard } from "@/components/common/StatCard";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { WelcomeEventDialog } from "@/components/features/onboarding/WelcomeEventDialog";
import { useCmaHome, isNoCmaAccount } from "@/hooks/queries/useCmaHome";
import { useMyProfile } from "@/hooks/queries/useMyProfile";
import { useNotifications } from "@/hooks/queries/useNotifications";
import { useWelcomeRewards } from "@/hooks/queries/useWelcomeRewards";
import { useCollectSettings } from "@/hooks/queries/useCollectSettings";
import { useLinkedCards } from "@/hooks/queries/useLinkedCards";
import { useCollectChange } from "@/hooks/mutations/useCollectChange";
import {
  useHomeLayoutStore,
  useHydrateHomeLayout,
  visibleLinks,
} from "@/store/homeLayoutStore";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import type { CollectSourceType } from "@/types/domain/cma";

const SOURCE_ICON: Record<
  CollectSourceType,
  React.ComponentType<{ className?: string }>
> = {
  ACCOUNT: Landmark,
  CARD: CreditCard,
  POINT: PointsQuickIcon,
  FX: Plane,
};

const SOURCE_LABEL: Record<CollectSourceType, string> = {
  ACCOUNT: "계좌",
  CARD: "카드",
  POINT: "포인트",
  FX: "외화",
};

// 잔돈 대시보드 표시 타이틀 — ACCOUNT/CARD/POINT는 고정 라벨, FX만 기관명 그대로.
const sourceTitle = (sourceType: CollectSourceType, _name: string) => {
  if (sourceType === "ACCOUNT") return "은행 잔돈";
  if (sourceType === "CARD") return "카드 사용 잔돈";
  if (sourceType === "POINT") return "포인트";
  return _name;
};

export default function HomePage() {
  const router = useRouter();
  // 인사말 이름은 /home 응답에 없어 마이페이지 프로필(GET /api/users/me/mypage)에서 가져온다.
  const { data, isLoading, isError, error, refetch } = useCmaHome();
  const { data: profile } = useMyProfile();
  const { data: notifications } = useNotifications();
  const { data: collectSettings } = useCollectSettings();
  const { data: linkedCards } = useLinkedCards();
  const collect = useCollectChange();

  // "CMA로 모으기" 코인 모이기 연출 — 출발(수집 잔돈 블록)·도착(모으기 버튼) 영역 측정용 ref.
  const sourcesRef = useRef<HTMLDivElement>(null);
  const collectBtnRef = useRef<HTMLDivElement>(null);

  const [pointSheetOpen, setPointSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [cardSheetOpen, setCardSheetOpen] = useState(false);
  const [collectAnim, setCollectAnim] = useState<{
    id: number;
    origin: DOMRect;
    target: DOMRect;
  } | null>(null);

  const handleCollect = () => {
    if (collect.isPending) return; // 재진입 방지
    collect.mutate(undefined, {
      // 성공했을 때만 코인 모이기 연출 — 실패 요청엔 재생하지 않음
      onSuccess: () => {
        const origin = sourcesRef.current?.getBoundingClientRect();
        const target = collectBtnRef.current?.getBoundingClientRect();
        if (origin && target) {
          setCollectAnim({ id: Date.now(), origin, target });
        }
      },
    });
  };

  const linkOrder = useHomeLayoutStore((s) => s.order);
  const hiddenLinks = useHomeLayoutStore((s) => s.hidden);
  useHydrateHomeLayout();
  const quickLinks = useMemo(
    () => visibleLinks(linkOrder, hiddenLinks),
    [linkOrder, hiddenLinks],
  );

  // SOL트래블(FX)은 백엔드가 0원이면 collectSources에서 빼므로, 없으면 0원 타일로 보강.
  // 타일 위치가 바뀌지 않도록 고정 순서(계좌 → 카드 → 포인트 → 외화)로 정렬한다.
  const displayedCollectSources = useMemo(() => {
    const sources = data?.collectSources ?? [];
    const withFx = sources.some((s) => s.sourceType === "FX")
      ? sources
      : [
          ...sources,
          {
            sourceType: "FX" as const,
            name: "SOL트래블",
            amount: 0,
            currency: "USD" as const,
          },
        ];
    const order: Record<CollectSourceType, number> = {
      ACCOUNT: 0,
      CARD: 1,
      POINT: 2,
      FX: 3,
    };
    return [...withFx].sort(
      (a, b) => order[a.sourceType] - order[b.sourceType],
    );
  }, [data]);

  // 신규 회원 = CMA 계좌 미개설(/home 404). 첫 가입 이벤트 팝업을 먼저 띄운다.
  // (rewards용 localStorage dismiss와 분리 — 계좌 없으면 진입 시 매번 노출)
  // 이미 200을 받아 data가 있으면, 복귀 시 일시적 404(만료/비인증 토큰 등)로
  // 계좌개설 화면으로 뒤집히지 않게 한다. (#152)
  const noCmaAccount = isNoCmaAccount(error) && !data;
  const [eventOpen, setEventOpen] = useState(true);

  // 첫 가입 이벤트 팝업: 첫 주식 미수령(rewards 비어있음) 시 홈 진입마다 노출 (issue #84)
  // 미수령이면 localStorage dismiss 무시 — 닫아도 홈 재진입 시 다시 뜸.
  // 수령 완료 시 welcomeEligible이 false가 되어 팝업 자체가 렌더되지 않음.
  const rewardsQ = useWelcomeRewards();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const welcomeEligible =
    rewardsQ.isSuccess && (rewardsQ.data?.length ?? 0) === 0;
  const dismissWelcome = () => setWelcomeDismissed(true);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} className="h-32" />
        <SkeletonCard lines={3} className="h-48" />
      </div>
    );
  }

  // 신규 회원(계좌 없음): 첫 가입 이벤트 팝업을 먼저 띄우고, "다음으로"에서 계좌개설로.
  if (noCmaAccount) {
    return (
      <>
        <WelcomeEventDialog
          open={eventOpen}
          onOpenChange={setEventOpen}
          onProceed={() => router.push("/account/open")}
          ctaLabel="계좌 개설하러 가기"
        />
        <div className="flex min-h-[75vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            아직 계좌가 없어요
          </h2>
          <p className="text-base text-muted-foreground">
            포켓스톡 계좌를 개설하면
            <br />
            투자를 시작할 수 있어요.
          </p>
          <Button
            onClick={() => router.push("/account/open")}
            className="mt-6 h-14 w-full max-w-xs text-lg font-bold"
          >
            계좌 개설하기
          </Button>
        </div>
      </>
    );
  }

  if (isError || !data) {
    return (
      <div>
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

  // 모으기 버튼 금액: KRW·USD 별도 합계를 함께 표기.
  // 임계 판단은 표시 단위(원/센트)와 동일 기준 — 포매터(ROUND_DOWN) 출력이 0이면 노출/활성 제외
  // (예: 0<USD<0.01은 "$0.00"으로 찍히므로 "0인데 활성" 모순 방지)
  const krwLabel = formatKRW(data.totalCollectable);
  const usdLabel = formatUSD(data.totalCollectableUsd);
  const hasKrw = krwLabel !== formatKRW(0);
  const hasUsd = usdLabel !== formatUSD(0);
  const collectAmounts = [
    hasKrw ? krwLabel : null,
    hasUsd ? usdLabel : null,
  ].filter(Boolean);
  const collectAmountLabel =
    collectAmounts.length > 0 ? collectAmounts.join(" + ") : formatKRW(0);

  // 수집 가능 잔돈 표시 — 은행 | 쏠트래블(한 줄) + 포인트(마이신한/제휴사 분리, 좌우 full 한 줄).
  const accountSource = displayedCollectSources.find(
    (s) => s.sourceType === "ACCOUNT",
  );
  const fxSource = displayedCollectSources.find((s) => s.sourceType === "FX");
  const pointSources = displayedCollectSources.filter(
    (s) => s.sourceType === "POINT",
  );
  // 마이신한포인트(자사) vs 제휴사 포인트 — 기관명에 '신한' 포함 여부로 구분.
  const myShinhanTotal = pointSources
    .filter((s) => s.name.includes("신한"))
    .reduce((sum, s) => sum + s.amount, 0);
  const partnerPointTotal = pointSources
    .filter((s) => !s.name.includes("신한"))
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <>
      {collectAnim && (
        <CollectCoinsOverlay
          key={collectAnim.id}
          active
          origin={collectAnim.origin}
          target={collectAnim.target}
          onComplete={() => setCollectAnim(null)}
        />
      )}
      {welcomeEligible && (
        <WelcomeEventDialog
          open={!welcomeDismissed}
          onOpenChange={(o) => {
            if (!o) dismissWelcome();
          }}
          onProceed={() => {
            dismissWelcome();
            router.push("/reward");
          }}
          ctaLabel="종목 선택하러 가기"
        />
      )}
      <HomeHeader
        userName={profile?.name ?? "회원"}
        onBellClick={() => router.push("/notifications")}
        unreadCount={notifications?.unreadCount ?? 0}
      />
      <div className="space-y-3">
        {/* TODO: usdToKrwRate는 환율 API 연동 시 전달(펼침 시 'N원 기준' 표기) */}
        <CmaBalanceCard
          accountNo={data.cmaAccountNo}
          krwBalance={data.cmaBalance.KRW}
          usdBalance={data.cmaBalance.USD}
          interestRate={data.interestRate}
          todayInterest={data.todayInterest}
        />

        {/* 잔돈 수집 통합 블록 — 수집 내역 · 수집 가능 · 모으기 버튼 한 덩어리 */}
        <div ref={sourcesRef} className="rounded-2xl bg-brand-surface p-4">
          <SectionHeader title="수집한 잔돈" />

          {/* 이번 달 수집한 잔돈 — 카드 행은 연결 여부 무관하게 항상 표시 */}
          {(() => {
            // 라운드업 카드 등록 여부: collect/settings의 CARD+enabled → cards 목록에서 cardId 매칭
            const activeCardSetting = collectSettings?.find(
              (s) => s.sourceType === "CARD" && s.enabled,
            );
            const linkedCard = activeCardSetting
              ? linkedCards?.find(
                  (c) => c.cardId === activeCardSetting.sourceRefId,
                )
              : undefined;
            const collectedCard = data.collectedSources.find(
              (s) => s.sourceType === "CARD",
            );
            const nonCardSources = data.collectedSources.filter(
              (s) => s.sourceType !== "CARD",
            );
            return (
              <div className="mb-4 space-y-2">
                {/* 카드 행 — 연결 여부 무관하게 항상 표시 */}
                {linkedCard ? (
                  <div className="relative flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <svg
                      className="size-6 shrink-0"
                      viewBox="6 8 24 20"
                      fill="none"
                    >
                      <rect
                        x="9.5"
                        y="11"
                        width="21"
                        height="13.5"
                        rx="2.6"
                        fill="#3f7bff"
                      />
                      <rect
                        x="9.5"
                        y="14"
                        width="21"
                        height="2.6"
                        fill="#2a62e0"
                      />
                      <rect
                        x="12.5"
                        y="20"
                        width="6"
                        height="2"
                        rx="1"
                        fill="#fff"
                        fillOpacity="0.85"
                      />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        카드 사용 잔돈
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {linkedCard.cardName}
                      </p>
                    </div>
                    <AmountDisplay
                      value={collectedCard?.amount ?? 0}
                      currency="KRW"
                      size="md"
                      className="shrink-0 font-bold"
                    />
                    <button
                      type="button"
                      aria-label="연동 카드 변경"
                      onClick={() => setCardSheetOpen(true)}
                      className="absolute right-1.5 top-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Settings className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <svg
                      className="size-6 shrink-0"
                      viewBox="6 8 24 20"
                      fill="none"
                    >
                      <rect
                        x="9.5"
                        y="11"
                        width="21"
                        height="13.5"
                        rx="2.6"
                        fill="#3f7bff"
                      />
                      <rect
                        x="9.5"
                        y="14"
                        width="21"
                        height="2.6"
                        fill="#2a62e0"
                      />
                      <rect
                        x="12.5"
                        y="20"
                        width="6"
                        height="2"
                        rx="1"
                        fill="#fff"
                        fillOpacity="0.85"
                      />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        카드 잔돈
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        카드를 연결하면 잔돈을 적립할 수 있어요
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCardSheetOpen(true)}
                      className="shrink-0 text-xs font-semibold text-primary"
                    >
                      카드 연결
                    </button>
                  </div>
                )}

                {/* 카드 외 소스 */}
                {nonCardSources.map((s) => {
                  const Icon = SOURCE_ICON[s.sourceType];
                  return (
                    <StatCard
                      key={`collected-${s.sourceType}-${s.name}`}
                      orientation="row"
                      icon={<Icon className="size-4" />}
                      title={sourceTitle(s.sourceType, s.name)}
                      subtitle={SOURCE_LABEL[s.sourceType]}
                      value={
                        <AmountDisplay
                          value={s.amount}
                          currency={s.currency}
                          size="md"
                          className="font-bold"
                        />
                      }
                    />
                  );
                })}
              </div>
            );
          })()}

          <p className="mb-2 text-sm font-medium text-muted-foreground">
            수집 가능한 잔돈
          </p>
          {/* 은행 잔돈 · 쏠트래블 · 포인트 — C안: 카드 안 아이콘↑ 라벨 금액↓ */}
          <div className="grid grid-cols-3 gap-2">
            {accountSource && (
              <div className="relative flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-3 text-center">
                <span className="flex size-10 items-center justify-center text-primary">
                  <Landmark className="size-7" />
                </span>
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-[11px] text-muted-foreground">은행 잔돈</p>
                  <AmountDisplay
                    value={accountSource.amount}
                    currency={accountSource.currency}
                    size="sm"
                    className="font-bold"
                  />
                </div>
                <button
                  type="button"
                  aria-label="수집 계좌 설정"
                  onClick={() => setAccountSheetOpen(true)}
                  className="absolute right-1.5 top-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Settings className="size-3.5" />
                </button>
              </div>
            )}
            {fxSource && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-3 text-center">
                <span className="flex size-10 items-center justify-center text-primary">
                  <Plane className="size-7" />
                </span>
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-[11px] text-muted-foreground">SOL트래블</p>
                  <AmountDisplay
                    value={fxSource.amount}
                    currency={fxSource.currency}
                    size="sm"
                    className="font-bold"
                  />
                </div>
              </div>
            )}
            {/* 포인트 — 마이신한+제휴사. 탭하면 제휴사 연동 팝업 */}
            <button
              type="button"
              onClick={() => setPointSheetOpen(true)}
              className="relative flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3"
            >
              <span className="flex size-10 items-center justify-center text-primary">
                <PointsQuickIcon className="size-7" />
              </span>
              <div className="w-full space-y-1.5 px-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    마이신한
                  </span>
                  <span className="font-numeric text-xs font-bold tabular-nums text-foreground">
                    {myShinhanTotal.toLocaleString()}P
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-border/60 pt-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    제휴
                  </span>
                  <span className="font-numeric text-xs font-bold tabular-nums text-foreground">
                    {partnerPointTotal.toLocaleString()}P
                  </span>
                </div>
              </div>
              <Settings className="absolute right-1.5 top-1.5 size-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* 모으기 버튼 — 수집 블록 안에서 자연스럽게 연결 */}
          <div ref={collectBtnRef} className="mt-4">
            <Button
              variant="outline"
              onClick={handleCollect}
              disabled={(!hasKrw && !hasUsd) || collect.isPending}
              className="h-12 w-full justify-between border-primary px-4 text-primary hover:bg-white/60 dark:hover:bg-primary/10"
            >
              <span className="text-base font-bold">CMA로 모으기</span>
              <span className="font-numeric text-sm font-semibold tabular-nums opacity-75">
                {collectAmountLabel}
              </span>
            </Button>
          </div>
          {collect.isError && (
            <p className="mt-2 text-center text-xs text-destructive">
              모으기에 실패했어요. 잠시 후 다시 시도해 주세요.
            </p>
          )}
        </div>

        <PartnerPointSheet
          open={pointSheetOpen}
          onOpenChange={setPointSheetOpen}
        />
        <AccountLinkSheet
          open={accountSheetOpen}
          onOpenChange={setAccountSheetOpen}
        />
        <CardLinkSheet open={cardSheetOpen} onOpenChange={setCardSheetOpen} />

        {/* 바로가기 (홈화면 편집에서 순서/표시 변경) */}
        <section className="mt-2">
          <div className="mb-3 px-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              바로가기
            </p>
            <Link
              href="/home/edit"
              className="text-xs font-medium text-muted-foreground transition-colors underline hover:text-foreground"
            >
              편집
            </Link>
          </div>
          {quickLinks.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              바로가기를 추가해 보세요
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-y-5">
              {quickLinks.map(({ id, label, icon: Icon, href }) => (
                <Link
                  key={id}
                  href={href}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border">
                    <Icon className="size-7" />
                  </span>
                  <span className="whitespace-nowrap text-xs text-foreground">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
