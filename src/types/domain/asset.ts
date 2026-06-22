export interface CategorySpending {
  category: string;
  amount: number;
  ratio: number;
}

export interface SpendingResponse {
  totalSpending: number;
  categories: CategorySpending[];
}
