"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, Landmark, Plane, Settings } from "lucide-react";
import { PointsQuickIcon } from "@/components/icons/QuickLinkIcons";
import { HomeHeader } from "@/components/common/HomeHeader";
import { CmaBalanceCard } from "@/components/features/cma/CmaBalanceCard";
import { CollectCoinsOverlay } from "@/components/features/cma/CollectCoinsOverlay";
import { DragCoinOverlay } from "@/components/features/cma/DragCoinOverlay";
import { PartnerPointSheet } from "@/components/features/points/PartnerPointSheet";
import { AccountLinkSheet } from "@/components/features/collect/AccountLinkSheet";
import { CardLinkSheet } from "@/components/features/collect/CardLinkSheet";
import { FxLinkSheet } from "@/components/features/collect/FxLinkSheet";
import { SectionHeader } from "@/components/common/SectionHeader";
import { StatCard } from "@/components/common/StatCard";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { CollectSlider } from "@/components/features/cma/CollectSlider";
import { WelcomeEventDialog } from "@/components/features/onboarding/WelcomeEventDialog";
import { RewardCollectCompleteSheet } from "@/components/features/onboarding/RewardCollectCompleteSheet";
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

function CardSvgIcon() {
  return (
    <svg className="size-6 shrink-0" viewBox="6 8 24 20" fill="none">
      <rect x="9.5" y="11" width="21" height="13.5" rx="2.6" fill="#3f7bff" />
      <rect x="9.5" y="14" width="21" height="2.6" fill="#2a62e0" />
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
  );
}

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

  // 웰컴 보상 직후 진입 시 URL 정리 + 플래그 캡처
  // useState lazy initializer는 SSR에서 window 없이 false로 굳어버리므로 useRef+effect 패턴 사용
  const isFromRewardRef = useRef(false);
  useEffect(() => {
    if (window.location.search.includes("from=reward")) {
      isFromRewardRef.current = true;
      window.history.replaceState({}, "", "/home");
    }
  }, []);
  const { data: profile } = useMyProfile();
  const { data: notifications } = useNotifications();
  const { data: collectSettings } = useCollectSettings();
  const { data: linkedCards } = useLinkedCards();
  const collect = useCollectChange();

  // "CMA로 모으기" 코인 모이기 연출 — 출발(수집 잔돈 블록)·도착(모으기 버튼) 영역 측정용 ref.
  const sourcesRef = useRef<HTMLDivElement>(null);
  const collectBtnRef = useRef<HTMLDivElement>(null);

  // 드래그 중 파티클
  const dragPctRef = useRef(0);
  const [dragOverlay, setDragOverlay] = useState<{
    emitting: boolean;
    origins: DOMRect[];
    target: DOMRect;
  } | null>(null);
  const drainTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // 수집 가능한 잔돈 3개 타일 ref — 코인이 각 타일에서 출발
  const accountTileRef = useRef<HTMLDivElement>(null);
  const fxTileRef = useRef<HTMLDivElement>(null);
  const pointTileRef = useRef<HTMLDivElement>(null);
  const [drainPct, setDrainPct] = useState(0);
  const lastDrainRef = useRef(0);

  const [rewardCollectOpen, setRewardCollectOpen] = useState(false);
  const rewardShownRef = useRef(false);
  // 코인 애니메이션 완료 여부 — API 성공과 AND 조건으로 팝업 트리거
  const [collectAnimDone, setCollectAnimDone] = useState(false);
  const [sliderResetKey, setSliderResetKey] = useState(0);

  // 코인 애니 종료 + collect 성공 둘 다 충족 시 450ms 텀 두고 팝업
  useEffect(() => {
    if (
      !collectAnimDone ||
      !collect.isSuccess ||
      !isFromRewardRef.current ||
      rewardShownRef.current
    ) return;
    rewardShownRef.current = true;
    const t = setTimeout(() => setRewardCollectOpen(true), 120);
    return () => clearTimeout(t);
  }, [collectAnimDone, collect.isSuccess]);

  const [pointSheetOpen, setPointSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [cardSheetOpen, setCardSheetOpen] = useState(false);
  const [fxSheetOpen, setFxSheetOpen] = useState(false);
  // 수집 소스 "수정 모드" — 기어 1개로 진입, 각 타일에서 시트를 열어 설정한다.
  const [editCollect, setEditCollect] = useState(false);
  const [collectAnim, setCollectAnim] = useState<{
    id: number;
    origin: DOMRect;
    target: DOMRect;
  } | null>(null);

  // 모으기 완료 시 CMA 잔액 카운트업
  const prevKrwBalanceRef = useRef(0);
  const [collectAnimPct, setCollectAnimPct] = useState(0);

  useEffect(() => {
    if (!collectAnim) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollectAnimPct(0);
      return;
    }
    const DURATION = 3000;
    const startTime = performance.now() + 120;
    let rafId: number;
    const tick = (now: number) => {
      const raw = Math.min(1, Math.max(0, now - startTime) / DURATION);
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2; // ease-in-out quad
      setCollectAnimPct(eased);
      if (raw < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [collectAnim]);

  const handleDragStart = () => {
    const origins = [accountTileRef, fxTileRef, pointTileRef]
      .map((r) => r.current?.getBoundingClientRect())
      .filter((r): r is DOMRect => !!r);
    const target = collectBtnRef.current?.getBoundingClientRect();
    if (!origins.length || !target) return;
    clearTimeout(drainTimerRef.current);
    setDragOverlay({ emitting: true, origins, target });
  };

  const handleDragEnd = () => {
    const currentPct = dragPctRef.current;
    if (currentPct >= 0.82) {
      // 슬라이드 성공: DragCoinOverlay 즉시 제거 → CollectCoinsOverlay가 이어받음
      clearTimeout(drainTimerRef.current);
      setDragOverlay(null);
      drainTimerRef.current = setTimeout(() => setDrainPct(0), 900);
    } else {
      // 슬라이드 취소: 파티클 자연 소멸 후 언마운트, 숫자 즉시 원복
      setDragOverlay((prev) => (prev ? { ...prev, emitting: false } : null));
      setDrainPct(0);
      drainTimerRef.current = setTimeout(() => setDragOverlay(null), 900);
    }
  };

  const handleProgress = (pct: number) => {
    dragPctRef.current = pct;
    const now = Date.now();
    if (now - lastDrainRef.current > 48) {
      // ~20fps
      lastDrainRef.current = now;
      setDrainPct(pct);
    }
  };

  const handleCollect = () => {
    if (collect.isPending) return; // 재진입 방지
    prevKrwBalanceRef.current = data?.cmaBalance?.KRW ?? 0;
    setCollectAnimDone(false);
    // 슬라이드 완료 즉시 코인 버스트 연출 — API 응답 기다리지 않음
    const origin = sourcesRef.current?.getBoundingClientRect();
    const target = collectBtnRef.current?.getBoundingClientRect();
    if (origin && target) {
      setCollectAnim({ id: Date.now(), origin, target });
    }
    collect.mutate();
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
      <>
        <HomeHeader
          userName={profile?.name ?? ""}
          onBellClick={() => router.push("/notifications")}
          unreadCount={notifications?.unreadCount ?? 0}
        />
        <div className="space-y-4">
          <SkeletonCard lines={2} className="h-32" />
          <SkeletonCard lines={3} className="h-48" />
        </div>
      </>
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
      <>
        <HomeHeader
          userName={profile?.name ?? ""}
          onBellClick={() => router.push("/notifications")}
          unreadCount={notifications?.unreadCount ?? 0}
        />
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          }
        />
      </>
    );
  }

  // 모으기 버튼 금액: KRW·USD 별도 합계를 함께 표기.
  // 임계 판단은 표시 단위(원/센트)와 동일 기준 — 포매터(ROUND_DOWN) 출력이 0이면 노출/활성 제외
  // (예: 0<USD<0.01은 "$0.00"으로 찍히므로 "0인데 활성" 모순 방지)
  // 코인 애니메이션 중 CMA 잔액 카운트업 — 스냅샷(prev) + 수집액 × 진행률
  // eslint-disable-next-line react-hooks/refs
  const prevKrwBalance = prevKrwBalanceRef.current;
  const displayKrwBalance = collectAnim
    ? Math.round(prevKrwBalance + data.totalCollectable * collectAnimPct)
    : data.cmaBalance.KRW;

  const krwLabel = formatKRW(data.totalCollectable);
  const usdLabel = formatUSD(data.totalCollectableUsd);
  const hasKrw = krwLabel !== formatKRW(0);
  const hasUsd = usdLabel !== formatUSD(0);
  const collectAmounts = [
    hasKrw ? krwLabel : null,
    hasUsd ? usdLabel : null,
  ].filter(Boolean);
  const collectAmountLabel =
    collectAmounts.length > 0 ? collectAmounts.join(" + ") : "";

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

  // 모을 게 있는(0원 아닌) 소스만 활성(색칠), 나머지는 흐리게
  const accountActive = (accountSource?.amount ?? 0) > 0;
  const fxActive = (fxSource?.amount ?? 0) > 0;
  const pointActive = myShinhanTotal + partnerPointTotal > 0;

  // 드래그 진행 시 금액 카운트다운 — drainPct 0(원본)→1(0원)
  const drainFactor = 1 - drainPct;
  const drainedAccountAmount = accountSource
    ? Math.round(accountSource.amount * drainFactor)
    : 0;
  const drainedFxAmount = fxSource ? fxSource.amount * drainFactor : 0;
  const drainedMyShinhan = Math.round(myShinhanTotal * drainFactor);
  const drainedPartner = Math.round(partnerPointTotal * drainFactor);

  return (
    <>
      {dragOverlay && (
        <DragCoinOverlay
          emitting={dragOverlay.emitting}
          pctRef={dragPctRef}
          origins={dragOverlay.origins}
          target={dragOverlay.target}
        />
      )}
      {collectAnim && (
        <CollectCoinsOverlay
          key={collectAnim.id}
          active
          origin={collectAnim.origin}
          target={collectAnim.target}
          onComplete={() => {
            setCollectAnim(null);
            setCollectAnimDone(true);
            setSliderResetKey((k) => k + 1);
          }}
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
          krwBalance={displayKrwBalance}
          usdBalance={data.cmaBalance.USD}
          interestRate={data.interestRate}
          todayInterest={data.todayInterest}
        />

        {/* 잔돈 수집 통합 블록 — 수집 내역 · 수집 가능 · 모으기 버튼 한 덩어리 */}
        <div ref={sourcesRef} className="rounded-2xl bg-brand-surface p-4">
          <SectionHeader
            title="수집한 잔돈"
            action={
              <button
                type="button"
                aria-label={editCollect ? "수집 설정 완료" : "수집 설정"}
                onClick={() => setEditCollect((v) => !v)}
                className={
                  editCollect
                    ? "rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-primary"
                    : "rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {editCollect ? "완료" : <Settings className="size-4" />}
              </button>
            }
          />

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
                    <CardSvgIcon />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        카드 사용 잔돈
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          등록
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {linkedCard.cardName}
                        </span>
                      </div>
                    </div>
                    <AmountDisplay
                      value={collectedCard?.amount ?? 0}
                      currency="KRW"
                      size="md"
                      className="shrink-0 font-bold"
                    />
                    <button
                      type="button"
                      aria-label="잔돈 적립 카드 설정"
                      onClick={() => setCardSheetOpen(true)}
                      tabIndex={editCollect ? undefined : -1}
                      className={`absolute -right-2 -top-2 origin-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-md transition-[transform,opacity] duration-150 ${editCollect ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"}`}
                    >
                      설정
                    </button>
                  </div>
                ) : (
                  <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <CardSvgIcon />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        카드 사용 잔돈
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
              <div
                ref={accountTileRef}
                className={`relative flex flex-col items-center gap-2 rounded-xl border border-border px-2 py-3 text-center transition-[filter,opacity] ${accountActive ? "bg-card" : "grayscale opacity-75 bg-muted/40"}`}
              >
                <span className="flex size-10 items-center justify-center text-primary">
                  <Landmark className="size-7" />
                </span>
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-[11px] text-muted-foreground">은행 잔돈</p>
                  <AmountDisplay
                    value={drainedAccountAmount}
                    currency={accountSource.currency}
                    size="sm"
                    className="font-bold"
                  />
                </div>
                <button
                  type="button"
                  aria-label="은행 잔돈 설정"
                  onClick={() => setAccountSheetOpen(true)}
                  tabIndex={editCollect ? undefined : -1}
                  className={`absolute -right-2 -top-2 origin-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-md transition-[transform,opacity] duration-150 ${editCollect ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"}`}
                >
                  설정
                </button>
              </div>
            )}
            {fxSource && (
              <div
                ref={fxTileRef}
                className={`relative flex flex-col items-center gap-2 rounded-xl border border-border px-2 py-3 text-center transition-[filter,opacity] ${fxActive ? "bg-card" : "grayscale opacity-75 bg-muted/40"}`}
              >
                <span className="flex size-10 items-center justify-center text-primary">
                  <Plane className="size-7" />
                </span>
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-[11px] text-muted-foreground">SOL트래블</p>
                  <AmountDisplay
                    value={drainedFxAmount}
                    currency={fxSource.currency}
                    size="sm"
                    className="font-bold"
                  />
                </div>
                <button
                  type="button"
                  aria-label="SOL트래블 모으기 설정"
                  onClick={() => setFxSheetOpen(true)}
                  tabIndex={editCollect ? undefined : -1}
                  className={`absolute -right-2 -top-2 origin-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-md transition-[transform,opacity] duration-150 ${editCollect ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"}`}
                >
                  설정
                </button>
              </div>
            )}
            {/* 포인트 — 마이신한포인트 / 금액 / 제휴 / 금액 세로 스택 */}
            <div
              ref={pointTileRef}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl border border-border px-2 py-3 text-center transition-[filter,opacity] ${pointActive ? "bg-card" : "grayscale opacity-75 bg-muted/40"}`}
            >
              <span className="flex size-10 items-center justify-center text-primary">
                <PointsQuickIcon className="size-7" />
              </span>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground">
                  마이신한포인트
                </span>
                <span className="font-numeric text-xs font-bold tabular-nums text-foreground">
                  {drainedMyShinhan.toLocaleString()}P
                </span>
                <span className="mt-1 text-[10px] text-muted-foreground">
                  제휴
                </span>
                <span className="font-numeric text-xs font-bold tabular-nums text-foreground">
                  {drainedPartner.toLocaleString()}P
                </span>
              </div>
              <button
                type="button"
                aria-label="포인트 설정"
                onClick={() => setPointSheetOpen(true)}
                tabIndex={editCollect ? undefined : -1}
                className={`absolute -right-2 -top-2 origin-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-md transition-[transform,opacity] duration-150 ${editCollect ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"}`}
              >
                설정
              </button>
            </div>
          </div>

          {/* 모으기 버튼 — 수집 블록 안에서 자연스럽게 연결 */}
          <div ref={collectBtnRef} className="mt-4">
            <CollectSlider
              onCollect={handleCollect}
              disabled={!hasKrw && !hasUsd}
              amountLabel={collectAmountLabel}
              isPending={collect.isPending}
              isError={collect.isError}
              resetTrigger={sliderResetKey}
              guideEnabled={!welcomeEligible || welcomeDismissed}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onProgress={handleProgress}
            />
          </div>
          {collect.isError && (
            <p
              role="alert"
              className="mt-2 text-center text-xs text-destructive"
            >
              모으기에 실패했어요. 잠시 후 다시 시도해 주세요.
            </p>
          )}
        </div>

        <RewardCollectCompleteSheet
          open={rewardCollectOpen}
          onConfirm={() => {
            setRewardCollectOpen(false);
            router.push("/portfolio");
          }}
        />

        <PartnerPointSheet
          open={pointSheetOpen}
          onOpenChange={setPointSheetOpen}
        />
        <AccountLinkSheet
          open={accountSheetOpen}
          onOpenChange={setAccountSheetOpen}
        />
        <CardLinkSheet open={cardSheetOpen} onOpenChange={setCardSheetOpen} />
        <FxLinkSheet open={fxSheetOpen} onOpenChange={setFxSheetOpen} />

        {/* 바로가기 (바로가기 편집에서 순서/표시 변경) */}
        <section>
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
              {quickLinks.map(({ id, label, icon: Icon, href }, index) => (
                <Link
                  key={id}
                  href={href}
                  className="flex flex-col items-center gap-1.5 ps-rise-in"
                  style={{ "--i": Math.min(index, 5) } as React.CSSProperties}
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
