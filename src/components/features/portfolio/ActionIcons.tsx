/**
 * 포트폴리오 개요 카드의 동선 타일용 아이콘 SVG 4종.
 * 등락(상승=red/하락=blue)은 시맨틱 색, 나머지는 브랜드색 솔리드 — 그라데이션 금지(PRODUCT.md).
 */

type IconProps = { className?: string };

/** 주식 투자 — 캔들 차트(하락 1·상승 2) */
export function StockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <line x1="10" y1="9" x2="10" y2="31" stroke="var(--down)" strokeWidth="2" strokeLinecap="round" />
      <rect x="6.5" y="15" width="7" height="11" rx="1.5" fill="var(--down)" />
      <line x1="20" y1="6" x2="20" y2="30" stroke="var(--up)" strokeWidth="2" strokeLinecap="round" />
      <rect x="16.5" y="11" width="7" height="13" rx="1.5" fill="var(--up)" />
      <line x1="30" y1="10" x2="30" y2="28" stroke="var(--up)" strokeWidth="2" strokeLinecap="round" />
      <rect x="26.5" y="13" width="7" height="9" rx="1.5" fill="var(--up)" />
    </svg>
  );
}

/** 모으기 — 트레이에 담기(아래 화살표 + 열린 통) */
export function CollectIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path d="M20 7v13" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14.5 15.5 20 21l5.5-5.5" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 23v5a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3v-5" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 조각모으기 — 시그니처 퍼즐 조각(lucide Puzzle path). 브랜드색 아웃라인. */
export function PieceIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.526-.967 1.02Z"
        stroke="var(--brand)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 증권 캘린더 — 달력 + 일정 점 */
export function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="9" width="28" height="26" rx="5" stroke="var(--brand)" strokeWidth="2.5" />
      <path d="M6 17h28" stroke="var(--brand)" strokeWidth="2.5" />
      <path d="M13 5v6M27 5v6" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="14" cy="24" r="1.8" fill="var(--brand)" />
      <circle cx="20" cy="24" r="1.8" fill="var(--brand)" />
      <circle cx="26" cy="24" r="1.8" fill="var(--brand)" />
      <circle cx="14" cy="30" r="1.8" fill="var(--brand)" />
      <circle cx="20" cy="30" r="1.8" fill="var(--brand)" />
    </svg>
  );
}

/** 주문내역 — 명세서(문서 + 줄) */
export function OrdersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="5" width="22" height="30" rx="4" stroke="var(--brand)" strokeWidth="2.5" />
      <path d="M14 14h12M14 20h12M14 26h8" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
