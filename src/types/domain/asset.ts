// ── 자산 연동(마이데이터) ──────────────────────────────────────────────────────
export type InstitutionCategory = "BANK" | "SECURITIES" | "CARD" | "POINT";
export type LinkStatus = "LINKED" | "AVAILABLE";

/** 연동 가능 기관 (GET /api/assets/institutions) */
export interface Institution {
  category: InstitutionCategory;
  companyCode: string;
  companyName: string;
  logoUrl: string | null;
  linkStatus: LinkStatus;
}

export type ScanSourceType = "ACCOUNT" | "CARD" | "POINT" | "FX";

export interface ScanSource {
  sourceType: ScanSourceType;
  name: string;
  amount: number;
}

/** 잠자는 잔돈 스캔 결과 (GET /api/assets/scan) */
export interface ScanResult {
  totalAmount: number;
  sources: ScanSource[];
}

/** 휴면 은행 계좌 (GET /api/assets/dormant) */
export interface DormantAccount {
  accountId: number;
  bankName: string;
  accountName: string;
  balance: number;
  currency: string;
}

/** 휴면계좌 해지 결과 (POST /api/assets/dormant/close) */
export interface DormantCloseResultItem {
  accountId: number;
  amount: number;
  currency: string;
  /** COMPLETED(이체 완료) | ALREADY_CLOSED(해지 완료) | FAILED(실패) */
  status: string;
}

export interface DormantCloseResult {
  closedCount: number;
  transferredAmount: number;
  allCompleted: boolean;
  results: DormantCloseResultItem[];
}

export interface CategorySpending {
  category: string;
  amount: number;
  ratio: number;
}

export interface SpendingResponse {
  totalSpending: number;
  categories: CategorySpending[];
}

export interface MaturityTriggerAccount {
  accountId: number;
  accountName: string;
  maturityDate: string;
  principalAmount: number;
  daysUntilMaturity: number;
  interestRate: number;
}

export interface DividendStockItem {
  stockCode: string;
  stockName: string;
  category: string;
  /** KR | US — 국내/해외 구분. 해외(US)는 예약 집행 시 자동환전(KRW→USD)이 필요 */
  market: string;
  dividendYield: number;
  tags: string[];
  exDividendDate: string | null;
  /** 주당 현금배당금(KRW) — 가장 가까운 배당 지급 기준, 없으면 null */
  perShareDividend: number | null;
  /** 배당금 지급일(YYYY-MM-DD) — 없으면 null */
  payDate: string | null;
  reason: string;
}

export interface MaturityRecommendationResponse {
  triggerAccount: MaturityTriggerAccount | null;
  recommendations: DividendStockItem[];
}

export interface CardBenefitItem {
  category: string;
  description: string;
}

export interface TopCategory {
  category: string;
  percentage: number;
}

export interface CardRecommendationItem {
  cardName: string;
  cardType: string;
  imageUrl: string | null;
  applyUrl: string | null;
  annualFee: number;
  benefits: CardBenefitItem[];
  matchRate: number;
}

export interface CardRecommendationResponse {
  topCategories: TopCategory[];
  recommendations: CardRecommendationItem[];
}

export interface AssetPortfolioItem {
  category: string;
  amount: number;
  ratio: number;
}

export interface ExternalHoldingStock {
  stockCode: string;
  stockName: string;
  quantity: number;
  evaluated: number;
}

export interface ExternalHolding {
  companyCode: string;
  companyName: string;
  stocks: ExternalHoldingStock[];
}

/** 연동 포인트 개별 출처(1P=1원) — '기타' 드릴다운에서 입출금과 분리 표기 */
export interface PointSource {
  pointName: string;
  balance: number;
}

export interface AssetSummaryResponse {
  netAssets: number;
  momDiff: number;
  peerAgeGroup: string;
  peerRankPercent: number;
  portfolio: AssetPortfolioItem[];
  fixedExpenses: number;
  variableExpenses: number;
  /** 연동 포인트 잔액 합계(1P=1원) — '기타'에 포함 */
  points: number;
  /** 연동 포인트 출처별 내역 — '기타' 드릴다운 항목 표기용 */
  pointSources: PointSource[];
  /** CMA·신투 등 일부 평가 미조회 — 증권·순자산이 과소계상됐을 수 있음 */
  partial: boolean;
}
