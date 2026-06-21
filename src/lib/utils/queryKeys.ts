export const queryKeys = {
  asset: {
    all: ["asset"] as const,
  },
  portfolio: {
    all: ["portfolio"] as const,
  },
  budget: {
    all: ["budget"] as const,
  },
  trading: {
    all: ["trading"] as const,
    holdings: ["trading", "holdings"] as const,
    history: ["trading", "history"] as const,
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
