import type React from "react";
import {
  TradingQuickIcon,
  PiecesQuickIcon,
  PortfolioQuickIcon,
  HistoryQuickIcon,
  AssetQuickIcon,
  BudgetQuickIcon,
  ExchangeQuickIcon,
  PointsQuickIcon,
} from "@/components/icons/QuickLinkIcons";

/** 홈 "바로가기" 타일 1개. id 는 바로가기 편집(순서/표시) 저장 키로 쓰이므로 변경 금지. */
export interface QuickLink {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  highlight?: boolean;
}

// TODO: 라우트 일부 미확정 — 사용자 지정 대기 중 (#)
export const QUICK_LINKS: QuickLink[] = [
  { id: "trading", label: "주식 모으기", icon: TradingQuickIcon, href: "/trading", highlight: true },
  { id: "pieces", label: "퍼즐 조각", icon: PiecesQuickIcon, href: "/portfolio?lens=pieces" },
  { id: "portfolio", label: "포트폴리오", icon: PortfolioQuickIcon, href: "/portfolio" },
  { id: "history", label: "주문 내역", icon: HistoryQuickIcon, href: "/history" },
  { id: "asset", label: "리밸런싱", icon: AssetQuickIcon, href: "/asset" },
  { id: "budget", label: "가계부", icon: BudgetQuickIcon, href: "/budget" },
  { id: "exchange", label: "환전", icon: ExchangeQuickIcon, href: "/exchange" },
  { id: "points", label: "포인트", icon: PointsQuickIcon, href: "/points" },
];

export const QUICK_LINK_BY_ID: Record<string, QuickLink> = Object.fromEntries(
  QUICK_LINKS.map((link) => [link.id, link]),
);

export const DEFAULT_LINK_ORDER: string[] = QUICK_LINKS.map((link) => link.id);

/**
 * 저장된 순서를 실제 타일 목록에 맞춰 정규화.
 * - 더 이상 없는 id 는 제거, 새로 추가된 타일은 뒤에 붙인다(앱 업데이트 안전).
 */
export function resolveOrder(order: string[]): string[] {
  const known = order.filter((id) => id in QUICK_LINK_BY_ID);
  const missing = DEFAULT_LINK_ORDER.filter((id) => !known.includes(id));
  return [...known, ...missing];
}
