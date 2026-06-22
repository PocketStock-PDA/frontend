import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { BudgetGoalSummary, CalendarResponse, TransactionsResponse } from "@/types/domain/budget";

export function useBudgetGoals() {
  return useQuery({
    queryKey: queryKeys.budget.goals,
    queryFn: () => api.get<BudgetGoalSummary>("/api/budget/goals"),
  });
}

export function useBudgetCalendar(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.budget.calendar(year, month),
    queryFn: () =>
      api.get<CalendarResponse>("/api/budget/calendar", {
        params: { year: String(year), month: String(month) },
      }),
  });
}

export function useBudgetTransactions(params: {
  type?: string;
  year?: number;
  month?: number;
  day?: number;
}) {
  return useQuery({
    queryKey: queryKeys.budget.transactions(params),
    queryFn: () =>
      api.get<TransactionsResponse>("/api/budget/transactions", {
        params: toStringParams(params),
      }),
  });
}

function toStringParams(params: Record<string, number | string | undefined>) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  );
}
