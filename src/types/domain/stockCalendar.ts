export type StockEventType = "RECOMMEND" | "DIVIDEND" | "EARNINGS";

export interface StockEvent {
  stockCode: string;
  eventType: StockEventType;
  eventDate: string; // yyyy-MM-dd
  title: string;
  detail: string;
}

export interface StockCalendarResponse {
  events: StockEvent[];
}
