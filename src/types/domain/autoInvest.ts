// 자동모으기(정기 적립식) 통합 설정 — T5
// ⚠️ 백엔드 CRUD 엔드포인트 미구현(2026-06 기준) — 문서 스펙 기준 틀. 구현 시 동작.

/**
 * 백엔드 자동모으기 API(GET/PUT /api/trading/stocks/{code}/auto-invest) 준비 여부.
 * 현재 백엔드 미구현 → false(프론트 스텁으로 동작, 실제 저장 안 함).
 * 백엔드 완성되면 이 값만 true로 바꾸면 실연동된다. (useAutoInvest·useSaveAutoInvest)
 */
export const AUTO_INVEST_API_READY = false;

export type AutoInvestFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

/** 소수점 / 온주 */
export type OrderMethod = "FRACTION" | "WHOLE";
/** 수량으로 / 금액으로 */
export type AmountMode = "QTY" | "AMOUNT";

/** 조건 모으기: 수익률 하락 시 매수 (저가 매수) */
export interface BuyCondition {
  enabled: boolean;
  /** 내 수익률 -N% 이하일 때 (N은 양수) */
  dropRate: number;
  mode: AmountMode;
  amount: number;
  quantity: number;
}

/** 조건 팔기: 수익률 상승 시 매도 (목표 수익 실현) */
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

export interface AutoInvestSetting {
  stockCode: string;
  enabled: boolean;
  frequency: AutoInvestFrequency;
  /** 실행 요일 (주1회일 때 사용) */
  weekdays: Weekday[];
  /** 실행 일자 1~31 (월1회일 때 사용) */
  dayOfMonth: number;
  /** 소수점/온주 */
  method: OrderMethod;
  /** 수량으로/금액으로 */
  amountMode: AmountMode;
  /** 금액으로일 때 회차 금액 */
  amount: number;
  /** 수량으로일 때 회차 수량(주) */
  quantity: number;
  /** 부족금액 자동충전 */
  autoCharge: boolean;
  /** 실행 시간 "HH:mm" */
  executeTime: string;
  buyCondition: BuyCondition;
  sellCondition: SellCondition;
}

/** 저장 요청 (stockCode는 경로) */
export type SaveAutoInvestRequest = Omit<AutoInvestSetting, "stockCode">;
