export interface CategorySpending {
  category: string;
  amount: number;
  ratio: number;
}

export interface SpendingResponse {
  totalSpending: number;
  categories: CategorySpending[];
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
