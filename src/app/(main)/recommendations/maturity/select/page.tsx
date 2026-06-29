"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronRight, X, ArrowDown, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { InstitutionLogo } from "@/components/common/InstitutionLogo";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { SectionHeader } from "@/components/common/SectionHeader";
import { useMaturityAccounts } from "@/hooks/queries/useMaturityAccounts";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useMaturityReservations } from "@/hooks/queries/useMaturityReservations";
import { useCancelMaturityReservation } from "@/hooks/mutations/useCancelMaturityReservation";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useDividendReinvest } from "@/hooks/queries/useDividendReinvest";
import { useDividendHistory } from "@/hooks/queries/useDividendHistory";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useSetDividendReinvest } from "@/hooks/mutations/useSetDividendReinvest";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { MaturityTriggerAccount } from "@/types/domain/asset";
import type { MaturityReservation, MaturityReservationStatus, DividendPayoutStatus, DividendPayout } from "@/types/domain/trading";
import type { DividendReinvestSetting } from "@/types/domain/trading";

type Tab = "accounts" | "history" | "drip";

/** accountId → 은행 정보(로고 코드 + 폴백 표시명). (#171) */
type BankInfo = { code: string; name: string };

// ── 포맷 헬퍼 ─────────────────────────────────────────────────────────────

function formatMD(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${parseInt(m ?? "0", 10)}월 ${parseInt(d ?? "0", 10)}일`;
}

// D-day는 임박 색 구분 없이 브랜드 톤(파랑)으로 통일 — featured 카드·만기 굴리기 히어로와 일치.
function ddayTone(_days: number): string {
  return "text-primary";
}

function ddayLabel(days: number): string {
  return days === 0 ? "D-day" : `D-${days}`;
}

const STATUS_META: Record<MaturityReservationStatus, { label: string; cls: string }> = {
  RESERVED: { label: "예약됨", cls: "bg-brand-surface text-primary" },
  EXECUTED: { label: "체결됨", cls: "bg-brand-surface text-primary" },
  CANCELLED: { label: "취소됨", cls: "bg-muted text-muted-foreground" },
  FAILED: { label: "체결 실패", cls: "bg-destructive/10 text-destructive" },
};

// ── 페이지 ────────────────────────────────────────────────────────────────

const TABS: Tab[] = ["accounts", "history", "drip"];

export default function MaturitySelectPage() {
  const router = useRouter();
  const params = useSearchParams();
  // 예약 완료 후 reserve가 ?tab=history로 보내면 전환 내역 탭으로 진입(그 외엔 예금·적금).
  const paramTab = params.get("tab");
  const [tab, setTab] = useState<Tab>(
    paramTab && TABS.includes(paramTab as Tab) ? (paramTab as Tab) : "accounts",
  );

  const { data: accounts = [], isLoading: accLoading, isError } = useMaturityAccounts();
  const { data: reservations = [], isLoading: resLoading } = useMaturityReservations();
  const { data: bankAccounts = [] } = useBankAccounts();
  const cancelMutation = useCancelMaturityReservation();

  // 만기 예적금 accountId → 은행 정보(로고 + 폴백 텍스트용). 백엔드 DTO에 기관
  // 식별자가 없어 보유 계좌 목록(useBankAccounts)과 accountId로 조인한다. (#171)
  const bankById = useMemo(
    () =>
      new Map(
        bankAccounts.map((a) => [a.accountId, { code: a.bankCode, name: a.bankName }]),
      ),
    [bankAccounts],
  );

  // 2-step 취소: 첫 탭 → 대기, 두 번째 탭 → 실행. 4초 자동 초기화.
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null);
  useEffect(() => {
    if (pendingCancelId === null) return;
    const t = setTimeout(() => setPendingCancelId(null), 4000);
    return () => clearTimeout(t);
  }, [pendingCancelId]);

  const isLoading = accLoading || resLoading;

  const handleCancel = (id: number) => {
    if (cancelMutation.isPending) return;
    if (pendingCancelId === id) {
      cancelMutation.mutate(id, {
        onSuccess: () => { toast.success("예약이 취소됐어요."); setPendingCancelId(null); },
        onError: () => { toast.error("취소하지 못했어요. 잠시 후 다시 시도해 주세요."); setPendingCancelId(null); },
      });
    } else {
      setPendingCancelId(id);
    }
  };

  const goConvert = (accountId: number) =>
    router.push(`/recommendations/maturity?accountId=${accountId}`);

  // 전환 내역 탭: RESERVED 먼저, 각 그룹 내 최신순
  const sortedReservations = useMemo(() => {
    const byDesc = (a: MaturityReservation, b: MaturityReservation) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const reserved = reservations.filter((r) => r.status === "RESERVED").sort(byDesc);
    const rest = reservations.filter((r) => r.status !== "RESERVED").sort(byDesc);
    return [...reserved, ...rest];
  }, [reservations]);

  if (isLoading) {
    return (
      <>
        <AppHeader variant="sub" title="만기 자금 굴리기" />
        <div className="space-y-4">
          <SkeletonCard lines={1} className="h-10" />
          <SkeletonCard lines={3} className="h-40" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader variant="sub" title="만기 자금 굴리기" />

      <div className="space-y-5">
        {/* ── 탭 ─────────────────────────────────────────────────────── */}
        <SegmentedControl
          options={[
            { label: "예금·적금", value: "accounts" },
            { label: "전환 내역", value: "history" },
            { label: "배당 재투자", value: "drip" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {/* ── 예금·적금 탭 ──────────────────────────────────────────── */}
        {tab === "accounts" && (
          <AccountsTab
            accounts={accounts}
            bankById={bankById}
            isError={isError}
            onConvert={goConvert}
            onLinkAsset={() => router.push("/asset")}
          />
        )}

        {/* ── 전환 내역 탭 ──────────────────────────────────────────── */}
        {tab === "history" && (
          <HistoryTab
            reservations={sortedReservations}
            accounts={accounts}
            bankById={bankById}
            pendingCancelId={pendingCancelId}
            isCancellingId={cancelMutation.isPending ? pendingCancelId : null}
            onCancel={handleCancel}
          />
        )}

        {/* ── 배당 재투자 탭 ─────────────────────────────────────────── */}
        {tab === "drip" && (
          <DripTab reservations={reservations} />
        )}
      </div>
    </>
  );
}

// ── 예금·적금 탭 ──────────────────────────────────────────────────────────

function AccountsTab({
  accounts,
  bankById,
  isError,
  onConvert,
  onLinkAsset,
}: {
  accounts: MaturityTriggerAccount[];
  bankById: Map<number, BankInfo>;
  isError: boolean;
  onConvert: (id: number) => void;
  onLinkAsset: () => void;
}) {
  if (isError) {
    return (
      <EmptyState
        title="불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
      />
    );
  }

  // 이미 자금 굴리기로 예약한 계좌는 선택 탭에서 숨긴다 — 전환 내역 탭에만 노출.
  const selectable = accounts.filter((a) => !a.reserved);

  if (selectable.length === 0) {
    return (
      <EmptyState
        title="만기 예정 예금·적금이 없어요"
        description="만기일이 있는 예금·적금을 연동하면, 만기 자금을 배당주로 굴려 배당을 받을 수 있어요."
        action={
          <Button variant="outline" size="sm" onClick={onLinkAsset}>
            예금·적금 연동하기
          </Button>
        }
      />
    );
  }

  const [featured, ...rest] = selectable;

  return (
    <div className="space-y-5">
      <header className="px-0.5">
        <h1 className="text-xl font-bold leading-snug text-foreground">
          어떤 예금·적금을 굴릴까요?
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          만기가 가까운 순서예요. 하나를 고르면 그 자금에 맞는 배당주를 추천해드려요.
        </p>
      </header>

      {/* Featured */}
      {featured && (
        <button
          type="button"
          onClick={() => onConvert(featured.accountId)}
          className="block w-full rounded-2xl border border-[#dbe7fb] bg-brand-surface p-[18px] text-left transition-[background-color,transform] duration-150 ease-out hover:bg-brand-surface/70 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold text-primary">가장 가까운 만기</span>
            <span className="font-numeric text-[18px] font-bold tabular-nums text-primary">
              {ddayLabel(featured.daysUntilMaturity)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <InstitutionLogo
              code={bankById.get(featured.accountId)?.code}
              name={bankById.get(featured.accountId)?.name ?? featured.accountName}
              className="size-9 shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate text-[17px] font-bold text-foreground">
                {featured.accountName}
              </p>
              <p className="mt-1 font-numeric text-[13px] tabular-nums text-[#3c5170]">
                원금 {formatKRW(featured.principalAmount)} · 연 {featured.interestRate}%
              </p>
            </div>
          </div>
          <p className="mt-1.5 font-numeric text-[11.5px] tabular-nums text-muted-foreground">
            {formatMD(featured.maturityDate)} 만기
          </p>
          <span className="mt-4 flex h-[46px] w-full items-center justify-center rounded-xl bg-primary text-[14.5px] font-bold text-white">
            이 자금 굴리기
          </span>
        </button>
      )}

      {/* 나머지 계좌 */}
      {rest.length > 0 && (
        <div>
          <p className="mb-2 px-0.5 text-[13px] font-bold text-muted-foreground">다른 예금·적금</p>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {rest.map((acc) => (
              <li key={acc.accountId}>
                <AccountRow
                  account={acc}
                  bank={bankById.get(acc.accountId)}
                  onSelect={() => onConvert(acc.accountId)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AccountRow({
  account,
  bank,
  onSelect,
}: {
  account: MaturityTriggerAccount;
  bank?: BankInfo | undefined;
  onSelect: () => void;
}) {
  const { accountName, principalAmount, interestRate, maturityDate, daysUntilMaturity } = account;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
    >
      <InstitutionLogo
        code={bank?.code}
        name={bank?.name ?? accountName}
        className="size-9 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-foreground">{accountName}</p>
        <p className="mt-0.5 font-numeric text-xs tabular-nums text-muted-foreground">
          원금 {formatKRW(principalAmount)} · 연 {interestRate}%
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("font-numeric text-[15px] font-bold tabular-nums", ddayTone(daysUntilMaturity))}>
          {ddayLabel(daysUntilMaturity)}
        </p>
        <p className="mt-0.5 font-numeric text-[11px] tabular-nums text-muted-foreground">
          {formatMD(maturityDate)}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
    </button>
  );
}

// ── 전환 내역 탭 ──────────────────────────────────────────────────────────

interface AccountGroup {
  accountId: number;
  accountName: string | null;
  maturityDate: string;
  principalAmount: number | null;
  interestRate: number | null;
  daysUntilMaturity: number | null;
  reservations: MaturityReservation[];
}

function HistoryTab({
  reservations,
  accounts,
  bankById,
  pendingCancelId,
  isCancellingId,
  onCancel,
}: {
  reservations: MaturityReservation[];
  accounts: MaturityTriggerAccount[];
  bankById: Map<number, BankInfo>;
  pendingCancelId: number | null;
  isCancellingId: number | null;
  onCancel: (id: number) => void;
}) {
  const allCodes = useMemo(() => [...new Set(reservations.map((r) => r.stockCode))], [reservations]);
  const detailQueries = useStockDetails(allCodes);
  const logoByCode = useMemo(() => {
    const m = new Map<string, string | null>();
    allCodes.forEach((code, i) => m.set(code, detailQueries[i]?.data?.logoUrl ?? null));
    return m;
  }, [allCodes, detailQueries]);

  // accountId 기준으로 그룹핑
  const groups = useMemo<AccountGroup[]>(() => {
    const map = new Map<number, MaturityReservation[]>();
    for (const r of reservations) {
      const list = map.get(r.linkedBankAccountId) ?? [];
      list.push(r);
      map.set(r.linkedBankAccountId, list);
    }
    const accountMap = new Map(accounts.map((a) => [a.accountId, a]));
    return [...map.entries()].map(([accountId, list]) => {
      const acc = accountMap.get(accountId) ?? null;
      return {
        accountId,
        accountName: acc?.accountName ?? null,
        maturityDate: list[0]?.maturityDate ?? "",
        principalAmount: acc?.principalAmount ?? null,
        interestRate: acc?.interestRate ?? null,
        daysUntilMaturity: acc?.daysUntilMaturity ?? null,
        reservations: list,
      };
    });
  }, [reservations, accounts]);

  if (groups.length === 0) {
    return (
      <EmptyState
        title="전환 내역이 없어요"
        description="예금·적금 만기 자금을 배당주로 전환 예약하면 여기에 표시돼요."
      />
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <AccountGroupCard
          key={group.accountId}
          group={group}
          bank={bankById.get(group.accountId)}
          logoByCode={logoByCode}
          pendingCancelId={pendingCancelId}
          isCancellingId={isCancellingId}
          onCancel={onCancel}
        />
      ))}
      {pendingCancelId !== null && (
        <p className="text-center text-[11.5px] text-muted-foreground">
          한 번 더 누르면 취소돼요
        </p>
      )}
    </div>
  );
}

// ── 계좌 단위 카드 ────────────────────────────────────────────────────────

function AccountGroupCard({
  group,
  bank,
  logoByCode,
  pendingCancelId,
  isCancellingId,
  onCancel,
}: {
  group: AccountGroup;
  bank?: BankInfo | undefined;
  logoByCode: Map<string, string | null>;
  pendingCancelId: number | null;
  isCancellingId: number | null;
  onCancel: (id: number) => void;
}) {
  const reserved = group.reservations.filter((r) => r.status === "RESERVED");
  const past = group.reservations.filter((r) => r.status !== "RESERVED");
  const hasReserved = reserved.length > 0;
  const totalBuyAmount = group.reservations
    .filter((r) => r.status === "RESERVED")
    .reduce((s, r) => s + Number(r.buyAmount), 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* 예적금 헤더 */}
      <div className="border-b border-border px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <InstitutionLogo
              code={bank?.code}
              name={bank?.name ?? group.accountName ?? "예금·적금"}
              className="size-7 shrink-0"
            />
            <p className="truncate text-[14px] font-bold text-foreground">
              {group.accountName ?? "예금·적금"}
            </p>
          </div>
          {group.daysUntilMaturity !== null && (
            <span
              className={cn(
                "shrink-0 font-numeric text-[12px] font-bold tabular-nums",
                ddayTone(group.daysUntilMaturity),
              )}
            >
              {ddayLabel(group.daysUntilMaturity)}
            </span>
          )}
        </div>
        <p className="mt-1 font-numeric text-[12px] tabular-nums text-muted-foreground">
          {formatMD(group.maturityDate)} 만기
          {group.principalAmount !== null && ` · 원금 ${formatKRW(group.principalAmount)}`}
          {group.interestRate !== null && ` · 연 ${group.interestRate}%`}
        </p>
        {hasReserved && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-brand-surface px-2.5 py-1.5 text-[11.5px] font-bold text-primary">
            <ArrowDown className="size-3 shrink-0" />
            <span className="font-numeric tabular-nums">{formatMD(group.maturityDate)}</span>
            <span>만기일 자동 전환</span>
            {totalBuyAmount > 0 && (
              <span className="ml-auto font-numeric tabular-nums">
                {formatKRW(totalBuyAmount)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* TO: 배당주 목록 */}
      <ul className="divide-y divide-border">
        {reserved.map((r) => (
          <ReservationRow
            key={r.id}
            reservation={r}
            logoUrl={logoByCode.get(r.stockCode) ?? null}
            isPendingCancel={pendingCancelId === r.id}
            isCancelling={isCancellingId === r.id}
            onCancel={() => onCancel(r.id)}
          />
        ))}
        {past.map((r) => (
          <ReservationRow
            key={r.id}
            reservation={r}
            logoUrl={logoByCode.get(r.stockCode) ?? null}
            isPendingCancel={false}
            isCancelling={false}
            onCancel={() => {}}
          />
        ))}
      </ul>
    </div>
  );
}

// ── 배당 재투자 탭 ────────────────────────────────────────────────────────

function formatShares(n: number): string {
  return Number(n).toLocaleString("ko-KR", { maximumFractionDigits: 4 });
}

const DRIP_STATUS_CHIP: Record<DividendPayoutStatus, { label: string; cls: string }> = {
  REINVESTED: { label: "재투자", cls: "bg-brand-surface text-primary" },
  PAID: { label: "CMA 입금", cls: "bg-muted text-muted-foreground" },
  REINVEST_FAILED: { label: "재투자 실패", cls: "bg-destructive/10 text-destructive" },
};

function DripTab({ reservations }: { reservations: MaturityReservation[] }) {
  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useDividendReinvest();
  const { data: history = [], isLoading: historyLoading, isError: historyError } = useDividendHistory();
  const { data: holdings = [] } = useHoldings();
  const setReinvest = useSetDividendReinvest();
  const [pendingCodes, setPendingCodes] = useState<Set<string>>(new Set());

  // 예약 중인 국내 종목 (RESERVED + DOMESTIC) — drip 설정 가능
  const reservedDomesticCodes = useMemo(
    () =>
      new Set(
        reservations
          .filter((r) => r.status === "RESERVED" && r.market === "DOMESTIC")
          .map((r) => r.stockCode),
      ),
    [reservations],
  );

  const settingCodes = useMemo(
    () => new Set((settings ?? []).map((s) => s.stockCode)),
    [settings],
  );

  // 예약됐지만 아직 drip 설정이 없는 종목 — 상단에 추가 노출
  const reservedNotInSettings = useMemo<DividendReinvestSetting[]>(() => {
    const seen = new Set<string>();
    return reservations
      .filter(
        (r) =>
          r.status === "RESERVED" &&
          r.market === "DOMESTIC" &&
          !settingCodes.has(r.stockCode) &&
          !seen.has(r.stockCode) &&
          seen.add(r.stockCode),
      )
      .map((r) => ({ stockCode: r.stockCode, stockName: r.stockName, enabled: false }));
  }, [reservations, settingCodes]);

  const allSettings = useMemo(
    () => [...(settings ?? []), ...reservedNotInSettings],
    [settings, reservedNotInSettings],
  );

  const qtyByCode = useMemo(
    () => new Map(holdings.map((h) => [h.stockCode, h.quantity])),
    [holdings],
  );

  // 로고
  const allCodes = useMemo(() => allSettings.map((s) => s.stockCode), [allSettings]);
  const detailQueries = useStockDetails(allCodes);
  const logoByCode = useMemo(() => {
    const m = new Map<string, string | null>();
    allCodes.forEach((code, i) => m.set(code, detailQueries[i]?.data?.logoUrl ?? null));
    return m;
  }, [allCodes, detailQueries]);

  // 배당 내역 로고
  const historyCodes = useMemo(() => [...new Set(history.map((h) => h.stockCode))], [history]);
  const historyDetailQueries = useStockDetails(historyCodes);
  const historyLogoByCode = useMemo(() => {
    const m = new Map<string, string | null>();
    historyCodes.forEach((code, i) => m.set(code, historyDetailQueries[i]?.data?.logoUrl ?? null));
    return m;
  }, [historyCodes, historyDetailQueries]);

  const { received, reinvested, reinvestCount } = useMemo(() => {
    const recv = history.reduce((sum, p) => sum + p.grossAmount, 0);
    const done = history.filter((p) => p.status === "REINVESTED");
    return {
      received: recv,
      reinvested: done.reduce((sum, p) => sum + (p.reinvestAmount ?? 0), 0),
      reinvestCount: done.length,
    };
  }, [history]);

  const onCount = allSettings.filter((s) => s.enabled).length;
  const hasHistory = received > 0;

  const handleToggle = (stockCode: string, enabled: boolean) => {
    setPendingCodes((prev) => new Set(prev).add(stockCode));
    setReinvest.mutate(
      { stockCode, enabled },
      {
        onError: () => toast.error("설정을 변경하지 못했어요. 잠시 후 다시 시도해 주세요."),
        onSettled: () =>
          setPendingCodes((prev) => {
            const next = new Set(prev);
            next.delete(stockCode);
            return next;
          }),
      },
    );
  };

  if (settingsLoading || historyLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={3} className="h-32" />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  if (settingsError || historyError) {
    return (
      <EmptyState
        title="불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
      />
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* ── 복리 요약 ─────────────────────────────────────────────── */}
      {hasHistory ? (
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">지금까지 받은 배당</p>
          <p className="mt-1 font-numeric text-[26px] font-bold leading-tight tabular-nums text-foreground">
            {formatKRW(received)}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            받은 배당으로 같은 주식을 더 사서,{" "}
            <b className="font-bold text-foreground">배당이 또 배당을 낳고</b> 있어요.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <DripFlowStep label="받은 배당" value={formatKRW(received)} />
            <ArrowRight className="size-4 shrink-0 text-muted-foreground/40" />
            <DripFlowStep label="재투자됨" value={formatKRW(reinvested)} />
            <ArrowRight className="size-4 shrink-0 text-muted-foreground/40" />
            <DripFlowStep label="재투자 횟수" value={`${reinvestCount}회`} />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-brand-surface p-5">
          <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-primary">
            <CheckCircle2 className="size-[17px]" />
            배당 재투자
          </div>
          <p className="mt-2.5 text-[15.5px] font-bold leading-snug text-foreground">
            배당이 들어오면 자동으로
            <br />
            같은 주식을 더 사드려요
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#3c5170]">
            받은 배당으로 같은 주식을 더 사 복리를 굴려요. 아직 받은 배당은 없어요.
          </p>
        </section>
      )}

      {/* ── 종목별 토글 ───────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="내 배당주"
          action={
            allSettings.length > 0 ? (
              <span className="font-numeric text-xs tabular-nums text-muted-foreground">
                {allSettings.length}종목 · {onCount}개 켜짐
              </span>
            ) : null
          }
        />
        {allSettings.length === 0 ? (
          <EmptyState
            title="배당 재투자할 종목이 없어요"
            description="국내 배당주를 예약하거나 보유하면 여기서 재투자를 켤 수 있어요."
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <ul className="divide-y divide-border">
                {allSettings.map((s) => {
                  const qty = qtyByCode.get(s.stockCode);
                  const isReserved = reservedDomesticCodes.has(s.stockCode) && qty === undefined;
                  const logoUrl = logoByCode.get(s.stockCode) ?? null;
                  const initial = s.stockName.trim().charAt(0).toUpperCase();
                  return (
                    <li key={s.stockCode} className="flex items-center gap-3 px-4 py-3.5">
                      <Avatar className="size-9 shrink-0 rounded-xl">
                        {logoUrl && <AvatarImage src={logoUrl} alt="" />}
                        <AvatarFallback className="rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground">{s.stockName}</p>
                          {isReserved && (
                            <span className="rounded-full bg-brand-surface px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              예약중
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {s.enabled ? (
                            qty !== undefined ? (
                              <>
                                보유{" "}
                                <span className="font-numeric tabular-nums">
                                  {formatShares(qty)}주
                                </span>{" "}
                                · 배당 재투자 중
                              </>
                            ) : (
                              "배당 재투자 중"
                            )
                          ) : (
                            "꺼짐 · 배당을 현금으로 받아요"
                          )}
                        </p>
                      </div>
                      <Switch
                        checked={s.enabled}
                        disabled={pendingCodes.has(s.stockCode)}
                        onCheckedChange={(v) => handleToggle(s.stockCode, v)}
                        aria-label={`${s.stockName} 배당 재투자 ${s.enabled ? "끄기" : "켜기"}`}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-muted-foreground">
              소액 배당(1,000원 미만)은 CMA 잔돈으로 채워 1,000원어치 사드려요.
            </p>
          </>
        )}
      </section>

      {/* ── 배당 내역 ─────────────────────────────────────────────── */}
      {history.length > 0 && (
        <section>
          <SectionHeader title="배당 내역" />
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {history.map((h) => (
                <DripHistoryRow
                  key={h.id}
                  payout={h}
                  logoUrl={historyLogoByCode.get(h.stockCode) ?? null}
                />
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function DripFlowStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl bg-brand-surface px-1.5 py-2.5 text-center">
      <p className="text-[10px] font-medium text-[#41556f]">{label}</p>
      <p className="mt-0.5 font-numeric text-[12.5px] font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function DripHistoryRow({ payout, logoUrl }: { payout: DividendPayout; logoUrl: string | null }) {
  const chip = DRIP_STATUS_CHIP[payout.status];
  const initial = payout.stockName.trim().charAt(0).toUpperCase();
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <Avatar className="size-8 shrink-0 rounded-xl">
        {logoUrl && <AvatarImage src={logoUrl} alt="" />}
        <AvatarFallback className="rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground">
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-[13.5px] font-bold text-foreground">{payout.stockName}</p>
        <p className="mt-0.5 font-numeric text-[11px] tabular-nums text-muted-foreground">
          {formatMD(payout.payDate)} · {formatShares(payout.holdingQty)}주 배당
        </p>
      </div>
      <div className="ml-auto text-right">
        <p className="font-numeric text-[13.5px] font-bold tabular-nums text-foreground">
          {formatKRW(payout.grossAmount)}
        </p>
        <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", chip.cls)}>
          {chip.label}
        </span>
      </div>
    </li>
  );
}

// ── 예약 행 ───────────────────────────────────────────────────────────────

function ReservationRow({
  reservation,
  logoUrl,
  isPendingCancel,
  isCancelling,
  onCancel,
}: {
  reservation: MaturityReservation;
  logoUrl: string | null;
  isPendingCancel: boolean;
  isCancelling: boolean;
  onCancel: () => void;
}) {
  const { stockName, buyAmount, maturityDate, status } = reservation;
  const isReserved = status === "RESERVED";
  const meta = STATUS_META[status as MaturityReservationStatus] ?? STATUS_META.CANCELLED;
  const initial = stockName.trim().charAt(0).toUpperCase();

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 transition-colors",
        isPendingCancel && "bg-destructive/5",
      )}
    >
      <Avatar className={cn("size-9 shrink-0 rounded-xl", !isReserved && "opacity-50")}>
        {logoUrl && <AvatarImage src={logoUrl} alt="" />}
        <AvatarFallback className="rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground">
          {initial}
        </AvatarFallback>
      </Avatar>

      <div className={cn("min-w-0 flex-1", !isReserved && "opacity-60")}>
        <p className="text-[14px] font-semibold text-foreground">{stockName}</p>
        <p className="mt-0.5 font-numeric text-[12px] tabular-nums text-muted-foreground">
          {formatKRW(Number(buyAmount))} · {formatMD(maturityDate)} 집행
        </p>
      </div>

      {/* 우측: RESERVED면 취소 버튼, 나머지면 상태 칩 */}
      {isReserved ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={isCancelling}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition-all disabled:opacity-50",
            isPendingCancel
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground hover:bg-muted/70",
          )}
          aria-label={`${stockName} 예약 취소`}
        >
          <X className="size-3 shrink-0" />
          {isCancelling ? "취소 중…" : isPendingCancel ? "취소 확인" : "취소"}
        </button>
      ) : (
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
            meta.cls,
          )}
        >
          {meta.label}
        </span>
      )}
    </li>
  );
}
