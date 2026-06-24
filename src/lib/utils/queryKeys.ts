export const queryKeys = {
  asset: {
    all: ["asset"] as const,
    summary: ["asset", "summary"] as const,
    maturity: ["asset", "maturity"] as const,
    cardRecommendation: ["asset", "card-recommendation"] as const,
    spending: (period: { year: number; month: number }) =>
      ["asset", "spending", period] as const,
    bankAccounts: ["asset", "bank-accounts"] as const,
    institutions: ["asset", "institutions"] as const,
    scan: ["asset", "scan"] as const,
    dormant: ["asset", "dormant"] as const,
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
    orderbook: (code: string) => ["trading", "orderbook", code] as const,
    autoInvest: (code: string) => ["trading", "autoInvest", code] as const,
    rewards: ["trading", "rewards"] as const,
    rewardCandidates: ["trading", "rewards", "candidates"] as const,
  },
  cma: {
    all: ["cma"] as const,
    home: ["cma", "home"] as const,
  },
  exchange: {
    all: ["exchange"] as const,
    rate: ["exchange", "rate"] as const,
    history: (page = 0) => ["exchange", "history", page] as const,
    autoSettings: ["exchange", "auto-settings"] as const,
  },
  stockCalendar: {
    all: ["stockCalendar"] as const,
    events: (year: number, month: number) => ["stockCalendar", "events", year, month] as const,
  },
  user: {
    profile: ["user", "profile"] as const,
  },
} as const;
