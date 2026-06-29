export const queryKeys = {
  asset: {
    all: ["asset"] as const,
    summary: ["asset", "summary"] as const,
    maturity: (accountId?: number | null) =>
      ["asset", "maturity", accountId ?? null] as const,
    maturityAccounts: ["asset", "maturity-accounts"] as const,
    cardRecommendation: ["asset", "card-recommendation"] as const,
    spending: (period: { year: number; month: number }) =>
      ["asset", "spending", period] as const,
    bankAccounts: ["asset", "bank-accounts"] as const,
    institutions: ["asset", "institutions"] as const,
    cards: ["asset", "cards"] as const,
    scan: ["asset", "scan"] as const,
    dormant: ["asset", "dormant"] as const,
    externalHoldings: ["asset", "external-holdings"] as const,
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
    transferAccount: ["budget", "transfer-account"] as const,
  },
  trading: {
    all: ["trading"] as const,
    holdings: ["trading", "holdings"] as const,
    portfolioSummary: ["trading", "portfolio", "summary"] as const,
    history: ["trading", "history"] as const,
    orders: ["trading", "orders"] as const,
    pendingOrders: ["trading", "orders", "pending"] as const,
    stockDetail: (code: string) => ["trading", "stock", code] as const,
    search: (q: string) => ["trading", "search", q] as const,
    rankings: (market: string, sort: string) =>
      ["trading", "rankings", market, sort] as const,
    orderbook: (code: string) => ["trading", "orderbook", code] as const,
    orderbookForeign: (code: string) => ["trading", "orderbook-foreign", code] as const,
    valuations: (code: string) => ["trading", "valuations", code] as const,
    wholeShares: ["trading", "whole-shares"] as const,
    autoInvest: (code: string) => ["trading", "autoInvest", code] as const,
    autoInvestSummary: ["trading", "autoInvest", "summary"] as const,
    autoInvestTriggers: (id: number) =>
      ["trading", "autoInvest", "triggers", id] as const,
    autoInvestExecutions: (id: number) =>
      ["trading", "autoInvest", "executions", id] as const,
    rewards: ["trading", "rewards"] as const,
    rewardCandidates: ["trading", "rewards", "candidates"] as const,
    maturityReservations: ["trading", "maturity-reservations"] as const,
    dividendReinvest: ["trading", "dividend-reinvest"] as const,
    dividendHistory: ["trading", "dividend-history"] as const,
    accounts: ["trading", "accounts"] as const,
  },
  cma: {
    all: ["cma"] as const,
    home: ["cma", "home"] as const,
    balance: ["cma", "balance"] as const,
    collectSettings: ["cma", "collect-settings"] as const,
    autoChargeSettings: ["cma", "auto-charge-settings"] as const,
    transactions: (page: number, size: number) =>
      ["cma", "transactions", page, size] as const,
  },
  exchange: {
    all: ["exchange"] as const,
    rate: ["exchange", "rate"] as const,
    history: (page = 0, size = 5) => ["exchange", "history", page, size] as const,
    historyInfinite: (size = 15) => ["exchange", "history", "infinite", size] as const,
    autoSettings: ["exchange", "auto-settings"] as const,
  },
  stockCalendar: {
    all: ["stockCalendar"] as const,
    events: (year: number, month: number) => ["stockCalendar", "events", year, month] as const,
  },
  user: {
    profile: ["user", "profile"] as const,
  },
  notification: {
    all: ["notification"] as const,
    list: (page: number, size: number) =>
      ["notification", "list", page, size] as const,
    settings: ["notification", "settings"] as const,
  },
} as const;
