// 만기 굴리기 '예금 재예치' — 예적금 상품 카탈로그 + 재예치 기록 (core-api /api/recommendations)

/** 예적금 상품 1건 (GET /api/recommendations/deposits) */
export interface DepositProduct {
  id: number;
  productName: string;
  /** 정기예금 | 정기적금 */
  productType: string;
  periodMonths: number;
  /** 기본금리(%) */
  baseRate: number;
  /** 최고금리(우대 포함, %) */
  maxRate: number;
  minAmount: number;
  /** 한도 없으면 null */
  maxAmount: number | null;
}

/** '예금 재예치' 기록 1건 (GET /api/recommendations/maturity/deposit-rollovers) */
export interface DepositRollover {
  id: number;
  linkedBankAccountId: number;
  maturityDate: string | null;
  productName: string;
  productType: string;
  amount: number;
  baseRate: number;
  maxRate: number;
  periodMonths: number;
  status: "RESERVED" | "EXECUTED" | "CANCELLED" | "FAILED";
  createdAt: string;
}

/** '예금 재예치' 생성 요청 — 만기된 예적금과 같은 상품으로 재예치 (POST /api/recommendations/maturity/deposit-rollover) */
export interface DepositRolloverRequest {
  linkedBankAccountId: number;
  amount: number;
}
