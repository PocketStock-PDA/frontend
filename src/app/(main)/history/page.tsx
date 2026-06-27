"use client";

import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Chip,
  DateGroup,
  ListSkeleton,
  SummaryCard,
  fmtMoney,
  fmtTime,
  groupByDate,
} from "@/components/features/history/shared";
import { useOrders } from "@/hooks/queries/useOrders";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { formatKRW } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import type { StockDetail } from "@/types/domain/trading";
import type { OrderHistoryItem } from "@/types/domain/order";

// ── 매매 내역 ───────────────────────────────────────────────────────────────

type TradeFilter = "all" | "BUY" | "SELL";

function formatShares(q: Decimal) {
  return q.toDecimalPlaces(4).toString();
}

export default function HistoryPage() {
  const [filter, setFilter] = useState<TradeFilter>("all");
  const ordersQ = useOrders();
  // 실제 체결 수량이 없는(0주) 내역은 제외.
  const orders = useMemo(
    () => (ordersQ.data ?? []).filter((o) => toDecimal(o.quantity).gt(0)),
    [ordersQ.data],
  );

  // 종목명/로고/현재가 보강 — 응답엔 stockCode만 있어 상세를 병렬 조회.
  const codes = useMemo(
    () => [...new Set(orders.map((o) => o.stockCode))],
    [orders],
  );
  const detailQueries = useStockDetails(codes);
  const detailMap = useMemo(() => {
    const m = new Map<string, StockDetail>();
    codes.forEach((c, i) => {
      const d = detailQueries[i]?.data;
      if (d) m.set(c, d);
    });
    return m;
  }, [codes, detailQueries]);

  // 한 주문의 통화·체결금액 — 확정 체결가(o.price)가 있을 때만 산출.
  // 소수점 미체결은 price가 없어 amount=null(시세로 환산하면 과거 금액이 시세 따라 변해 부정확).
  const amountOf = (o: OrderHistoryItem) => {
    const currency = detailMap.get(o.stockCode)?.currency ?? "KRW";
    const px = toDecimal(o.price);
    const amount = px.gt(0) ? px.times(toDecimal(o.quantity)) : null;
    return { currency, amount };
  };

  // 이번 달 총 매수 (KRW 확정 매수 합계)
  const totalBuy = useMemo(() => {
    const now = new Date();
    return orders.reduce((sum, o) => {
      if (o.side !== "BUY") return sum;
      const d = new Date(o.createdAt);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())
        return sum;
      const { currency, amount } = amountOf(o);
      return currency === "KRW" && amount ? sum.plus(amount) : sum;
    }, new Decimal(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, detailMap]);

  const filtered = orders.filter((o) =>
    filter === "all" ? true : o.side === filter,
  );
  const groups = groupByDate(filtered, (o) => o.createdAt);

  return (
    <>
      <AppHeader variant="sub" title="매매 내역" />

      <div className="flex gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          전체
        </Chip>
        <Chip active={filter === "BUY"} onClick={() => setFilter("BUY")}>
          매수
        </Chip>
        <Chip active={filter === "SELL"} onClick={() => setFilter("SELL")}>
          매도
        </Chip>
      </div>

      <div className="mt-3">
        <SummaryCard
          label="이번 달 총 매수"
          value={formatKRW(totalBuy.toString())}
          valueClassName="text-up"
        />
      </div>

      {ordersQ.isLoading ? (
        <ListSkeleton />
      ) : ordersQ.isError ? (
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          className="py-16"
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="매매 내역이 없어요" className="py-16" />
      ) : (
        <div>
          {groups.map((g) => (
            <DateGroup key={g.header} header={g.header}>
              {g.rows.map((o) => {
                const detail = detailMap.get(o.stockCode);
                const name = detail?.stockName ?? o.stockCode;
                const isBuy = o.side === "BUY";
                const qty = toDecimal(o.quantity);
                const { currency, amount } = amountOf(o);
                return (
                  <div key={o.orderId} className="flex items-center gap-3 py-3.5">
                    <Avatar className="size-9">
                      {detail?.logoUrl && (
                        <AvatarImage src={detail.logoUrl} alt={name} />
                      )}
                      <AvatarFallback className="text-[11px]">
                        {name.trim().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {name} {isBuy ? "매수" : "매도"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {fmtTime(o.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "font-numeric text-sm font-bold",
                          isBuy ? "text-up" : "text-down",
                        )}
                      >
                        {isBuy ? "+" : "-"}
                        {formatShares(qty)}주
                      </p>
                      {amount && (
                        <p className="font-numeric text-[11px] text-muted-foreground">
                          {fmtMoney(
                            currency,
                            amount.toDecimalPlaces(currency === "USD" ? 2 : 0),
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </DateGroup>
          ))}
        </div>
      )}
    </>
  );
}
