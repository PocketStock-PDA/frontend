export type StockEventType = "RECOMMEND" | "DIVIDEND" | "EARNINGS";

export interface StockEvent {
  eventId: number;
  date: string; // yyyy-MM-dd
  type: StockEventType;
  title: string;
  stockCode: string;
  stockName: string;
  detail: string;
  completed: boolean;
  currentPrice?: number;
  changeRate?: number;
}

export interface StockCalendarResponse {
  year: number;
  month: number;
  events: StockEvent[];
}
