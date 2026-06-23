"use client";

import { useState } from "react";
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
import { useAutoInvestList } from "@/hooks/queries/useAutoInvest";
import { useSaveAutoInvestList } from "@/hooks/mutations/useSaveAutoInvest";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type {
  AutoInvestFrequency,
  AutoInvestSetting,
  SaveAutoInvestRequest,
  Weekday,
} from "@/types/domain/autoInvest";

const FREQ_LABEL: Record<AutoInvestFrequency, string> = {
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
function settingSummary(s: AutoInvestSetting): string {
  const when =
    s.frequency === "WEEKLY"
      ? ` · ${WEEKDAY_KO[s.weekdays[0] ?? "MON"]}`
      : s.frequency === "MONTHLY"
        ? ` · 매월 ${s.dayOfMonth}일`
        : "";
  const amt =
    s.amountMode === "QTY" ? `${s.quantity}주` : formatKRW(s.amount);
  return `${FREQ_LABEL[s.frequency]}${when} · ${amt}`;
}

interface Row {
  code: string;
  name: string;
  logoUrl: string | null;
  setting: AutoInvestSetting | null;
  enabled: boolean;
}

/**
 * 주식 모으기 종합 설정 (시안 270-7107) — 보유 종목을 모으기 중/안 함으로 나눠 관리.
 * 개별 구성·저장은 /trading/{code}/auto에서. 여기선 on/off 토글 + 진입.
 * ⚠️ 자동모으기 API 미구현 → 스텁(AUTO_INVEST_API_READY). 현재 설정은 모두 null로 와 "모으기 안 함"에 표시.
 */
export default function AutoInvestManagePage() {
  const router = useRouter();
  const holdingsQ = useHoldings();
  const holdings = holdingsQ.data ?? [];
  const codes = holdings.map((h) => h.stockCode);
  const details = useStockDetails(codes);
  const settings = useAutoInvestList(codes);
  const save = useSaveAutoInvestList();

  // 토글 로컬 오버라이드(코드→enabled)
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});

  const detailsLoading =
    codes.length > 0 &&
    (details.some((d) => d.isLoading) || settings.some((s) => s.isLoading));

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

  const rows: Row[] = holdings.map((h, i) => {
    const setting = settings[i]?.data ?? null;
    const detail = details[i]?.data;
    const enabled = enabledMap[h.stockCode] ?? setting?.enabled ?? false;
    return {
      code: h.stockCode,
      name: detail?.stockName ?? h.stockCode,
      logoUrl: detail?.logoUrl ?? null,
      setting,
      enabled,
    };
  });
  const onRows = rows.filter((r) => r.enabled);
  const offRows = rows.filter((r) => !r.enabled);

  const goConfigure = (code: string) => router.push(`/trading/${code}/auto`);

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
    // 설정 보유 + enabled 변경분만 저장(미설정 종목은 개별 페이지에서 구성)
    const items = rows
      .filter((r) => r.setting && r.enabled !== r.setting.enabled)
      .map((r) => {
        const s = r.setting as AutoInvestSetting;
        const setting: SaveAutoInvestRequest = {
          enabled: r.enabled,
          frequency: s.frequency,
          weekdays: s.weekdays,
          dayOfMonth: s.dayOfMonth,
          method: s.method,
          amountMode: s.amountMode,
          amount: s.amount,
          quantity: s.quantity,
          autoCharge: s.autoCharge,
          executeTime: s.executeTime,
          buyCondition: s.buyCondition,
          sellCondition: s.sellCondition,
        };
        return { stockCode: r.code, setting };
      });
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
            title="보유 종목이 없어요"
            description="종목을 보유하면 여기서 자동모으기를 관리할 수 있어요."
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
