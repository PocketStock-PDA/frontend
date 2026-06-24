// CMA 홈 대시보드 (GET /api/cma/home)

export type Currency = "KRW" | "USD";

export type CollectSourceType = "ACCOUNT" | "CARD" | "POINT" | "FX";

export interface CollectSource {
  sourceType: CollectSourceType;
  name: string;
  amount: number;
  /** 금액 통화 — 표기 분기 기준 (FX는 USD) */
  currency: Currency;
}

export interface CmaHome {
  /** 통화별 CMA 잔액 (예: { KRW, USD }) */
  cmaBalance: Record<Currency, number>;
  /** 연이율 (0.035 = 3.5%) */
  interestRate: number;
  /** 오늘 발생 이자 */
  todayInterest: number;
  /** 이번 달 수집한 잔돈의 소스별 내역 (수집액>0만) — 디자인의 "카드 사용 잔돈" 행 */
  collectedSources: CollectSource[];
  /** 수집 가능한 잔돈 소스 목록 */
  collectSources: CollectSource[];
  /** 수집 가능한 KRW 총액 (POINT + ACCOUNT) — 모으기 버튼 금액 */
  totalCollectable: number;
  /** 수집 가능한 USD 총액 (FX) — totalCollectable과 합산하지 않고 별도 표시 */
  totalCollectableUsd: number;
}

// 잔돈 모으기 실행 (POST /api/cma/collect) — 구현됨
export type CollectStatus = "SUCCESS" | "SKIPPED" | "FAILED";

/** 소스별 수집 결과 (응답 data 배열의 한 항목) */
export interface CollectSourceResult {
  sourceType: CollectSourceType;
  status: CollectStatus;
  /** 수집 금액 (SKIPPED/FAILED 시 0) */
  amount: number;
  /** 수집 후 CMA 잔액 (성공 시), 그 외 null */
  balanceAfter: number | null;
  /** 실패/스킵 사유 */
  errorMessage: string | null;
}

/** POST /api/cma/collect 응답 = 소스별 결과 배열 */
export type CollectResult = CollectSourceResult[];
