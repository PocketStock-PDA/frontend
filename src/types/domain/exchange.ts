export interface ExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  baseRate: number;
  buyRate: number;
  sellRate: number;
  preferentialRate: number;
  change: number;
  updatedAt: string;
}

export interface ExchangeValidate {
  valid: boolean;
  direction: string;
  fromCurrency: string;
  toCurrency: string;
  appliedRate: number | null;
  inputAmount: number | null;
  expectedReceive: number | null;
  availableBalance: number | null;
  maxAmount: number | null;
  reason: string | null;
}

export interface FxHistoryItem {
  type: string;
  krwAmount: number;
  usdAmount: number;
  triggerType: string;
  rate: number;
  status: string;
  exchangedAt: string;
}

export interface FxHistory {
  history: FxHistoryItem[];
  page: number;
  totalElements: number;
}

export interface FxAutoSetting {
  autoEnabled: boolean;
  useDollarFirst: boolean;
  maxAmountPerTx: number | null;
  residualHandling: string | null;
}

export interface KrwToUsdResult {
  exchangedUsd: number;
  appliedRate: number;
  fee: number;
  triggerType: string;
  remainKrw: number;
}
