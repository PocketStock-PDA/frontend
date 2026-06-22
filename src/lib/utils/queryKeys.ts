export const queryKeys = {
  asset: {
    all: ["asset"] as const,
    spending: (period: { year: number; month: number }) =>
      ["asset", "spending", period] as const,
  },
  portfolio: {
    all: ["portfolio"] as const,
  },
  budget: {
    all: ["budget"] as const,
    goals: ["budget", "goals"] as const,
    calendar: (year: number, month: number) => ["budget", "calendar", year, month] as const,
    transactions: (params: { type?: string; year?: number; month?: number; day?: number }) =>
      ["budget", "transactions", params] as const,
    savings: ["budget", "savings"] as const,
  },
  trading: {
    all: ["trading"] as const,
    holdings: ["trading", "holdings"] as const,
    history: ["trading", "history"] as const,
    orders: ["trading", "orders"] as const,
    stockDetail: (code: string) => ["trading", "stock", code] as const,
    search: (q: string) => ["trading", "search", q] as const,
  },
  cma: {
    all: ["cma"] as const,
    home: ["cma", "home"] as const,
  },
  exchange: {
    all: ["exchange"] as const,
    rate: ["exchange", "rate"] as const,
  },
  user: {
    profile: ["user", "profile"] as const,
  },
} as const;
