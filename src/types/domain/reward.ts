// 첫 주식(welcome) 리워드 — reward-controller (GET/POST /api/trading/rewards*)

/** 받은 첫 주식 리워드 (GET /api/trading/rewards 의 항목) */
export interface WelcomeReward {
  stockCode: string;
  stockName: string;
  market: string;
  currency: string;
  /** 지급 수량(주) */
  quantity: number;
  /** 지급 시점 가격 */
  grantPrice: number;
  /** 지급 예산(원) */
  budgetKrw: number;
  /** 지급 시각 */
  grantedAt: string;
}

/** 첫 주식 후보 종목 (GET /api/trading/rewards/welcome/candidates) */
export interface WelcomeRewardCandidate {
  stockCode: string;
  stockName: string;
  market: string;
  exchange: string;
  currency: string;
  /** 거래대금(랭킹 기준) */
  tradeAmount: number;
  /** 1=상위 */
  rank: number;
  logoUrl: string | null;
}

/** 첫 주식 지급 요청 (POST /api/trading/rewards/welcome) */
export interface WelcomeRewardClaimRequest {
  stockCode: string;
}
