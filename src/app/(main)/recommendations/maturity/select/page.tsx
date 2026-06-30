"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronRight, X, ArrowDown, ArrowRight, CheckCircle2, PiggyBank } from "lucide-react";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMaturityAccounts } from "@/hooks/queries/useMaturityAccounts";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useMaturityReservations } from "@/hooks/queries/useMaturityReservations";
import { useDepositRollovers } from "@/hooks/queries/useDepositRollovers";
import { ApiError } from "@/lib/api/client";
import { useCancelMaturityReservation } from "@/hooks/mutations/useCancelMaturityReservation";
import { useCancelDepositRollover } from "@/hooks/mutations/useCancelDepositRollover";
import { useRerouteCanceled } from "@/hooks/mutations/useRerouteCanceled";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useDividendReinvest } from "@/hooks/queries/useDividendReinvest";
import { useDividendHistory } from "@/hooks/queries/useDividendHistory";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useSetDividendReinvest } from "@/hooks/mutations/useSetDividendReinvest";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { MaturityTriggerAccount } from "@/types/domain/asset";
import type { DepositRollover } from "@/types/domain/deposit";
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
  EXECUTED: { label: "체결됨", cls: "bg-emerald-50 text-emerald-700" },
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
  const { data: rollovers = [] } = useDepositRollovers();
  const { data: bankAccounts = [] } = useBankAccounts();
  const cancelMutation = useCancelMaturityReservation();
  const cancelRolloverMutation = useCancelDepositRollover();
  const rerouteMutation = useRerouteCanceled();

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

  const [pendingCancelRolloverId, setPendingCancelRolloverId] = useState<number | null>(null);
  useEffect(() => {
    if (pendingCancelRolloverId === null) return;
    const t = setTimeout(() => setPendingCancelRolloverId(null), 4000);
    return () => clearTimeout(t);
  }, [pendingCancelRolloverId]);

  const [pendingCancelGroupId, setPendingCancelGroupId] = useState<number | null>(null);
  const [cancellingGroupId, setCancellingGroupId] = useState<number | null>(null);
  useEffect(() => {
    if (pendingCancelGroupId === null) return;
    const t = setTimeout(() => setPendingCancelGroupId(null), 4000);
    return () => clearTimeout(t);
  }, [pendingCancelGroupId]);

  // 배당주 취소분을 CMA/재예치 중 어디로 보낼지 고르는 시트(활성 rollover 없을 때만 — 배당주 100% 전환)
  const [rerouteSheet, setRerouteSheet] = useState<
    { resId: number; accountId: number; amount: number } | null
  >(null);

  const isLoading = accLoading || resLoading;

  // 예약 취소 후 취소분을 '남은 자금 굴리기'로 보낸다(공중분해 방지). 취소→라우팅 순서.
  const doCancelAndReroute = (
    id: number,
    accountId: number,
    amount: number,
    target: "CMA" | "DEPOSIT" | null,
  ) => {
    cancelMutation.mutate(id, {
      onSuccess: () => {
        setPendingCancelId(null);
        rerouteMutation.mutate(
          { linkedBankAccountId: accountId, amount, target },
          {
            onSuccess: () =>
              toast.success(
                target === "CMA"
                  ? "취소하고 남은 금액을 CMA로 옮겼어요."
                  : target === "DEPOSIT"
                    ? "취소하고 남은 금액을 재예치했어요."
                    : "취소한 금액을 남은 굴리기에 합쳤어요.",
              ),
            onError: () =>
              toast.error("취소는 됐는데 금액 이동에 실패했어요. 잠시 후 다시 시도해 주세요."),
          },
        );
      },
      onError: () => {
        toast.error("취소하지 못했어요. 잠시 후 다시 시도해 주세요.");
        setPendingCancelId(null);
      },
    });
  };

  const handleCancel = (id: number) => {
    if (cancelMutation.isPending || rerouteMutation.isPending) return;
    if (pendingCancelId !== id) {
      setPendingCancelId(id);
      return;
    }
    const r = reservations.find((x) => x.id === id);
    if (!r) {
      setPendingCancelId(null);
      return;
    }
    // 계좌에 활성 rollover(재예치/CMA)가 있으면 자동 합산, 없으면 시트로 CMA/재예치를 고르게 한다.
    const hasRollover = rollovers.some(
      (rr) => rr.linkedBankAccountId === r.linkedBankAccountId && rr.status === "RESERVED",
    );
    if (hasRollover) {
      doCancelAndReroute(id, r.linkedBankAccountId, r.buyAmount, null);
    } else {
      setPendingCancelId(null);
      setRerouteSheet({ resId: id, accountId: r.linkedBankAccountId, amount: r.buyAmount });
    }
  };

  const pickReroute = (target: "CMA" | "DEPOSIT") => {
    if (!rerouteSheet) return;
    const { resId, accountId, amount } = rerouteSheet;
    setRerouteSheet(null);
    doCancelAndReroute(resId, accountId, amount, target);
  };

  const handleCancelRollover = (id: number) => {
    if (cancelRolloverMutation.isPending) return;
    if (pendingCancelRolloverId === id) {
      cancelRolloverMutation.mutate(id, {
        onSuccess: () => { toast.success("전환 예약이 취소됐어요."); setPendingCancelRolloverId(null); },
        onError: () => { toast.error("취소하지 못했어요. 잠시 후 다시 시도해 주세요."); setPendingCancelRolloverId(null); },
      });
    } else {
      setPendingCancelRolloverId(id);
    }
  };

  const handleCancelGroup = async (
    accountId: number,
    reservationIds: number[],
    rolloverIds: number[],
  ) => {
    if (pendingCancelGroupId === accountId) {
      setCancellingGroupId(accountId);
      try {
        await Promise.all([
          ...reservationIds.map((id) => cancelMutation.mutateAsync(id)),
          ...rolloverIds.map((id) => cancelRolloverMutation.mutateAsync(id)),
        ]);
        toast.success("전체 예약이 취소됐어요.");
      } catch {
        toast.error("일부를 취소하지 못했어요. 잠시 후 다시 시도해 주세요.");
      } finally {
        setCancellingGroupId(null);
        setPendingCancelGroupId(null);
      }
    } else {
      setPendingCancelGroupId(accountId);
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

  // RESERVED·EXECUTED 예약이 있거나 활성 재예치가 있는 계좌만 차단 — 전부 취소/실패면 재시도 가능.
  const convertedAccountIds = useMemo(() => {
    const ids = new Set<number>();
    for (const r of reservations) {
      if (r.status === "RESERVED" || r.status === "EXECUTED") {
        ids.add(r.linkedBankAccountId);
      }
    }
    for (const d of rollovers) {
      if (d.status === "RESERVED" || d.status === "EXECUTED") {
        ids.add(d.linkedBankAccountId);
      }
    }
    return ids;
  }, [reservations, rollovers]);

  if (isLoading) {
    return (
      <>
        <AppHeader variant="sub" title="만기 자금 굴리기" />
        <div className="space-y-5">
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
            convertedAccountIds={convertedAccountIds}
            isError={isError}
            onConvert={goConvert}
            onLinkAsset={() => router.push("/asset")}
          />
        )}

        {/* ── 전환 내역 탭 ──────────────────────────────────────────── */}
        {tab === "history" && (
          <HistoryTab
            reservations={sortedReservations}
            rollovers={rollovers}
            accounts={accounts}
            bankById={bankById}
            pendingCancelId={pendingCancelId}
            isCancellingId={cancelMutation.isPending ? pendingCancelId : null}
            onCancel={handleCancel}
            pendingCancelRolloverId={pendingCancelRolloverId}
            isCancellingRolloverId={cancelRolloverMutation.isPending ? pendingCancelRolloverId : null}
            onCancelRollover={handleCancelRollover}
            pendingCancelGroupId={pendingCancelGroupId}
            cancellingGroupId={cancellingGroupId}
            onCancelGroup={handleCancelGroup}
          />
        )}

        {/* ── 배당 재투자 탭 ─────────────────────────────────────────── */}
        {tab === "drip" && (
          <DripTab reservations={reservations} />
        )}
      </div>

      {/* 취소분 행선지 선택 — 계좌에 활성 rollover가 없을 때만(배당주 100% 전환) */}
      <Sheet
        open={!!rerouteSheet}
        onOpenChange={(o) => {
          if (!o) setRerouteSheet(null);
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-10">
          <SheetHeader className="pb-1 text-left">
            <SheetTitle className="text-base">취소한 금액, 어디로 보낼까요?</SheetTitle>
            <SheetDescription className="text-sm">
              취소하면 {formatKRW(rerouteSheet?.amount ?? 0)}이 남아요. 어떻게 굴릴지 골라 주세요.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2.5">
            <Button
              variant="outline"
              className="h-14 w-full text-base font-bold"
              disabled={rerouteMutation.isPending || cancelMutation.isPending}
              onClick={() => pickReroute("CMA")}
            >
              CMA로 받기
            </Button>
            <Button
              className="h-14 w-full text-base font-bold"
              disabled={rerouteMutation.isPending || cancelMutation.isPending}
              onClick={() => pickReroute("DEPOSIT")}
            >
              같은 예금으로 재예치
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── 예금·적금 탭 ──────────────────────────────────────────────────────────

function AccountsTab({
  accounts,
  bankById,
  convertedAccountIds,
  isError,
  onConvert,
  onLinkAsset,
}: {
  accounts: MaturityTriggerAccount[];
  bankById: Map<number, BankInfo>;
  convertedAccountIds: Set<number>;
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

  // 이미 자금 굴리기로 전환한 계좌(배당주 예약·예금 재예치·CMA 이체)는 선택 탭에서 숨긴다 — 전환 내역 탭에만 노출.
  const selectable = accounts.filter(
    (a) => !a.reserved && !convertedAccountIds.has(a.accountId),
  );

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
          className="block w-full rounded-2xl border border-primary/20 bg-brand-surface p-[18px] text-left transition-[background-color,transform] duration-150 ease-out hover:bg-brand-surface/70 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold text-primary">가장 가까운 만기</span>
            <span className="font-numeric text-lg font-bold tabular-nums text-primary">
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
                만기수령 {formatKRW(featured.maturityAmount)} · 연 {featured.interestRate}% · {formatMD(featured.maturityDate)}
              </p>
            </div>
          </div>
          <span className="mt-4 flex h-[46px] w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
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
  const { accountName, maturityAmount, interestRate, maturityDate, daysUntilMaturity } = account;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-[background-color,transform] duration-150 hover:bg-muted/40 active:scale-[0.99] active:bg-muted/60"
    >
      <InstitutionLogo
        code={bank?.code}
        name={bank?.name ?? accountName}
        className="size-9 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-foreground">{accountName}</p>
        <p className="mt-0.5 font-numeric text-xs tabular-nums text-muted-foreground">
          만기수령 {formatKRW(maturityAmount)} · 연 {interestRate}%
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
  rollovers: DepositRollover[];
}

function HistoryTab({
  reservations,
  rollovers,
  accounts,
  bankById,
  pendingCancelId,
  isCancellingId,
  onCancel,
  pendingCancelRolloverId,
  isCancellingRolloverId,
  onCancelRollover,
  pendingCancelGroupId,
  cancellingGroupId,
  onCancelGroup,
}: {
  reservations: MaturityReservation[];
  rollovers: DepositRollover[];
  accounts: MaturityTriggerAccount[];
  bankById: Map<number, BankInfo>;
  pendingCancelId: number | null;
  isCancellingId: number | null;
  onCancel: (id: number) => void;
  pendingCancelRolloverId: number | null;
  isCancellingRolloverId: number | null;
  onCancelRollover: (id: number) => void;
  pendingCancelGroupId: number | null;
  cancellingGroupId: number | null;
  onCancelGroup: (accountId: number, reservationIds: number[], rolloverIds: number[]) => void;
}) {
  const allCodes = useMemo(() => [...new Set(reservations.map((r) => r.stockCode))], [reservations]);
  const detailQueries = useStockDetails(allCodes);
  const logoByCode = useMemo(() => {
    const m = new Map<string, string | null>();
    allCodes.forEach((code, i) => m.set(code, detailQueries[i]?.data?.logoUrl ?? null));
    return m;
  }, [allCodes, detailQueries]);

  // accountId 기준으로 그룹핑 — 배당주 예약 + 예금 재예치를 한 계좌 카드에 합친다.
  const groups = useMemo<AccountGroup[]>(() => {
    const resByAcc = new Map<number, MaturityReservation[]>();
    for (const r of reservations) {
      const list = resByAcc.get(r.linkedBankAccountId) ?? [];
      list.push(r);
      resByAcc.set(r.linkedBankAccountId, list);
    }
    const rollByAcc = new Map<number, DepositRollover[]>();
    for (const d of rollovers) {
      const list = rollByAcc.get(d.linkedBankAccountId) ?? [];
      list.push(d);
      rollByAcc.set(d.linkedBankAccountId, list);
    }
    const accountMap = new Map(accounts.map((a) => [a.accountId, a]));
    const ids = new Set<number>([...resByAcc.keys(), ...rollByAcc.keys()]);
    return [...ids].map((accountId) => {
      const acc = accountMap.get(accountId) ?? null;
      const res = resByAcc.get(accountId) ?? [];
      const roll = rollByAcc.get(accountId) ?? [];
      return {
        accountId,
        accountName: acc?.accountName ?? null,
        maturityDate: res[0]?.maturityDate ?? roll[0]?.maturityDate ?? "",
        principalAmount: acc?.principalAmount ?? null,
        interestRate: acc?.interestRate ?? null,
        daysUntilMaturity: acc?.daysUntilMaturity ?? null,
        reservations: res,
        rollovers: roll,
      };
    });
  }, [reservations, rollovers, accounts]);

  // 모든 예약이 취소됐고 활성 재예치도 없는 그룹은 전환 내역에서 숨김 — 예금·적금 탭에서 재선택 가능.
  const visibleGroups = groups.filter(
    (g) =>
      g.rollovers.some((d) => d.status !== "CANCELLED") ||
      g.reservations.some((r) => r.status !== "CANCELLED"),
  );

  if (visibleGroups.length === 0) {
    return (
      <EmptyState
        title="전환 내역이 없어요"
        description="예금·적금 만기 자금을 배당주·예금으로 전환하면 여기에 표시돼요."
      />
    );
  }

  return (
    <div className="space-y-4">
      {visibleGroups.map((group) => (
        <AccountGroupCard
          key={group.accountId}
          group={group}
          bank={bankById.get(group.accountId)}
          logoByCode={logoByCode}
          pendingCancelId={pendingCancelId}
          isCancellingId={isCancellingId}
          onCancel={onCancel}
          pendingCancelRolloverId={pendingCancelRolloverId}
          isCancellingRolloverId={isCancellingRolloverId}
          onCancelRollover={onCancelRollover}
          pendingCancelGroupId={pendingCancelGroupId}
          cancellingGroupId={cancellingGroupId}
          onCancelGroup={onCancelGroup}
        />
      ))}
      {(pendingCancelId !== null || pendingCancelRolloverId !== null || pendingCancelGroupId !== null) && (
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
  pendingCancelRolloverId,
  isCancellingRolloverId,
  onCancelRollover,
  pendingCancelGroupId,
  cancellingGroupId,
  onCancelGroup,
}: {
  group: AccountGroup;
  bank?: BankInfo | undefined;
  logoByCode: Map<string, string | null>;
  pendingCancelId: number | null;
  isCancellingId: number | null;
  onCancel: (id: number) => void;
  pendingCancelRolloverId: number | null;
  isCancellingRolloverId: number | null;
  onCancelRollover: (id: number) => void;
  pendingCancelGroupId: number | null;
  cancellingGroupId: number | null;
  onCancelGroup: (accountId: number, reservationIds: number[], rolloverIds: number[]) => void;
}) {
  const reserved = group.reservations.filter((r) => r.status === "RESERVED");
  // CANCELLED는 개별 행으로 보여주지 않음 — 카운트만 표시.
  const visiblePast = group.reservations.filter(
    (r) => r.status !== "RESERVED" && r.status !== "CANCELLED",
  );
  const rollovers = group.rollovers.filter((d) => d.status !== "CANCELLED");
  const hasReserved = reserved.length > 0;
  const hasConversion = hasReserved || rollovers.length > 0;
  // 만기일 자동 전환 총액 = 배당주 예약(RESERVED) + 활성 재예치/CMA이체.
  const totalConverted =
    reserved.reduce((s, r) => s + Number(r.buyAmount), 0) +
    rollovers.filter((d) => d.status !== "CANCELLED").reduce((s, d) => s + Number(d.amount), 0);

  // 전체 취소 대상 — RESERVED 배당주 예약 + RESERVED 롤오버(CMA 이체·예금 재예치 모두)
  const cancellableRollovers = rollovers.filter((d) => d.status === "RESERVED");
  const hasCancellable = reserved.length > 0 || cancellableRollovers.length > 0;
  const isGroupPending = pendingCancelGroupId === group.accountId;
  const isGroupCancelling = cancellingGroupId === group.accountId;

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
            <p className="truncate text-sm font-bold text-foreground">
              {group.accountName ?? "예금·적금"}
            </p>
          </div>
          {group.daysUntilMaturity !== null && (
            <span
              className={cn(
                "shrink-0 font-numeric text-xs font-bold tabular-nums",
                ddayTone(group.daysUntilMaturity),
              )}
            >
              {ddayLabel(group.daysUntilMaturity)}
            </span>
          )}
        </div>
        <p className="mt-1 font-numeric text-xs tabular-nums text-muted-foreground">
          {formatMD(group.maturityDate)} 만기
          {group.principalAmount !== null && ` · 원금 ${formatKRW(group.principalAmount)}`}
          {group.interestRate !== null && ` · 연 ${group.interestRate}%`}
        </p>
        {hasConversion && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-brand-surface px-2.5 py-1.5 text-[11.5px] font-bold text-primary">
            <ArrowDown className="size-3 shrink-0" />
            <span className="font-numeric tabular-nums">{formatMD(group.maturityDate)}</span>
            <span>만기일 자동 전환</span>
            {totalConverted > 0 && (
              <span className="ml-auto font-numeric tabular-nums">
                {formatKRW(totalConverted)}
              </span>
            )}
          </div>
        )}
        {hasCancellable && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled={isGroupCancelling}
              onClick={() =>
                onCancelGroup(
                  group.accountId,
                  reserved.map((r) => r.id),
                  cancellableRollovers.map((d) => d.id),
                )
              }
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition-all disabled:opacity-50",
                isGroupPending
                  ? "bg-destructive/10 text-destructive"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <X className="size-3 shrink-0" />
              {isGroupCancelling ? "취소 중…" : isGroupPending ? "전체 취소 확인" : "전체 취소"}
            </button>
          </div>
        )}
      </div>

      {/* TO: 전환 결과 — 예금 재예치 + 배당주 */}
      <ul className="divide-y divide-border">
        {rollovers.map((d) => (
          <DepositRolloverRow
            key={`deposit-${d.id}`}
            rollover={d}
            isPendingCancel={pendingCancelRolloverId === d.id}
            isCancelling={isCancellingRolloverId === d.id}
            onCancel={() => onCancelRollover(d.id)}
          />
        ))}
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
        {visiblePast.map((r) => (
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
  return Number(n).toLocaleString("ko-KR", { maximumFractionDigits: 6 });
}

const DRIP_STATUS_CHIP: Record<DividendPayoutStatus, { label: string; cls: string }> = {
  REINVESTED: { label: "재투자", cls: "bg-emerald-50 text-emerald-700" },
  PAID: { label: "CMA 입금", cls: "bg-muted text-muted-foreground" },
  REINVEST_FAILED: { label: "재투자 실패", cls: "bg-destructive/10 text-destructive" },
};

function DripTab({ reservations }: { reservations: MaturityReservation[] }) {
  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useDividendReinvest();
  const { data: history = [], isLoading: historyLoading, isError: historyError } = useDividendHistory();
  const { data: holdings = [] } = useHoldings();
  const setReinvest = useSetDividendReinvest();
  const [pendingCodes, setPendingCodes] = useState<Set<string>>(new Set());

  // 활성 예약(RESERVED) 종목 코드 + 집행일 맵
  const reservedCodes = useMemo(
    () =>
      new Set(
        reservations
          .filter((r) => r.status === "RESERVED")
          .map((r) => r.stockCode),
      ),
    [reservations],
  );

  const maturityDateByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of reservations) {
      if (r.status === "RESERVED" && !m.has(r.stockCode)) {
        m.set(r.stockCode, r.maturityDate);
      }
    }
    return m;
  }, [reservations]);

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
          !settingCodes.has(r.stockCode) &&
          !seen.has(r.stockCode) &&
          seen.add(r.stockCode),
      )
      .map((r) => ({ stockCode: r.stockCode, stockName: r.stockName, enabled: false }));
  }, [reservations, settingCodes]);

  const qtyByCode = useMemo(
    () => new Map(holdings.map((h) => [h.stockCode, h.quantity])),
    [holdings],
  );

  // 보유 중이거나 활성 예약이 있는 종목만 표시 — 예약 취소 후 미보유면 숨김(설정은 DB에 유지).
  const allSettings = useMemo(
    () =>
      [...(settings ?? []), ...reservedNotInSettings].filter(
        (s) => qtyByCode.has(s.stockCode) || reservedCodes.has(s.stockCode),
      ),
    [settings, reservedNotInSettings, qtyByCode, reservedCodes],
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
        // 해외 재투자는 자동환전 필요 등 백엔드 사유를 그대로 노출(있으면).
        onError: (e) =>
          toast.error(
            e instanceof ApiError
              ? e.message
              : "설정을 변경하지 못했어요. 잠시 후 다시 시도해 주세요.",
          ),
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
            <ArrowRight className="size-4 shrink-0 text-emerald-400" />
            <DripFlowStep label="재투자됨" value={formatKRW(reinvested)} success />
            <ArrowRight className="size-4 shrink-0 text-emerald-400" />
            <DripFlowStep label="재투자 횟수" value={`${reinvestCount}회`} success />
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
            description="배당주를 예약하거나 보유하면 여기서 재투자를 켤 수 있어요."
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <ul className="divide-y divide-border">
                {allSettings.map((s) => {
                  const qty = qtyByCode.get(s.stockCode);
                  const isReserved = reservedCodes.has(s.stockCode) && qty === undefined;
                  const execDate = isReserved ? maturityDateByCode.get(s.stockCode) : undefined;
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
                        <p className="text-sm font-bold text-foreground">{s.stockName}</p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {isReserved ? (
                            <span className="text-primary">
                              {execDate ? `${formatMD(execDate)} 매수 예정` : "만기일 매수 예정"}
                            </span>
                          ) : s.enabled ? (
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
                            "배당은 CMA에 쌓여요"
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

function DripFlowStep({ label, value, success }: { label: string; value: string; success?: boolean }) {
  return (
    <div className={cn("flex-1 rounded-xl px-1.5 py-2.5 text-center", success ? "bg-emerald-50" : "bg-brand-surface")}>
      <p className={cn("text-[10px] font-medium", success ? "text-emerald-600" : "text-[#3c5170]")}>{label}</p>
      <p className={cn("mt-0.5 font-numeric text-[12.5px] font-bold tabular-nums", success ? "text-emerald-700" : "text-foreground")}>
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
        <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold", chip.cls)}>
          {chip.label}
        </span>
      </div>
    </li>
  );
}

// ── 예금 재예치 행 ────────────────────────────────────────────────────────

function DepositRolloverRow({
  rollover,
  isPendingCancel,
  isCancelling,
  onCancel,
}: {
  rollover: DepositRollover;
  isPendingCancel: boolean;
  isCancelling: boolean;
  onCancel: () => void;
}) {
  const { productName, productType, amount, baseRate, maxRate, periodMonths, maturityDate, status } = rollover;
  const isCma = productType === "CMA";
  const isReserved = status === "RESERVED";
  const isExecuted = status === "EXECUTED";
  const isCancelled = status === "CANCELLED";
  const rateLabel = baseRate === maxRate ? `${maxRate}%` : `${baseRate}~${maxRate}%`;
  const cmaDateLabel = maturityDate ? `${formatMD(maturityDate)} CMA 이체 예정` : "CMA 이체 예정";
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 transition-colors",
        isPendingCancel && "bg-destructive/5",
        isCancelled && "opacity-50",
      )}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-surface text-primary">
        <PiggyBank className="size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{productName}</p>
        <p className="mt-0.5 font-numeric text-xs tabular-nums text-muted-foreground">
          {isCma
            ? `${formatKRW(Number(amount))} · ${cmaDateLabel}`
            : `${formatKRW(Number(amount))} · ${periodMonths}개월 · 연 ${rateLabel}`}
        </p>
      </div>
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
          aria-label={isCma ? "CMA 이체 예약 취소" : "예금 재예치 예약 취소"}
        >
          <X className="size-3 shrink-0" />
          {isCancelling ? "취소 중…" : isPendingCancel ? "취소 확인" : "취소"}
        </button>
      ) : (
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
            isCancelled
              ? "bg-muted text-muted-foreground"
              : isExecuted
                ? "bg-emerald-50 text-emerald-700"
                : "bg-brand-surface text-primary",
          )}
        >
          {isCancelled ? "취소됨" : isExecuted ? "이체 완료" : isCma ? "CMA 이체" : "예금 재예치"}
        </span>
      )}
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
        <p className="text-sm font-semibold text-foreground">{stockName}</p>
        <p className="mt-0.5 font-numeric text-xs tabular-nums text-muted-foreground">
          {formatKRW(Number(buyAmount))} · {formatMD(maturityDate)} 매수 예정
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
