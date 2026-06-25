"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EmptyState } from "@/components/common/EmptyState";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useAutoInvestSummary } from "@/hooks/queries/useAutoInvest";
import { useSetAutoInvestStatusList } from "@/hooks/mutations/useSaveAutoInvest";
import { formatKRW } from "@/lib/utils/currency";
import { tradingAutoDetailPath } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import {
  intToWeekday,
  type AutoInvestPeriod,
  type AutoInvestStock,
  type Weekday,
} from "@/types/domain/autoInvest";

const FREQ_LABEL: Record<AutoInvestPeriod, string> = {
  DAILY: "매일",
  WEEKLY: "주1회",
  MONTHLY: "월1회",
};
const WEEKDAY_KO: Record<Weekday, string> = {
  MON: "월요일",
  TUE: "화요일",
  WED: "수요일",
  THU: "목요일",
  FRI: "금요일",
  SAT: "토요일",
  SUN: "일요일",
};

/** "주1회 · 월요일 · 10,000원" */
function settingSummary(s: AutoInvestStock): string {
  const when =
    s.period === "WEEKLY"
      ? ` · ${WEEKDAY_KO[intToWeekday(s.periodDay)]}`
      : s.period === "MONTHLY"
        ? ` · 매월 ${s.periodDay}일`
        : "";
  const amt =
    s.amountType === "QUANTITY"
      ? `${s.buyQuantity ?? 0}주`
      : s.currency === "USD"
        ? `$${s.buyAmount ?? 0}`
        : formatKRW(String(s.buyAmount ?? 0));
  return `${FREQ_LABEL[s.period]}${when} · ${amt}`;
}

interface Row {
  code: string;
  name: string;
  logoUrl: string | null;
  setting: AutoInvestStock | null;
  enabled: boolean;
}

/**
 * 주식 모으기 종합 설정 (시안 270-7107) — 보유 종목을 모으기 중/안 함으로 나눠 관리.
 * 개별 구성·저장은 /trading/auto/detail?stockCode=...에서. 여기선 on/off 토글(PATCH status) + 진입.
 */
export default function AutoInvestManagePage() {
  const router = useRouter();
  const holdingsQ = useHoldings();
  const holdings = holdingsQ.data ?? [];
  const summaryQ = useAutoInvestSummary();
  const save = useSetAutoInvestStatusList();

  // 종합조회 stocks를 code로 인덱싱
  const stocksByCode = useMemo(() => {
    const m = new Map<string, AutoInvestStock>();
    summaryQ.data?.stocks.forEach((s) => m.set(s.stockCode, s));
    return m;
  }, [summaryQ.data]);

  // 보유 + 모으기 설정 종목 합집합 — 설정만 하고 미보유(첫 매수 전)여도 노출
  const holdingCodes = holdings.map((h) => h.stockCode);
  const heldSet = new Set(holdingCodes);
  const codes = [
    ...holdingCodes,
    ...(summaryQ.data?.stocks ?? [])
      .map((s) => s.stockCode)
      .filter((c) => !heldSet.has(c)),
  ];
  const details = useStockDetails(codes);

  // 토글 로컬 오버라이드(코드→enabled)
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});

  const detailsLoading =
    codes.length > 0 &&
    (details.some((d) => d.isLoading) || summaryQ.isLoading);

  if (holdingsQ.isLoading || detailsLoading) {
    return (
      <>
        <AppHeader variant="sub" title="주식 모으기 설정" />
        <div className="space-y-3">
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
        </div>
      </>
    );
  }

  if (holdingsQ.isError) {
    return (
      <>
        <AppHeader variant="sub" title="주식 모으기 설정" />
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => holdingsQ.refetch()}>
              다시 시도
            </Button>
          }
        />
      </>
    );
  }

  const rows: Row[] = codes.map((code, i) => {
    const setting = stocksByCode.get(code) ?? null;
    const detail = details[i]?.data;
    const enabled = enabledMap[code] ?? setting?.isActive ?? false;
    return {
      code,
      name: detail?.stockName ?? setting?.stockName ?? code,
      logoUrl: detail?.logoUrl ?? null,
      setting,
      enabled,
    };
  });
  const onRows = rows.filter((r) => r.enabled);
  const offRows = rows.filter((r) => !r.enabled);

  const goConfigure = (code: string) => router.push(tradingAutoDetailPath(code));

  const toggle = (r: Row, next: boolean) => {
    // 설정이 없는 종목을 켜려면 먼저 개별 설정에서 구성해야 함
    if (next && !r.setting) {
      goConfigure(r.code);
      return;
    }
    setEnabledMap((m) => ({ ...m, [r.code]: next }));
  };

  const handleSave = () => {
    if (save.isPending) return;
    // 등록된 종목 중 활성 상태가 바뀐 것만 PATCH (PAUSE/RESUME)
    const items = rows
      .filter((r) => r.setting && r.enabled !== r.setting.isActive)
      .map((r) => ({ id: (r.setting as AutoInvestStock).id, active: r.enabled }));
    save.mutate(items, {
      onSuccess: () => {
        toast.success("설정을 저장했어요");
        router.back();
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError
            ? err.message
            : "저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
        ),
    });
  };

  const RowCard = ({ r }: { r: Row }) => {
    const initial = (r.name || r.code).trim().charAt(0).toUpperCase();
    return (
      <div
        className={cn(
          "rounded-2xl border border-border p-4",
          !r.enabled && "bg-muted/30",
        )}
      >
        <div className="flex items-center gap-3">
          <Avatar className={cn(!r.enabled && "opacity-60")}>
            {r.logoUrl && <AvatarImage src={r.logoUrl} alt={r.name} />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => goConfigure(r.code)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-sm font-bold text-foreground">{r.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {r.setting ? settingSummary(r.setting) : `${r.code} · 모으기 미설정`}
            </p>
          </button>
          <Switch
            checked={r.enabled}
            onCheckedChange={(next) => toggle(r, next)}
            aria-label={`${r.name} 자동모으기`}
          />
        </div>

        {!r.enabled && (
          <Button
            variant="outline"
            onClick={() => goConfigure(r.code)}
            className="mt-3 h-11 w-full border-primary text-sm font-bold text-primary hover:bg-brand-surface"
          >
            <Plus className="size-4" />
            모으기 시작하기
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <AppHeader variant="sub" title="주식 모으기 설정" />
      <div className="space-y-6">
        {/* 모으기 중 */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            <p className="text-[13px] font-medium text-foreground">
              모으기 중 {onRows.length}종목
            </p>
          </div>
          {onRows.length === 0 ? (
            <EmptyState title="모으기 중인 종목이 없어요" />
          ) : (
            <div className="space-y-2">
              {onRows.map((r) => (
                <RowCard key={r.code} r={r} />
              ))}
            </div>
          )}
        </section>

        {/* 모으기 안 함 */}
        {offRows.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-muted-foreground/50" />
              <p className="text-[13px] font-medium text-muted-foreground">
                모으기 안 함 {offRows.length}종목
              </p>
            </div>
            <div className="space-y-2">
              {offRows.map((r) => (
                <RowCard key={r.code} r={r} />
              ))}
            </div>
          </section>
        )}

        {rows.length === 0 && (
          <EmptyState
            title="모으는 종목이 없어요"
            description="종목을 보유하거나 모으기를 설정하면 여기서 관리할 수 있어요."
          />
        )}

        {rows.length > 0 && (
          <Button
            onClick={handleSave}
            disabled={save.isPending}
            className="h-14 w-full text-base font-bold"
          >
            {save.isPending ? "저장 중…" : "설정 저장"}
          </Button>
        )}
      </div>
    </>
  );
}
