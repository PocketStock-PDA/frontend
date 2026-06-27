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
