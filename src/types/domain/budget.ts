export interface BudgetGoalCategoryItem {
  category: string;
  budget: number;
  spent: number;
}

export interface BudgetGoalSummary {
  monthlyBudget: number;
  spentAmount: number;
  remainAmount: number;
  categories: BudgetGoalCategoryItem[];
}

export interface CalendarDayItem {
  date: string;
  spent: number;
  status: "SAFE" | "OVER" | string;
}

export interface CalendarResponse {
  year: number;
  month: number;
  dailyBudget: number;
  days: CalendarDayItem[];
}

export interface BudgetTransactionItem {
  transactionId: number;
  category: string;
  description: string;
  amount: number;
  transactedAt: string;
}

export interface TransactionsResponse {
  transactions: BudgetTransactionItem[];
  totalAmount: number;
}

export interface AutoBudgetGoalCategory {
  category: string;
  budget: number;
}

export interface AutoBudgetGoalResponse {
  monthlyBudget: number;
  categories: AutoBudgetGoalCategory[];
}

export interface SavingsStatusResponse {
  period: string;
  totalBudget: number;
  spentAmount: number;
  savedAmount: number;
  targetSavingsAmount: number;
  isCollectAgreed: boolean;
  transferStatus: string;
}
