function query(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) sp.set(key, String(value));
  });
  return sp.toString();
}

export function tradingDetailPath(stockCode: string) {
  return `/trading/detail?${query({ stockCode })}`;
}

export function tradingAutoDetailPath(stockCode: string) {
  return `/trading/auto/detail?${query({ stockCode })}`;
}

export function tradingOrderbookPath(stockCode: string) {
  return `/trading/orderbook?${query({ stockCode })}`;
}

export function portfolioDetailPath(
  stockCode: string,
  options: { view?: "pieces" | "collect" } = {},
) {
  return `/portfolio/detail?${query({ stockCode, view: options.view })}`;
}

export function budgetMonthPath(year: number, month: number) {
  return `/budget/month?${query({ year, month })}`;
}

export function budgetDayPath(year: number, month: number, day: number) {
  return `/budget/day?${query({ year, month, day })}`;
}
