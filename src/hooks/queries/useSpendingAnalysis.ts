import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { SpendingResponse } from "@/types/domain/asset";

const MAX_NAMED_CATEGORIES = 4;

export function useSpendingAnalysis(months = 3) {
  const periods = getRecentMonthPeriods(months);

  return useQueries({
    queries: periods.map((period) => ({
      queryKey: queryKeys.asset.spending(period),
      queryFn: () =>
        api.get<SpendingResponse>("/api/assets/spending", {
          params: { year: String(period.year), month: String(period.month) },
        }),
    })),
    combine: (results) => ({
      data: aggregate(results.map((r) => r.data), months),
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError),
      refetch: () => results.forEach((r) => void r.refetch()),
    }),
  });
}

function getRecentMonthPeriods(months: number) {
  const today = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

function aggregate(responses: Array<SpendingResponse | undefined>, months: number) {
  const byCategory = new Map<string, number>();
  let totalAmount = 0;

  responses.forEach((res) => {
    if (!res) return;
    totalAmount += res.totalSpending;
    res.categories.forEach((cat) => {
      byCategory.set(cat.category, (byCategory.get(cat.category) ?? 0) + cat.amount);
    });
  });

  const sorted = Array.from(byCategory, ([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const named = sorted.slice(0, MAX_NAMED_CATEGORIES);
  const otherAmount = sorted.slice(MAX_NAMED_CATEGORIES).reduce((s, c) => s + c.amount, 0);

  const categories = [
    ...named.map((c) => ({
      name: c.category,
      percentage: totalAmount > 0 ? Math.round((c.amount / totalAmount) * 100) : 0,
      isOther: false,
    })),
    ...(otherAmount > 0
      ? [{ name: "기타", percentage: Math.round((otherAmount / totalAmount) * 100), isOther: true }]
      : []),
  ];

  return {
    monthlyAverage: totalAmount / months,
    totalAmount,
    categories,
  };
}
