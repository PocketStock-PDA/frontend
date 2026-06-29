"use client";

import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  Star,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useNotifications } from "@/hooks/queries/useNotifications";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/hooks/mutations/useMarkNotificationRead";
import { cn } from "@/lib/utils";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import type { NotificationItem } from "@/types/domain/notification";
import { parseUTC } from "@/lib/utils/date";

// ── helpers ─────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const QTY_FMT = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 8 });

type NotificationData = Record<string, unknown>;

function isRecord(value: unknown): value is NotificationData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dataOf(n: NotificationItem): NotificationData {
  return isRecord(n.data) ? n.data : {};
}

function textOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function hasNumberValue(value: unknown): value is number | string {
  return (
    (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" &&
      value.trim().length > 0 &&
      Number.isFinite(Number(value)))
  );
}

function notificationTime(n: NotificationItem) {
  return textOf(n.occurredAt) ?? n.createdAt;
}

function stockLabel(d: NotificationData) {
  return textOf(d.stockName) ?? textOf(d.stockCode) ?? "종목";
}

function triggerLabel(trigger: unknown, side: unknown) {
  switch (trigger) {
    case "PERIODIC":
      return "정기매수";
    case "DIP_BUY":
      return "물타기";
    case "TAKE_PROFIT":
      return "익절";
    default:
      return side === "SELL" ? "매도" : "매수";
  }
}

function statusLabel(status: unknown) {
  switch (status) {
    case "ACCEPTED":
    case "QUEUED":
      return "접수";
    case "FILLED":
      return "완료";
    case "FAILED":
      return "실패";
    default:
      return "실행";
  }
}

function statusVerb(status: unknown) {
  switch (status) {
    case "ACCEPTED":
    case "QUEUED":
      return "접수되었어요";
    case "FILLED":
      return "완료됐어요";
    case "FAILED":
      return "실패했어요";
    default:
      return "실행됐어요";
  }
}

function amountText(d: NotificationData) {
  const currency = textOf(d.currency) ?? "KRW";
  if (hasNumberValue(d.amount)) {
    return currency === "USD" ? formatUSD(d.amount) : formatKRW(d.amount);
  }
  if (hasNumberValue(d.quantity)) {
    return `${QTY_FMT.format(Number(d.quantity))}주`;
  }
  return null;
}

function autoInvestText(n: NotificationItem) {
  if (n.type !== "AUTO_INVEST_EXECUTED" && n.type !== "AUTO_INVEST_FAILED") {
    return null;
  }

  const d = dataOf(n);
  if (Object.keys(d).length === 0) return null;

  const name = stockLabel(d);
  const trigger = triggerLabel(d.trigger, d.side);
  const value = amountText(d);
  const failed = n.type === "AUTO_INVEST_FAILED" || d.status === "FAILED";

  if (failed) {
    const reason = textOf(d.reason);
    return {
      title: `${trigger} 실패`,
      body: `${name} ${trigger} 실패${reason ? ` (${reason})` : ""}`,
    };
  }

  return {
    title: `${trigger} ${statusLabel(d.status)}`,
    body: [name, value, trigger, statusVerb(d.status)]
      .filter(Boolean)
      .join(" "),
  };
}

function notificationText(n: NotificationItem) {
  return autoInvestText(n) ?? { title: n.title, body: n.body };
}

function routeFor(n: NotificationItem) {
  const url = textOf(n.url);
  if (url) return url;

  const d = dataOf(n);
  const stockCode = textOf(d.stockCode);
  switch (n.type) {
    case "TRADE_FILLED":
      return stockCode
        ? `/portfolio/detail?stockCode=${encodeURIComponent(stockCode)}`
        : "/portfolio";
    case "UNFILLED":
      return "/history?tab=pending";
    case "AUTO_INVEST_EXECUTED":
    case "AUTO_INVEST_FAILED":
      return stockCode
        ? `/portfolio/detail?stockCode=${encodeURIComponent(stockCode)}&view=collect`
        : "/portfolio";
    case "GOAL_NUDGE":
      return "/budget";
    default:
      return null;
  }
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** 그룹 헤더: 오늘 / 어제 / N일 전 / YYYY.MM.DD */
function dayLabel(iso: string) {
  const d = parseUTC(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY_MS);
  if (diff <= 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff < 7) return `${diff}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 우측 상대시간: 방금 / N분 전 / N시간 전 / 어제 HH:mm / MM.DD HH:mm */
function relTime(iso: string) {
  const d = parseUTC(iso);
  if (isNaN(d.getTime())) return "";
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY_MS);
  if (diff <= 0) {
    const min = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (min < 1) return "방금";
    if (min < 60) return `${min}분 전`;
    return `${Math.floor(min / 60)}시간 전`;
  }
  if (diff === 1) return `어제 ${hm}`;
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${hm}`;
}

/** 알림 종류 → 아이콘/색상. 백엔드 type 어휘 확정 전 키워드 매칭 + Bell fallback. */
function notifIcon(type: string): { Icon: LucideIcon; tone: string } {
  const t = type.toUpperCase();
  if (t === "AUTO_INVEST_EXECUTED")
    return { Icon: Clock, tone: "bg-sky-50 text-sky-500" };
  if (t === "AUTO_INVEST_FAILED")
    return { Icon: XCircle, tone: "bg-rose-50 text-rose-500" };
  if (t.includes("FILLED") || t.includes("TRADE"))
    return { Icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-500" };
  if (t.includes("UNFILLED") || t.includes("FAIL") || t.includes("REJECT"))
    return { Icon: XCircle, tone: "bg-rose-50 text-rose-500" };
  if (t.includes("DEPOSIT") || t.includes("CMA"))
    return { Icon: CreditCard, tone: "bg-blue-50 text-blue-500" };
  if (t.includes("GOAL") || t.includes("REWARD"))
    return { Icon: Star, tone: "bg-amber-50 text-amber-500" };
  if (t.includes("PRICE") || t.includes("ALERT"))
    return { Icon: Activity, tone: "bg-blue-50 text-blue-500" };
  if (t.includes("REBALANC"))
    return { Icon: Clock, tone: "bg-muted text-muted-foreground" };
  return { Icon: Bell, tone: "bg-muted text-muted-foreground" };
}

function groupByDay(items: NotificationItem[]) {
  const map = new Map<string, NotificationItem[]>();
  for (const it of items) {
    const key = dayLabel(notificationTime(it));
    const arr = map.get(key) ?? [];
    arr.push(it);
    map.set(key, arr);
  }
  return [...map.entries()].map(([label, rows]) => ({ label, rows }));
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 py-4">
          <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── page ────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;
  const groups = groupByDay(items);

  const handleTap = (n: NotificationItem) => {
    if (!n.isRead) markRead.mutate(n.id);
    const url = routeFor(n);
    if (url) router.push(url);
  };

  return (
    <>
      <AppHeader
        variant="sub"
        title="알림"
        right={
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={unread === 0 || markAll.isPending}
            className="text-sm font-medium text-primary disabled:text-muted-foreground"
          >
            모두 읽음
          </button>
        }
      />

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          className="py-16"
        />
      ) : items.length === 0 ? (
        <EmptyState title="알림이 없어요" className="py-16" />
      ) : (
        <div>
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-1 mt-4 px-1 text-[12px] text-muted-foreground">
                {g.label}
              </p>
              <div className="divide-y divide-border">
                {g.rows.map((n) => {
                  const { Icon, tone } = notifIcon(n.type);
                  const text = notificationText(n);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleTap(n)}
                      className="flex w-full gap-3 py-4 text-left"
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          tone,
                          n.isRead && "opacity-50",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm",
                              n.isRead
                                ? "font-medium text-muted-foreground"
                                : "font-bold text-foreground",
                            )}
                          >
                            {text.title}
                          </p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {relTime(notificationTime(n))}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "mt-0.5 text-[13px]",
                            n.isRead
                              ? "text-muted-foreground/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {text.body}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
