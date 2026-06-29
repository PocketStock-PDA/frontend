/**
 * 홈 "바로가기" 타일 전용 커스텀 SVG 아이콘 + 네비게이션 바 홈 아이콘.
 *
 * 통일 기준 (size-7 = 28px 렌더 기준):
 *  - 커스텀 SVG(viewBox 40×40): strokeWidth=3.5 → 시각 굵기 ≈ 2.45px
 *  - Lucide 래퍼(viewBox 24×24): strokeWidth=2   → 시각 굵기 ≈ 2.33px
 *  - 퍼즐(viewBox ~124×124):    strokeWidth=10  → 시각 굵기 ≈ 2.26px
 *  세 값이 시각적으로 거의 동일. 모두 var(--brand) 고정색.
 * HomeNavIcon만 currentColor 기준(네비바 상속용).
 */

import { Wallet as WalletIcon, NotebookPen as NotebookPenIcon } from "lucide-react";

type IconProps = { className?: string };

/** 주식 모으기 — 아래 화살표 + 트레이(CollectIcon 동일 디자인, sw=3.5로 통일) */
export function TradingQuickIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path d="M20 7 v13" stroke="var(--brand)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M14.5 15.5 L20 21 L25.5 15.5" stroke="var(--brand)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 23 v5 a3 3 0 0 0 3 3 h16 a3 3 0 0 0 3-3 v-5" stroke="var(--brand)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 퍼즐 조각 — 단일 직소 조각(포트폴리오 detail과 동일 실루엣) */
export function PiecesQuickIcon({ className }: IconProps) {
  return (
    <svg viewBox="7 -11 124 124" fill="none" className={className} aria-hidden="true">
      <path
        d="M 10,10 L 42,10 Q 42,-8 60,-8 Q 78,-8 78,10 L 110,10 L 110,42 Q 128,42 128,60 Q 128,78 110,78 L 110,110 L 78,110 Q 78,92 60,92 Q 42,92 42,110 L 10,110 L 10,78 Q 30,78 30,60 Q 30,42 10,42 Z"
        stroke="var(--brand)"
        strokeWidth="10"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 포트폴리오 — 채워진 파이 차트 3조각(60/25/15%).
 * center=(20,20) r=17 기준. 12시 방향 시계방향.
 * 216° 끝점: (10.0, 33.8) / 306° 끝점: (6.2, 10.0) / top: (20, 3)
 */
export function PortfolioQuickIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path d="M20 20 L20 3 A17 17 0 1 1 10.0 33.8 Z" fill="var(--brand)" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 20 L10.0 33.8 A17 17 0 0 1 6.2 10.0 Z" fill="var(--brand)" fillOpacity="0.45" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 20 L6.2 10.0 A17 17 0 0 1 20 3 Z" fill="var(--brand)" fillOpacity="0.2" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** 주문 내역 — 영수증 문서 */
export function HistoryQuickIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="5" width="22" height="30" rx="4" stroke="var(--brand)" strokeWidth="3.5" />
      <path d="M14 13h12M14 20h12M14 27h8" stroke="var(--brand)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/** 자산 — lucide Wallet 래퍼(var(--brand) 고정색) */
export function AssetQuickIcon({ className }: IconProps) {
  return <WalletIcon className={className} color="var(--brand)" strokeWidth={2} />;
}

/** 가계부 — lucide NotebookPen 래퍼(var(--brand) 고정색) */
export function BudgetQuickIcon({ className }: IconProps) {
  return <NotebookPenIcon className={className} color="var(--brand)" strokeWidth={2} />;
}

/** 환전 — 위아래 반대 방향 화살표 두 개 */
export function ExchangeQuickIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path d="M13 8 v22 M8 24 L13 30 L18 24" stroke="var(--brand)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 32 v-22 M22 16 L27 10 L32 16" stroke="var(--brand)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 포인트 — 동전(원) 안에 P */
export function PointsQuickIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="13" stroke="var(--brand)" strokeWidth="3.5" />
      <path
        d="M16 14 v12 M16 14 h4 q4 0 4 4 q0 4 -4 4 h-4"
        stroke="var(--brand)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 네비게이션 바 홈 아이콘 — 집 모양, currentColor 상속 */
export function HomeNavIcon({
  className,
  strokeWidth,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  const sw = strokeWidth ?? 2;
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path d="M4 22 L20 7 L36 22" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 22 v12 h24 v-12" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 34 v-9 h8 v9" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
