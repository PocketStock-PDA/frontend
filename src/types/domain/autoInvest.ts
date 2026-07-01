// 자동모으기(정기 적립식) — 백엔드 /api/trading/auto-invest 계약에 맞춘 타입.
//
// 백엔드 구조:
//  - 종목 1건 = AutoInvestStock (주기 base: period/periodDay/amountType/buyAmount·buyQuantity)
//  - market·currency·accountId는 stockCode→exchange에서 백엔드가 파생(요청에 안 받음)
//  - 조건매수(물타기)/조건매도(익절)는 종목과 별개의 "트리거" — /auto-invest/{id}/triggers 로 관리
//  - 키는 stockCode가 아니라 종목 설정 id. 화면(종목 기준)은 종합조회로 code→id를 해석한다.

// ── 공통 enum ────────────────────────────────────────────────
export type AutoInvestMarket = "DOMESTIC" | "OVERSEAS";
export type AutoInvestPeriod = "DAILY" | "WEEKLY" | "MONTHLY";
/** 금액으로(AMOUNT) / 수량으로(QUANTITY) */
export type AutoInvestAmountType = "AMOUNT" | "QUANTITY";

// ── 백엔드 응답: 종합조회(GET /api/trading/auto-invest) ───────
/** 종합조회 stocks[] 항목 (목록·단건 공용) */
export interface AutoInvestStock {
  id: number;
  stockCode: string;
  stockName: string;
  market: AutoInvestMarket;
  period: AutoInvestPeriod;
  /** WEEKLY 1~5(월~금) / MONTHLY 1~31 / DAILY null */
  periodDay: number | null;
  amountType: AutoInvestAmountType;
  /** 금액형일 때 회차 금액 (수량형이면 null) */
  buyAmount: number | null;
  /** 수량형일 때 회차 수량 (금액형이면 null) */
  buyQuantity: number | null;
  currency: string;
  isActive: boolean;
  /** 모으기로 FILLED 체결된 누적 횟수 (0 = 아직 한 번도 체결 안 됨) */
  executedCount: number;
}

/** GET /api/trading/auto-invest 응답 */
export interface AutoInvestSummary {
  /** 자동모으기 전역 사용 여부 */
  enabled: boolean;
  /** 전역 일시중지 */
  paused: boolean;
  /** 일시중지 중에도 적립 계속 */
  keepCollectingOnPause: boolean;
  stocks: AutoInvestStock[];
}

// ── 백엔드 응답: 수익률 트리거(물타기/익절) ──────────────────
export type TriggerKind = "BUY" | "SELL";
/** BUY: AMOUNT|QUANTITY / SELL: RATIO|QUANTITY|ALL */
export type TriggerActionType = "AMOUNT" | "QUANTITY" | "RATIO" | "ALL";

/** GET /auto-invest/{id}/triggers 항목 */
export interface AutoInvestTrigger {
  id: number;
  triggerKind: TriggerKind;
  /** BUY=음수(예 -7) / SELL=양수(예 +15) */
  conditionRate: number;
  actionType: TriggerActionType;
  actionAmount: number | null;
  actionQuantity: number | null;
  actionRatio: number | null;
  isActive: boolean;
  /** 실시간 감지 엔진 무장 여부 */
  isArmed: boolean;
  lastFiredAt: string | null;
}

// ── 백엔드 응답: 모으기 회차 내역 ────────────────────────────
export type AutoInvestExecStatus =
  | "QUEUED"
  | "FILLED"
  | "REJECTED"
  | "CANCELLED"
  | "FAILED";
/** 회차 발동 출처: 정기(PERIODIC) / 물타기(BUY) / 익절(SELL) */
export type AutoInvestTriggerSource = "PERIODIC" | "BUY" | "SELL";

/** GET /auto-invest/{id}/executions 항목 */
export interface AutoInvestExecution {
  id: number;
  roundNo: number;
  triggerSource: AutoInvestTriggerSource;
  side: "BUY" | "SELL";
  /** yyyy-MM-dd */
  execDate: string;
  status: AutoInvestExecStatus;
  failReason: string | null;
  orderId: number | null;
  execAmount: number | null;
  execQuantity: number | null;
  currency: string;
}

// ── 요청 바디 ────────────────────────────────────────────────
/** POST/PUT /api/trading/auto-invest 바디 (update 시 stockCode는 무시·불변) */
export interface AutoInvestSaveRequest {
  stockCode: string;
  period: AutoInvestPeriod;
  /** DAILY=null / WEEKLY=1~5 / MONTHLY=1~31 */
  periodDay: number | null;
  amountType: AutoInvestAmountType;
  buyAmount: number | null;
  buyQuantity: number | null;
}

/** POST /auto-invest/{id}/triggers 바디 */
export interface AutoInvestTriggerRequest {
  triggerKind: TriggerKind;
  conditionRate: number;
  actionType: TriggerActionType;
  actionAmount?: number;
  actionQuantity?: number;
  actionRatio?: number;
}

// ── 프론트 폼 뷰모델 (UI 편집 전용; 저장 시 위 요청 바디로 변환) ──
// 백엔드 auto-invest 계약에 없는 항목(소수점/온주 method·실행시간·부족금액 자동충전)은
// 의도적으로 제외했다. 정기적립은 소수점 배치 고정이고, 자동충전은 CMA(/api/cma/auto-charge-settings) 소관.

export type AutoInvestFrequency = AutoInvestPeriod;
export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
/** 수량으로(QTY) / 금액으로(AMOUNT) — 폼 UI 표기 */
export type AmountMode = "QTY" | "AMOUNT";

/** 조건 모으기: 수익률 하락 시 매수 (저가 매수) → BUY 트리거 */
export interface BuyCondition {
  enabled: boolean;
  /** 내 수익률 -N% 이하일 때 (N은 양수) */
  dropRate: number;
  mode: AmountMode;
  amount: number;
  quantity: number;
}

/** 조건 팔기: 수익률 상승 시 매도 (목표 수익 실현) → SELL 트리거 */
export interface SellCondition {
  enabled: boolean;
  /** 내 수익률 +N% 이상일 때 */
  riseRate: number;
  /** 비율로 / 수량으로 */
  mode: "RATIO" | "QTY";
  /** 비율(%) — 10/25/50/100(전체) */
  ratioPct: number;
  quantity: number;
}

/** 종목별 자동모으기 폼 상태 */
export interface AutoInvestSetting {
  stockCode: string;
  /** 활성(is_active) — 마스터 토글 */
  enabled: boolean;
  frequency: AutoInvestFrequency;
  /** 주1회 실행 요일 (백엔드는 월~금만 = periodDay 1~5) */
  weekdays: Weekday[];
  /** 월1회 실행 일자 1~31 */
  dayOfMonth: number;
  amountMode: AmountMode;
  /** 금액으로일 때 회차 금액 */
  amount: number;
  /** 수량으로일 때 회차 수량(주) */
  quantity: number;
  buyCondition: BuyCondition;
  sellCondition: SellCondition;
}

// ── 변환 헬퍼 (폼 뷰모델 ↔ 백엔드 계약) ──────────────────────

/** 주1회 요일: 월=1 … 금=5 (백엔드 periodDay). 주말은 미지원 → 월로 폴백. */
const WEEKDAYS_MON_TO_FRI: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI"];

export function weekdayToInt(w: Weekday): number {
  const i = WEEKDAYS_MON_TO_FRI.indexOf(w);
  return i >= 0 ? i + 1 : 1;
}
export function intToWeekday(n: number | null | undefined): Weekday {
  return WEEKDAYS_MON_TO_FRI[(n ?? 1) - 1] ?? "MON";
}

export const DEFAULT_BUY_CONDITION: BuyCondition = {
  enabled: false,
  dropRate: 5,
  mode: "AMOUNT",
  amount: 10000,
  quantity: 1,
};
export const DEFAULT_SELL_CONDITION: SellCondition = {
  enabled: false,
  riseRate: 15,
  mode: "RATIO",
  ratioPct: 50,
  quantity: 1,
};

export function defaultSetting(stockCode: string, currency = "KRW"): AutoInvestSetting {
  return {
    stockCode,
    enabled: true,
    frequency: "WEEKLY",
    weekdays: ["MON"],
    dayOfMonth: 1,
    amountMode: "AMOUNT",
    amount: currency === "USD" ? 10 : 10000,
    quantity: 1,
    buyCondition: { ...DEFAULT_BUY_CONDITION, amount: currency === "USD" ? 10 : 10000 },
    sellCondition: { ...DEFAULT_SELL_CONDITION },
  };
}

/** 백엔드 종목 + 트리거 → 폼 뷰모델 */
export function stockToSetting(
  stock: AutoInvestStock,
  triggers: AutoInvestTrigger[],
): AutoInvestSetting {
  const buy = triggers.find((t) => t.triggerKind === "BUY");
  const sell = triggers.find((t) => t.triggerKind === "SELL");
  return {
    stockCode: stock.stockCode,
    enabled: stock.isActive,
    frequency: stock.period,
    weekdays:
      stock.period === "WEEKLY" ? [intToWeekday(stock.periodDay)] : ["MON"],
    dayOfMonth: stock.period === "MONTHLY" ? (stock.periodDay ?? 1) : 1,
    amountMode: stock.amountType === "AMOUNT" ? "AMOUNT" : "QTY",
    amount: stock.buyAmount ?? 10000,
    quantity: stock.buyQuantity ?? 1,
    buyCondition: buy ? triggerToBuyCondition(buy) : { ...DEFAULT_BUY_CONDITION },
    sellCondition: sell
      ? triggerToSellCondition(sell)
      : { ...DEFAULT_SELL_CONDITION },
  };
}

/** 폼 뷰모델 → 설정 저장 바디 */
export function settingToSaveRequest(s: AutoInvestSetting): AutoInvestSaveRequest {
  const period = s.frequency;
  const periodDay =
    period === "WEEKLY"
      ? weekdayToInt(s.weekdays[0] ?? "MON")
      : period === "MONTHLY"
        ? s.dayOfMonth
        : null;
  const amountType: AutoInvestAmountType =
    s.amountMode === "AMOUNT" ? "AMOUNT" : "QUANTITY";
  return {
    stockCode: s.stockCode,
    period,
    periodDay,
    amountType,
    buyAmount: amountType === "AMOUNT" ? s.amount : null,
    buyQuantity: amountType === "QUANTITY" ? s.quantity : null,
  };
}

/** BuyCondition → BUY 트리거 바디 (수익률은 음수로 변환) */
export function buyConditionToTrigger(c: BuyCondition): AutoInvestTriggerRequest {
  const base = {
    triggerKind: "BUY" as const,
    conditionRate: -Math.abs(c.dropRate),
  };
  return c.mode === "AMOUNT"
    ? { ...base, actionType: "AMOUNT", actionAmount: c.amount }
    : { ...base, actionType: "QUANTITY", actionQuantity: c.quantity };
}

/** SellCondition → SELL 트리거 바디 (수익률은 양수, 비율 100=전량은 RATIO 100) */
export function sellConditionToTrigger(c: SellCondition): AutoInvestTriggerRequest {
  const base = {
    triggerKind: "SELL" as const,
    conditionRate: Math.abs(c.riseRate),
  };
  return c.mode === "RATIO"
    ? { ...base, actionType: "RATIO", actionRatio: c.ratioPct }
    : { ...base, actionType: "QUANTITY", actionQuantity: c.quantity };
}

function triggerToBuyCondition(t: AutoInvestTrigger): BuyCondition {
  return {
    enabled: true,
    dropRate: Math.abs(t.conditionRate),
    mode: t.actionType === "AMOUNT" ? "AMOUNT" : "QTY",
    amount: t.actionAmount ?? DEFAULT_BUY_CONDITION.amount,
    quantity: t.actionQuantity ?? DEFAULT_BUY_CONDITION.quantity,
  };
}

function triggerToSellCondition(t: AutoInvestTrigger): SellCondition {
  // ALL(전량 매도)은 폼에선 비율 100%로 표현
  const ratio = t.actionType === "RATIO" || t.actionType === "ALL";
  return {
    enabled: true,
    riseRate: Math.abs(t.conditionRate),
    mode: ratio ? "RATIO" : "QTY",
    ratioPct: t.actionType === "ALL" ? 100 : (t.actionRatio ?? DEFAULT_SELL_CONDITION.ratioPct),
    quantity: t.actionQuantity ?? DEFAULT_SELL_CONDITION.quantity,
  };
}
