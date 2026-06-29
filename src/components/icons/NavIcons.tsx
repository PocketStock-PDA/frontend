/**
 * 바텀 네비게이션 바 전용 커스텀 SVG 아이콘 5종.
 * 모두 currentColor 기준 — active(text-primary) / inactive(text-muted-foreground) 자동 상속.
 * strokeWidth prop: active=2.4 / inactive=2 (BottomTabBar에서 전달).
 */

import { Wallet, NotebookPen } from "lucide-react";

type NavIconProps = { className?: string; strokeWidth?: number };

/** 가계부 — lucide NotebookPen 래퍼(currentColor 상속) */
export function BookNavIcon({ className, strokeWidth = 2 }: NavIconProps) {
  return <NotebookPen className={className} strokeWidth={strokeWidth} />;
}

/** 포트폴리오 — 채워진 파이 차트 3조각(PortfolioQuickIcon과 동일, r=17, currentColor) */
export function PortfolioNavIcon({ className, strokeWidth: _sw = 2 }: NavIconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path d="M20 20 L20 3 A17 17 0 1 1 10.0 33.8 Z" fill="currentColor" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 20 L10.0 33.8 A17 17 0 0 1 6.2 10.0 Z" fill="currentColor" fillOpacity="0.45" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 20 L6.2 10.0 A17 17 0 0 1 20 3 Z" fill="currentColor" fillOpacity="0.2" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** 홈 — 집 모양(QuickLinkIcons의 HomeNavIcon과 동일, re-export 없이 인라인)
 *  viewBox 40×40이므로 Lucide(24×24) 기준 prop을 40/24 배율로 환산해 시각 굵기 통일. */
export function HomeNavIcon({ className, strokeWidth = 2 }: NavIconProps) {
  const sw = strokeWidth * (40 / 24);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path d="M4 22 L20 7 L36 22" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 22 v12 h24 v-12" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 34 v-9 h8 v9" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 자산 — lucide Wallet 래퍼(currentColor 상속) */
export function AssetNavIcon({ className, strokeWidth = 2 }: NavIconProps) {
  return <Wallet className={className} strokeWidth={strokeWidth} />;
}

/** 마이페이지 — 사람 실루엣(원형 머리 + 어깨 호)
 *  viewBox 40×40이므로 Lucide(24×24) 기준 prop을 40/24 배율로 환산해 시각 굵기 통일. */
export function ProfileNavIcon({ className, strokeWidth = 2 }: NavIconProps) {
  const sw = strokeWidth * (40 / 24);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <circle cx="20" cy="14" r="6" stroke="currentColor" strokeWidth={sw} />
      <path d="M7 35 Q7 24 20 24 Q33 24 33 35" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
