// CMA 홈 대시보드 (GET /api/cma/home)

export type Currency = "KRW" | "USD";

// CMA 잔액·성과율 (GET /api/cma/balance) — CmaBalanceResponse와 1:1
/** 통화 풀 한 개 (원화풀 KRW_RP / 외화풀 USD_RP) */
export interface CmaBalanceItem {
  currency: Currency;
  /** 풀 잔액 */
  balance: number;
  /** 연이율 (0.035 = 3.5%) */
  interestRate: number;
  /** 풀 종류 (예: KRW_RP, USD_RP) */
  type: string;
}

export interface CmaBalance {
  /** 통화 풀별 잔액·이율 */
  accounts: CmaBalanceItem[];
  /** 전체 KRW 환산 평가액 */
  totalKrwEquivalent: number;
}

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

// CMA 계좌내역 (GET /api/cma/transactions) — CmaTransactionResponse와 1:1
/**
 * CMA 거래 한 건.
 * txType 어휘 — 입금(+): DEPOSIT, COLLECT, INTEREST, BANK_IN, DORMANT, SAVINGS, SELL_RETURN, FX_IN
 *               출금(−): BUY_TRANSFER, FX_OUT / 정정: REVERT
 * amount는 부호 포함(입금 +, 출금 −). sourceType: ACCOUNT/CARD/POINT/MANUAL/SYSTEM.
 */
export interface CmaTransaction {
  id: number;
  txType: string;
  sourceType: string;
  currency: Currency;
  /** 부호 포함 금액 (입금 +, 출금 −) */
  amount: number;
  /** 거래 후 잔액 */
  balanceAfter: number;
  createdAt: string;
}
