"use client";

import { ChevronRight } from "lucide-react";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { Button } from "@/components/ui/button";

export interface CollectStatusProps {
  /** 주기 라벨(매일/주1회/월1회) */
  freqLabel: string;
  /** 일정 요약("매일 10,000원" / "매일 1주") */
  scheduleText: string;
  /** 시작일 문구(없으면 숨김) */
  startDateText: string | null;
  /** 체결분 합계(모은 금액) */
  collectedAmount: number;
  /** 체결분 수량 합계(포맷된 문자열) */
  collectedQty: string;
  /** 체결 횟수 */
  collectedCount: number;
  profit: number;
  rate: number;
  currency: "KRW" | "USD";
  /** 보유 조각이 있을 때만 "조각 보기" 노출 */
  showPieces: boolean;
  onEdit: () => void;
  onPieces: () => void;
  onStatus: () => void;
  onBuyNow: () => void;
}

/**
 * 모으기 현황(여정) 화면 — 모은 금액/수량/횟수 + 일정 + 현재 수익 + 즉시 담기.
 * 회차 내역은 부모(상세 페이지)의 "모으기 내역" 섹션이 이어서 렌더한다.
 */
export function CollectStatus({
  freqLabel,
  scheduleText,
  startDateText,
  collectedAmount,
  collectedQty,
  collectedCount,
  profit,
  rate,
  currency,
  showPieces,
  onEdit,
  onPieces,
  onStatus,
  onBuyNow,
}: CollectStatusProps) {
  return (
    <div className="space-y-5">
      {/* 헤딩 */}
      <div>
        <p className="text-xl font-bold text-foreground">
          {freqLabel ? `${freqLabel} 모으고 있어요` : "모으고 있어요"}
        </p>
        {startDateText && (
          <p className="mt-1 text-sm text-muted-foreground">
            {startDateText}부터 시작했어요
          </p>
        )}
      </div>

      {/* 모은 금액 */}
      <div className="flex items-center justify-between rounded-2xl bg-muted p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">모은 금액</p>
          <AmountDisplay
            value={collectedAmount}
            currency={currency}
            size="xl"
            className="mt-1 block font-bold"
          />
        </div>
        <CoinsArt currency={currency} className="h-14 w-auto shrink-0" />
      </div>

      {/* 모은 수량 / 횟수 */}
      <div className="grid grid-cols-2 rounded-2xl bg-muted p-4">
        <div>
          <p className="text-xs text-muted-foreground">모은 수량</p>
          <p className="mt-0.5 font-numeric text-lg font-bold text-foreground">
            {collectedQty}주
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">모은 횟수</p>
          <p className="mt-0.5 font-numeric text-lg font-bold text-foreground">
            {collectedCount}회
          </p>
        </div>
      </div>

      {showPieces && (
        <button
          type="button"
          onClick={onPieces}
          className="flex items-center gap-0.5 text-sm font-semibold text-primary"
        >
          퍼즐로 모은 조각 보기
          <ChevronRight className="size-4" />
        </button>
      )}

      {/* 내 모으기 + 수정 */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">내 모으기</p>
          <p className="mt-0.5 truncate text-base font-bold text-foreground">
            {scheduleText || "—"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 rounded-full"
          onClick={onEdit}
        >
          수정하기
        </Button>
      </div>

      {/* 현재 수익 → 종목 현황 */}
      <button
        type="button"
        onClick={onStatus}
        className="flex w-full items-center justify-between rounded-2xl border border-border p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="text-sm text-muted-foreground">현재 수익</span>
        <span className="flex items-center gap-1">
          <ChangeIndicator
            value={profit}
            subPercent={rate}
            suffix={currency === "USD" ? "$" : "원"}
            size="sm"
          />
          <ChevronRight className="size-4 text-muted-foreground" />
        </span>
      </button>

      {/* 기다리기 힘들면 지금 바로 담기 */}
      <button
        type="button"
        onClick={onBuyNow}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-muted p-4 text-left transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="min-w-0">
          <span className="block text-xs text-muted-foreground">
            기다리기 힘들다면
          </span>
          <span className="mt-0.5 block text-[15px] font-bold leading-snug text-foreground">
            지금 이 주식 바로 담을 수 있어요
          </span>
          <span className="mt-2 flex items-center gap-0.5 text-[13px] font-bold text-primary">
            지금 담으러 가기
            <ChevronRight className="size-3.5" />
          </span>
        </span>
        <BuyNowArt className="size-11 shrink-0" />
      </button>
    </div>
  );
}

/** 모은 금액 일러스트 — 브랜드색 동전 더미 + 통화 글자 */
function CoinsArt({
  currency,
  className,
}: {
  currency: "KRW" | "USD";
  className?: string;
}) {
  return (
    <svg viewBox="0 0 76 64" fill="none" className={className} aria-hidden="true">
      {[50, 36, 22].map((cy, i) => (
        <g key={cy}>
          <ellipse cx="38" cy={cy + 4} rx="24" ry="8.5" fill="var(--brand)" opacity="0.55" />
          <ellipse
            cx="38"
            cy={cy}
            rx="24"
            ry="8.5"
            fill="var(--brand)"
            opacity={i === 2 ? 1 : 0.9}
          />
        </g>
      ))}
      <text
        x="38"
        y="26"
        textAnchor="middle"
        fontSize="12"
        fontWeight="800"
        fill="#ffffff"
      >
        {currency === "USD" ? "$" : "₩"}
      </text>
    </svg>
  );
}

/** "지금 바로 담기" 일러스트 — 캔들(등락색) */
function BuyNowArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <line x1="13" y1="10" x2="13" y2="30" stroke="var(--down)" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="9.5" y="15" width="7" height="10" rx="1.5" fill="var(--down)" />
      <line x1="26" y1="7" x2="26" y2="31" stroke="var(--up)" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="22.5" y="12" width="7" height="12" rx="1.5" fill="var(--up)" />
    </svg>
  );
}
