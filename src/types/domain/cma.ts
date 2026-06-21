// CMA 홈 대시보드 (GET /api/cma/home)

export type Currency = "KRW" | "USD";

export type CollectSourceType = "ACCOUNT" | "CARD" | "POINT";

export interface CollectSource {
  sourceType: CollectSourceType;
  name: string;
  amount: number;
}

export interface CmaHome {
  /** 통화별 CMA 잔액 (예: { KRW, USD }) */
  cmaBalance: Record<Currency, number>;
  /** 연이율 (0.035 = 3.5%) */
  interestRate: number;
  /** 오늘 발생 이자 */
  todayInterest: number;
  /** 오늘까지 수집한 잔돈 합계 */
  collectedToday: number;
  /** 수집 가능한 잔돈 소스 목록 */
  collectSources: CollectSource[];
  /** 수집 가능한 잔돈 총액 (모으기 버튼 금액) */
  totalCollectable: number;
}

// 잔돈 모으기 실행 (POST /api/cma/collect)
// ⚠️ 문서 스펙 기준 — 백엔드 컨트롤러 미구현 상태 (구현 시 동작)
export interface CollectResult {
  collectedAmount: number;
  newBalance: number;
}
