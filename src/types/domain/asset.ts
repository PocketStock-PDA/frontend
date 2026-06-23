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
  accountName: string;
  maturityDate: string;
  principalAmount: number;
  daysUntilMaturity: number;
  interestRate: number;
}

export interface MaturityRecommendationResponse {
  triggerAccount: MaturityTriggerAccount | null;
  recommendations: unknown[];
}

export interface AssetPortfolioItem {
  category: string;
  amount: number;
  ratio: number;
}

export interface AssetSummaryResponse {
  netAssets: number;
  momDiff: number;
  peerAgeGroup: string;
  peerRankPercent: number;
  portfolio: AssetPortfolioItem[];
  fixedExpenses: number;
  variableExpenses: number;
}
