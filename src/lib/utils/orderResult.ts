import Decimal from "decimal.js";
import type {
  SplitOrderResponse,
  WholeOrderResponse,
} from "@/types/domain/order";


/**
 * 소수점 주문 split 응답 → 사용자 토스트 메시지.
 * 온주분(즉시 체결)과 소수분(차수 대기)을 각각 표기 — 둘 다 있으면 "온주 N주 즉시 체결 · 소수 M주 매수 접수".
 * 소수분이 QUEUED면 다음 차수까지 남은 시간을 description에 표시.
 */
export function splitOrderToast(
  side: "BUY" | "SELL",
  r: SplitOrderResponse,
): { title: string; description?: string } {
  const verb = side === "BUY" ? "매수" : "매도";
  const segs: string[] = [];
  if (r.wholeQty) {
    segs.push(`온주 ${r.wholeQty}주 즉시 체결`);
  }
  if (r.fractionalEstQty !== null) {
    const q = new Decimal(r.fractionalEstQty).toDecimalPlaces(6).toString();
    segs.push(`소수 ${q}주 ${verb} 접수`);
  }
  const title = segs.length > 0 ? segs.join(" · ") : `${verb} 주문이 접수됐어요`;
  if (r.fractionalStatus === "QUEUED") {
    return { title, description: "다음 회차(1분 내)에 체결돼요" };
  }
  return { title };
}

/**
 * 온주 주문 응답 → 토스트 메시지.
 * FILLED=즉시 체결("N주 체결 · 체결가 …") / PENDING=지정가 접수("체결되면 알려드려요").
 */
export function wholeOrderToast(
  r: WholeOrderResponse,
  fmtAmount: (v: number | string) => string,
): { title: string; description?: string } {
  const verb = r.side === "BUY" ? "매수" : "매도";
  if (r.status === "FILLED") {
    return {
      title: `${verb} ${r.quantity}주 체결됐어요`,
      description: `체결가 ${fmtAmount(r.fillPrice ?? 0)} · 총 ${fmtAmount(r.totalAmount ?? 0)}`,
    };
  }
  if (r.status === "PENDING") {
    return {
      title: `지정가 ${r.quantity}주 주문 접수`,
      description: "체결되면 알려드려요",
    };
  }
  return { title: `${verb} 주문이 접수됐어요` };
}
