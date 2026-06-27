"use client";

import type Decimal from "decimal.js";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

// 거래내역(매매·CMA) 공용 helpers ─ /history 와 /cma 에서 함께 사용.

export function fmtTime(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dateKey(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "오늘 · 2026.06.04" / "2026.06.03" */
function dateHeader(iso: string) {
  const d = new Date(iso);
  const key = dateKey(iso);
  return !isNaN(d.getTime()) && isSameDay(d, new Date()) ? `오늘 · ${key}` : key;
}

/** 최신순 입력 순서를 보존하며 날짜별 그룹핑 */
export function groupByDate<T>(items: T[], getIso: (t: T) => string) {
  const map = new Map<string, { header: string; rows: T[] }>();
  for (const it of items) {
    const iso = getIso(it);
    const key = dateKey(iso);
    const group = map.get(key) ?? { header: dateHeader(iso), rows: [] as T[] };
    group.rows.push(it);
    map.set(key, group);
  }
  return [...map.values()];
}

export const fmtMoney = (currency: string, value: Decimal | number | string) =>
  currency === "USD" ? formatUSD(value.toString()) : formatKRW(value.toString());

// 필터 칩
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function SummaryCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-brand-surface px-4 py-3.5">
      <span className="text-[13px] font-medium text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-numeric text-base font-bold",
          valueClassName ?? "text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function DateGroup({
  header,
  children,
}: {
  header: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 mt-4 px-1 text-[12px] text-muted-foreground">{header}</p>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          <div className="size-9 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2 text-right">
            <div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-2.5 w-12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
