"use client";

import { format } from "date-fns";
import { parseUTC } from "@/lib/utils/date";
import { ko } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useBudgetTransactions } from "@/hooks/queries/useBudget";
import { formatKRW } from "@/lib/utils/currency";
import { getCategoryIcon } from "../_utils/categoryIcon";

export default function BudgetDayPage() {
  const searchParams = useSearchParams();
  const current = new Date();
  const yearParam = Number(searchParams.get("year"));
  const monthParam = Number(searchParams.get("month"));
  const dayParam = Number(searchParams.get("day"));
  const year =
    Number.isInteger(yearParam) && yearParam > 0
      ? yearParam
      : current.getFullYear();
  const month =
    Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam
      : current.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const day =
    Number.isInteger(dayParam) && dayParam >= 1 && dayParam <= lastDay
      ? dayParam
      : Math.min(current.getDate(), lastDay);

  const txQ = useBudgetTransactions({ type: "DAILY", year, month, day });

  const title = format(new Date(year, month - 1, day), "M월 d일 (eee)", {
    locale: ko,
  });

  return (
    <>
      <AppHeader variant="sub" title={title} />
      {txQ.isLoading ? (
        <SkeletonCard lines={4} className="mt-4 h-48" />
      ) : txQ.isError ? (
        <EmptyState title="내역을 불러오지 못했어요" className="mt-8" />
      ) : !txQ.data?.transactions.length ? (
        <EmptyState title="이 날 소비 내역이 없어요" className="mt-8" />
      ) : (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              총 {txQ.data.transactions.length}건
            </span>
            <span className="font-numeric text-sm font-bold text-foreground">
              -{formatKRW(txQ.data.totalAmount)}
            </span>
          </div>
          <div className="divide-y divide-border/50">
            {txQ.data.transactions.map((tx) => {
              const Icon = getCategoryIcon(tx.category);
              return (
                <div
                  key={tx.transactionId}
                  className="flex items-center gap-3.5 py-3.5"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent">
                    <Icon className="size-[17px] text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {tx.description}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tx.category} · {formatTime(tx.transactedAt)}
                    </p>
                  </div>
                  <span className="font-numeric shrink-0 text-sm font-bold text-foreground">
                    -{formatKRW(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function formatTime(isoStr: string) {
  const d = parseUTC(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
