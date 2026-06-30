"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Landmark,
  CreditCard,
  Coins,
  LineChart,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { InstitutionLogo } from "@/components/common/InstitutionLogo";
import { bankCodeFromName, cardCodeFromName } from "@/lib/utils/institution";
import { useInstitutions } from "@/hooks/queries/useInstitutions";
import { useAssetScan } from "@/hooks/queries/useAssetScan";
import { useDormantAccounts } from "@/hooks/queries/useDormantAccounts";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useLinkedCards } from "@/hooks/queries/useLinkedCards";
import { useCollectSettings } from "@/hooks/queries/useCollectSettings";
import { useLinkAssets } from "@/hooks/mutations/useLinkAssets";
import { useUnlinkAsset } from "@/hooks/mutations/useUnlinkAsset";
import { useCloseDormant } from "@/hooks/mutations/useCloseDormant";
import { useSaveCollectSettings } from "@/hooks/mutations/useSaveCollectSettings";
import { formatKRW } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import type { BankAccount, LinkedCard } from "@/types/domain/account";
import type {
  DormantAccount,
  DormantCloseResult,
  Institution,
  InstitutionCategory,
  ScanSource,
} from "@/types/domain/asset";

type Step =
  | "LINK"
  | "SCAN"
  | "RESULT"
  | "DORMANT_FOUND"
  | "DORMANT_SELECT"
  | "CLEANUP"
  | "CLEANUP_DONE"
  | "BANK_SELECT"
  | "BANK_LOADING"
  | "BANK_DONE"
  | "CARD"
  | "AUTO_AGREE";

const errMsg = (e: unknown) =>
  e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.";

const STEP_TITLE: Record<Step, string> = {
  LINK: "자산 연동",
  SCAN: "자산 스캔",
  RESULT: "발견 결과",
  DORMANT_FOUND: "휴면계좌 발견",
  DORMANT_SELECT: "계좌 선택",
  CLEANUP: "정리 중",
  CLEANUP_DONE: "정리 완료",
  BANK_SELECT: "은행 계좌 연동",
  BANK_LOADING: "연동 중",
  BANK_DONE: "연동 완료",
  AUTO_AGREE: "자동 적립",
  CARD: "카드 선택",
};

// 로딩 스텝은 뒤로가기 불가(중단 불가 작업 진행 중)
const NO_BACK_STEPS = new Set<Step>(["SCAN", "CLEANUP", "BANK_LOADING"]);

const SOURCE_ICON: Record<
  ScanSource["sourceType"],
  React.ComponentType<{ className?: string }>
> = {
  ACCOUNT: Landmark,
  CARD: CreditCard,
  POINT: Coins,
  FX: Coins,
};

// 표시 라벨은 백엔드 name이 아닌 Figma 시안 기준 고정 라벨 사용
const SOURCE_TITLE: Record<ScanSource["sourceType"], string> = {
  ACCOUNT: "은행 계좌 잔돈",
  CARD: "카드 결제 잔돈",
  POINT: "신한포인트",
  FX: "SOL트래블 잔돈",
};

const SOURCE_SUBTITLE: Record<ScanSource["sourceType"], string> = {
  ACCOUNT: "입출금 통장 잔고",
  CARD: "결제 잔돈",
  POINT: "마이신한포인트",
  FX: "USD 환전 잔액",
};

export default function AssetLinkPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("LINK");

  // 전진형 온보딩: 뒤로가기 제스처(좌→우 스와이프)·브라우저 back으로 홈 이탈 방지.
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const onPop = () =>
      window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const dormantActive =
    step === "RESULT" || step === "DORMANT_FOUND" || step === "DORMANT_SELECT";

  const scan = useAssetScan(step !== "LINK");
  const dormant = useDormantAccounts(dormantActive);
  const bank = useBankAccounts(step === "RESULT" || step === "BANK_SELECT");
  const linkedCards = useLinkedCards(step === "CARD" || step === "AUTO_AGREE");
  const collectSettings = useCollectSettings(step === "CARD");
  const close = useCloseDormant();
  const saveSettings = useSaveCollectSettings();

  const [selectedDormant, setSelectedDormant] = useState<Set<number>>(
    new Set(),
  );
  const [closeResult, setCloseResult] = useState<DormantCloseResult | null>(
    null,
  );
  // 은행 계좌 소액 이체 — 완료(20) 표시용으로 이체한 계좌 보관
  const [transferred, setTransferred] = useState<BankAccount[]>([]);
  // 이체 확정 시점의 자투리 합계 — 확정 후에만 총합에 반영(확정 전 미리 더하지 않음)
  const [transferredAmount, setTransferredAmount] = useState(0);
  // 카드 잔돈 모으기 — 선택된 카드 ID 집합
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(
    new Set(),
  );

  const dormantList = dormant.data ?? [];
  const dormantTotal = dormantList.reduce(
    (sum, d) => sum.plus(toDecimal(d.balance)),
    toDecimal(0),
  );

  const bankDone = transferred.length > 0;
  const cleanupDone = closeResult !== null;

  // 스캔이 발견한 계좌 자투리(끝전) 추정액 — 확정 전 항목 표시용.
  const scanAccountAmount = toDecimal(
    scan.data?.sources.find((s) => s.sourceType === "ACCOUNT")?.amount ?? 0,
  );
  // 포인트·FX 등 별도 확인이 필요 없는 자동 발견분(스캔의 ACCOUNT 제외 합) — 항상 총합에 포함.
  const autoFoundAmount = (scan.data?.sources ?? [])
    .filter((s) => s.sourceType !== "ACCOUNT")
    .reduce((sum, s) => sum.plus(toDecimal(s.amount)), toDecimal(0));

  // 계좌 자투리는 사용자가 '확인'으로 확정한 뒤에만 총합에 반영한다(확정 전 합산 방지).
  const confirmedAccountAmount = bankDone
    ? toDecimal(transferredAmount)
    : toDecimal(0);
  const confirmedDormantAmount = closeResult
    ? toDecimal(closeResult.transferredAmount)
    : toDecimal(0);
  // 휴면계좌 해지 금액은 재원별 수집(CMA로 모으기) 대상이 아니라 해지 즉시 CMA에 바로 반영되므로
  // '모을 수 있는 돈' 총액에서는 제외하고 별도로 표시한다.
  const sleepingTotal = autoFoundAmount.plus(confirmedAccountAmount);

  // RESULT 항목별 표시 금액(확정 전엔 추정/잔액, 확정 후엔 확정 금액).
  const accountItemAmount = bankDone
    ? transferredAmount
    : scanAccountAmount.toNumber();
  const dormantItemAmount = cleanupDone
    ? confirmedDormantAmount.toNumber()
    : dormantTotal.toNumber();
  // 소액 이체 대상 후보: 비휴면 + KRW 원화 계좌 + 잔액 보유.
  // SOL트래블(외화/FX)은 앞에서 따로 연동·적립하므로 계좌 잔액에서 제외(KRW만).
  const bankEligible = (bank.data ?? []).filter(
    (a) =>
      !a.isDormant &&
      a.currency === "KRW" &&
      toDecimal(a.balance).greaterThan(0),
  );
  // SOL트래블(FX) 외화 잔액 — RESULT에서 원화 환산액과 함께 외화(USD)도 표시한다.
  const usdWalletAmount = (bank.data ?? [])
    .filter((a) => a.currency === "USD" && !a.isDormant)
    .reduce((s, a) => s.plus(toDecimal(a.balance)), toDecimal(0))
    .toNumber();

  const busy = saveSettings.isPending;

  const back = () => {
    const prevStep: Partial<Record<Step, Step | "router">> = {
      LINK: "router",
      RESULT: "LINK",
      DORMANT_FOUND: "RESULT",
      DORMANT_SELECT: "RESULT",
      CLEANUP_DONE: "RESULT",
      BANK_SELECT: "RESULT",
      BANK_DONE: "RESULT",
      AUTO_AGREE: "RESULT",
      CARD: "AUTO_AGREE",
    };
    const target = prevStep[step];
    if (target === "router") router.back();
    else if (target) setStep(target);
  };

  // 계좌 선택(17, 휴면) 진입: 휴면 목록 전체 선택 기본값
  const enterDormantSelect = () => {
    setSelectedDormant(new Set(dormantList.map((d) => d.accountId)));
    setStep("DORMANT_SELECT");
  };

  // 휴면계좌 선택(18) "확인" → 정리 중(19) 로딩 + 해지 API → 완료(20)
  const runCleanup = () => {
    if (close.isPending || selectedDormant.size === 0) return;
    setStep("CLEANUP");
    close.mutate([...selectedDormant], {
      onSuccess: (res) => {
        setCloseResult(res);
        setStep("CLEANUP_DONE");
      },
      onError: (e) => {
        toast.error(errMsg(e));
        setStep("DORMANT_SELECT");
      },
    });
  };

  // 은행 계좌 소액 이체(17) "확인" → 설정 반영(ACCOUNT·기준금액)만 저장(수집은 홈에서) → 완료(20)
  const runBankTransfer = (accounts: BankAccount[], threshold: number) => {
    if (busy) return;
    // 계좌가 없거나 선택 안 했으면 결과로 복귀
    if (accounts.length === 0) {
      setStep("RESULT");
      return;
    }
    setTransferred(accounts);
    // 확정 자투리 = Σ(잔액 % 기준금액) — 확인 후 총합에 반영할 금액.
    setTransferredAmount(
      accounts
        .reduce(
          (s, a) => s.plus(toDecimal(a.balance).mod(threshold)),
          toDecimal(0),
        )
        .toNumber(),
    );
    setStep("BANK_LOADING");
    saveSettings.mutate(
      accounts.map((a) => ({
        sourceType: "ACCOUNT" as const,
        sourceRefId: a.accountId,
        enabled: true,
        threshold,
      })),
      {
        // 실제 수집(collect)은 하지 않음 — 홈 대시보드에서 잔돈으로 보이고, 홈 버튼으로만 수집
        onSuccess: () => setStep("BANK_DONE"),
        onError: (e) => {
          toast.error(errMsg(e));
          setStep("BANK_SELECT");
        },
      },
    );
  };

  // 자동 적립 동의(16) "동의하고 시작" → 선택된 카드 설정 저장 후 홈으로.
  // 발견한 잔돈은 홈 대시보드에 자원별로 표시되고, 실제 수집은 홈의 "CMA로 모으기" 버튼에서만 실행한다.
  // TODO: 소수점 주식 선택(선물) 화면을 16과 홈 사이에 넣을 예정.
  // 기존 CARD 설정을 전부 비활성화 후 홈으로 — 동의 철회 or 카드 0개 선택 시 공용
  const disableCardSettings = () => {
    const existing = (collectSettings.data ?? []).filter(
      (s) => s.sourceType === "CARD",
    );
    if (existing.length === 0) {
      router.replace("/home");
      return;
    }
    saveSettings.mutate(
      existing.map((s) => ({
        sourceType: "CARD" as const,
        sourceRefId: s.sourceRefId,
        enabled: false,
      })),
      {
        onSuccess: () => router.replace("/home"),
        onError: () => router.replace("/home"),
      },
    );
  };

  const finishAndGoHome = () => {
    if (selectedCardIds.size === 0) {
      disableCardSettings();
      return;
    }
    const cardSettings = [...selectedCardIds].map((cardId) => ({
      sourceType: "CARD" as const,
      sourceRefId: cardId,
      enabled: true,
    }));
    saveSettings.mutate(cardSettings, {
      onSuccess: () => router.replace("/home"),
      onError: (e) => {
        toast.error(errMsg(e));
        router.replace("/home");
      },
    });
  };

  return (
    <>
      <AppHeader
        variant="sub"
        title={STEP_TITLE[step]}
        showMenu={false}
        {...(NO_BACK_STEPS.has(step) ? { showBack: false } : { onBack: back })}
      />

      {step === "LINK" && <LinkStep onLinked={() => setStep("SCAN")} />}

      {step === "SCAN" &&
        (scan.isError ? (
          <ScanError onRetry={() => scan.refetch()} />
        ) : !scan.data ? (
          <ScanSpinner />
        ) : (
          <ScanningView
            sources={scan.data.sources}
            onDone={() => setStep("RESULT")}
          />
        ))}

      {step === "RESULT" && (
        <ResultView
          sources={scan.data?.sources ?? []}
          total={sleepingTotal.toNumber()}
          fxForeign={usdWalletAmount}
          accountAmount={accountItemAmount}
          dormantAmount={dormantItemAmount}
          dormantCount={dormantList.length}
          cleanupDone={cleanupDone}
          bankDone={bankDone}
          // 은행 계좌 잔돈 → 소액 이체(17, 505), 휴면계좌 → 계좌 선택(18)로 바로 진입
          onCheckAccount={() => setStep("BANK_SELECT")}
          onCheckDormant={enterDormantSelect}
          onStart={() => setStep("AUTO_AGREE")}
        />
      )}

      {step === "DORMANT_FOUND" && (
        <DormantFoundView accounts={dormantList} onNext={enterDormantSelect} />
      )}

      {step === "DORMANT_SELECT" && (
        <DormantSelectView
          accounts={dormantList}
          selected={selectedDormant}
          onToggle={(id) =>
            setSelectedDormant((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onConfirm={runCleanup}
        />
      )}

      {step === "BANK_SELECT" &&
        (bank.data ? (
          <BankSelectView accounts={bankEligible} onConfirm={runBankTransfer} />
        ) : (
          <ScanSpinner />
        ))}

      {step === "CLEANUP" && <CleanupLoadingView />}

      {step === "BANK_LOADING" && <CleanupLoadingView variant="bank" />}

      {step === "CLEANUP_DONE" && (
        <CleanupDoneView
          result={closeResult}
          accounts={dormantList}
          // 정리 완료 후 다시 결과(13) 허브로 복귀
          onNext={() => setStep("RESULT")}
        />
      )}

      {step === "BANK_DONE" && (
        <BankDoneView accounts={transferred} onNext={() => setStep("RESULT")} />
      )}

      {step === "AUTO_AGREE" && (
        <AutoAgreeView
          pending={busy}
          onAgree={(collectChecked) =>
            collectChecked ? setStep("CARD") : disableCardSettings()
          }
          onLater={() => router.replace("/home")}
        />
      )}

      {step === "CARD" && (
        <CardSelectView
          cards={(linkedCards.data ?? []).filter(
            (c) =>
              c.cardType === "CHECK" &&
              c.companyName.includes("신한") &&
              !c.cardName.includes("트래블"),
          )}
          isLoading={linkedCards.isLoading}
          isError={linkedCards.isError}
          onRetry={() => linkedCards.refetch()}
          initialSelectedIds={
            new Set(
              (collectSettings.data ?? [])
                .filter((s) => s.sourceType === "CARD" && s.enabled)
                .map((s) => s.sourceRefId),
            )
          }
          selectedIds={selectedCardIds}
          onChangeSelected={setSelectedCardIds}
          onNext={finishAndGoHome}
        />
      )}
    </>
  );
}

// ── 공통: 하단 고정 CTA 컨테이너 ───────────────────────────────────────────────
function BottomCta({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-border bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
      {children}
    </div>
  );
}

// ── 1. 마이데이터 연동 선택 (은행·증권·카드·포인트) ────────────────────────────
const CATEGORY_ORDER: InstitutionCategory[] = [
  "BANK",
  "SECURITIES",
  "CARD",
  "POINT",
];

const CATEGORY_LABEL: Record<InstitutionCategory, string> = {
  BANK: "은행",
  SECURITIES: "증권",
  CARD: "카드",
  POINT: "포인트",
};

const CATEGORY_ICON: Record<
  InstitutionCategory,
  React.ComponentType<{ className?: string }>
> = {
  BANK: Landmark,
  SECURITIES: LineChart,
  CARD: CreditCard,
  POINT: Coins,
};

function LinkStep({ onLinked }: { onLinked: () => void }) {
  const { data, isLoading, isError, refetch } = useInstitutions();
  const link = useLinkAssets();
  const unlink = useUnlinkAsset();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 신한 계열사(신한은행·증권·카드·포인트 등)는 카테고리와 무관하게 최상단에 따로 모아 노출하고,
  // 나머지 기관만 기존처럼 카테고리(은행/증권/카드/포인트)별로 그룹핑한다(신한 계열사는 중복 제외).
  // 식별 필드가 별도로 없어 companyName 기준으로 판별한다.
  const { shinhan, grouped } = useMemo(() => {
    const shinhanList: Institution[] = [];
    const map = new Map<InstitutionCategory, Institution[]>();
    for (const inst of data ?? []) {
      if (inst.companyName.includes("신한")) {
        shinhanList.push(inst);
        continue;
      }
      const list = map.get(inst.category) ?? [];
      list.push(inst);
      map.set(inst.category, list);
    }
    // 신한 계열사도 카테고리 순서(은행→증권→카드→포인트)대로 정렬해 표시
    shinhanList.sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
    );
    const grouped = CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c) as Institution[],
    }));
    return { shinhan: shinhanList, grouped };
  }, [data]);

  // 현재 연동 현황·카테고리 매핑 — 해제는 카테고리별 경로가 필요.
  const linkedCodes = useMemo(
    () =>
      new Set(
        (data ?? [])
          .filter((i) => i.linkStatus === "LINKED")
          .map((i) => i.companyCode),
      ),
    [data],
  );
  const categoryByCode = useMemo(() => {
    const map = new Map<string, InstitutionCategory>();
    for (const i of data ?? []) map.set(i.companyCode, i.category);
    return map;
  }, [data]);

  // selected = '연동된 상태로 두고 싶은' 기관 집합. 목록 갱신 시 서버 현황으로 동기화.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 목록 로드 시 연동 현황으로 동기화
    setSelected(new Set(linkedCodes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // 선택 대비 현황 → 새로 연동할 곳 / 해제할 곳.
  const toLink = useMemo(
    () => [...selected].filter((c) => !linkedCodes.has(c)),
    [selected, linkedCodes],
  );
  const toUnlink = useMemo(
    () => [...linkedCodes].filter((c) => !selected.has(c)),
    [selected, linkedCodes],
  );

  const all = data ?? [];
  const allSelected =
    all.length > 0 && all.every((i) => selected.has(i.companyCode));
  const pending = link.isPending || unlink.isPending;

  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  const toggleAll = () =>
    setSelected(
      allSelected ? new Set() : new Set(all.map((i) => i.companyCode)),
    );

  // 선택 → 확인 모달. 변경(연동/해제)이 없으면 바로 스캔.
  const proceed = () => {
    if (pending) return;
    if (toLink.length === 0 && toUnlink.length === 0) {
      onLinked();
      return;
    }
    setConfirmOpen(true);
  };

  // 모달에서 확인 시 연동(POST /links) + 해제(DELETE /links/{category}/{code}) 후 스캔.
  const confirmLink = async () => {
    if (pending) return;
    try {
      if (toLink.length > 0) await link.mutateAsync(toLink);
      await Promise.all(
        toUnlink.map((c) =>
          unlink.mutateAsync({
            category: categoryByCode.get(c) as InstitutionCategory,
            companyCode: c,
          }),
        ),
      );
      setConfirmOpen(false);
      onLinked();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 pt-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="pt-6">
        <EmptyState
          title="기관 목록을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="pb-32 pt-2">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">
          흩어진 자산을 한 번에 모아요
        </h2>
        <p className="text-sm text-muted-foreground">
          연동할 자산을 선택하세요. 연동된 자산은 다시 눌러 해제할 수 있어요.
        </p>
        <p className="text-xs text-muted-foreground/80">
          * 이미 선택된 자산은 슈퍼SOL에서 연동된 자산일 수 있어요.
        </p>
      </div>

      <button
        type="button"
        aria-pressed={allSelected}
        onClick={toggleAll}
        disabled={all.length === 0}
        className="mt-4 flex w-full items-center gap-2 rounded-xl bg-muted/60 px-4 py-3 text-left disabled:opacity-50"
      >
        <CheckCircle on={allSelected} />
        <span className="text-sm font-bold text-foreground">
          전체 선택 ({selected.size}/{all.length})
        </span>
      </button>

      <div className="mt-2 space-y-6">
        {shinhan.length > 0 && (
          <section>
            <p className="flex items-center gap-1.5 px-1 pb-2 text-xs font-semibold text-primary">
              <Star className="size-3.5 fill-primary" />
              신한 계열사
            </p>
            <div className="grid grid-cols-3 gap-2">
              {shinhan.map((inst) => (
                <InstitutionTile
                  key={inst.companyCode}
                  inst={inst}
                  on={selected.has(inst.companyCode)}
                  onToggle={() => toggle(inst.companyCode)}
                />
              ))}
            </div>
          </section>
        )}

        {grouped.map(({ category, items }) => {
          const CatIcon = CATEGORY_ICON[category];
          return (
            <section key={category}>
              <p className="flex items-center gap-1.5 px-1 pb-2 text-xs font-semibold text-muted-foreground">
                <CatIcon className="size-3.5" />
                {CATEGORY_LABEL[category]}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {items.map((inst) => (
                  <InstitutionTile
                    key={inst.companyCode}
                    inst={inst}
                    on={selected.has(inst.companyCode)}
                    onToggle={() => toggle(inst.companyCode)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <BottomCta>
        <Button
          onClick={proceed}
          disabled={pending}
          className="h-12 w-full text-base font-bold"
        >
          자산 연동하기
        </Button>
      </BottomCta>

      {/* 연동/해제 확정 모달 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="gap-0 px-6 pb-6 pt-8 text-center">
          <DialogTitle className="text-lg font-bold text-foreground">
            {toUnlink.length === 0
              ? `선택한 ${toLink.length}곳을 연동할까요?`
              : toLink.length === 0
                ? `선택한 ${toUnlink.length}곳을 해제할까요?`
                : `연동 ${toLink.length}곳 · 해제 ${toUnlink.length}곳을 적용할까요?`}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            {toUnlink.length > 0 ? (
              <>
                해제하면 해당 자산의 잔돈은
                <br />더 이상 수집되지 않아요.
              </>
            ) : (
              <>
                연동하면 잠자는 잔돈을 찾아
                <br />
                포켓스톡 CMA로 모을 수 있어요.
              </>
            )}
          </DialogDescription>
          <div className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
              className="h-12 flex-1 text-base font-bold"
            >
              취소
            </Button>
            <Button
              onClick={confirmLink}
              disabled={pending}
              className="h-12 flex-1 text-base font-bold"
            >
              {pending ? "처리 중..." : "적용"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * 그리드 1칸 — 로고 + 기관명 + 선택 표시.
 * on=선택(연동 유지/예정). 연동된 기관을 선택 해제하면 '해제 예정'으로 표시된다.
 */
function InstitutionTile({
  inst,
  on,
  onToggle,
}: {
  inst: Institution;
  on: boolean;
  onToggle: () => void;
}) {
  const linked = inst.linkStatus === "LINKED";
  const willUnlink = linked && !on;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={inst.companyName}
      onClick={onToggle}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border px-2 text-center transition-colors",
        on
          ? "border-primary bg-primary/5"
          : willUnlink
            ? "border-destructive/40 bg-destructive/5"
            : "border-border",
      )}
    >
      {on ? (
        <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" />
        </span>
      ) : willUnlink ? (
        <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white">
          <X className="size-3" />
        </span>
      ) : null}
      {/* 기관 로고: 백엔드 logoUrl이 있으면 우선, 없으면 companyCode 기준 정적 에셋
          (public/institution-logo/{companyCode}.png). 둘 다 없거나 로드 실패 시
          회사명 첫 글자 fallback. 로고가 앱 아이콘형 둥근 사각 배지(워드마크 포함)라
          원형으로 자르면 글자가 잘려 rounded-xl 사각형으로 표시한다. */}
      <Avatar className="size-10 rounded-xl after:rounded-xl">
        <AvatarImage
          src={inst.logoUrl ?? `/institution-logo/${inst.companyCode}.png`}
          alt=""
          className="rounded-xl object-contain"
        />
        <AvatarFallback className="rounded-xl bg-muted text-base font-bold text-muted-foreground">
          {inst.companyName.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
        {inst.companyName}
      </span>
      {linked && (
        <span
          className={cn(
            "text-[10px]",
            willUnlink ? "text-destructive" : "text-primary",
          )}
        >
          {willUnlink ? "해제 예정" : "연동됨"}
        </span>
      )}
    </button>
  );
}

function CheckCircle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/30 text-transparent",
      )}
    >
      <Check className="size-4" />
    </span>
  );
}

// ── 2. 스캔 중 ─────────────────────────────────────────────────────────────────
function ScanSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="size-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

/** 진행바 + 출처별 스캔 상태(발견/스캔중/대기). 애니메이션 완료 시 onDone. */
function ScanningView({
  sources,
  onDone,
}: {
  sources: ScanSource[];
  onDone: () => void;
}) {
  // 금액형(FX·포인트·카드, 금액>0) + 은행 계좌(끝전, 확인 필요)는 항상 마지막에
  const list = useMemo(() => {
    const amountSources = sources.filter(
      (s) => s.sourceType !== "ACCOUNT" && toDecimal(s.amount).greaterThan(0),
    );
    const account = sources.find((s) => s.sourceType === "ACCOUNT");
    return account ? [...amountSources, account] : amountSources;
  }, [sources]);
  const [progress, setProgress] = useState(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let p = 0;
    const t = setInterval(() => {
      p = Math.min(100, p + 4);
      setProgress(p);
      if (p >= 100) {
        clearInterval(t);
        setTimeout(() => onDoneRef.current(), 300);
      }
    }, 70);
    return () => clearInterval(t);
  }, []);

  const n = Math.max(list.length, 1);

  return (
    <div className="pt-2">
      <h2 className="text-xl font-bold leading-snug text-foreground">
        모을 수 있는 돈을
        <br />
        찾고 있어요
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        계열사 자산을 스캔 중입니다
      </p>

      <div className="mt-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-100"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
        <div className="mt-1.5 flex justify-end">
          <span className="font-numeric text-xs font-medium text-primary">
            {progress}%
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {list.map((s, i) => {
          const start = (i / n) * 100;
          const end = ((i + 1) / n) * 100;
          const reached = progress >= end;
          const scanning = !reached && progress >= start;
          const isAccount = s.sourceType === "ACCOUNT";
          const Icon = SOURCE_ICON[s.sourceType];
          // 은행 계좌(끝전)는 금액 발견이 아니라 '확인 필요'
          const foundAmount = reached && !isAccount;
          const accountReady = reached && isAccount;

          const statusText = isAccount
            ? reached
              ? "확인 필요"
              : scanning
                ? "스캔 중..."
                : "대기 중"
            : reached
              ? `${formatKRW(s.amount)} 발견`
              : scanning
                ? "스캔 중..."
                : "대기 중";

          return (
            <div
              key={`${s.sourceType}-${s.name}`}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                foundAmount || accountReady
                  ? "border-primary bg-primary/5"
                  : scanning
                    ? "border-primary bg-primary/5"
                    : "border-border",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  foundAmount || accountReady || scanning
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {foundAmount ? (
                  <Check className="size-5" />
                ) : (
                  <Icon className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {SOURCE_TITLE[s.sourceType]}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    foundAmount || accountReady
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {statusText}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScanError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="pt-10">
      <EmptyState
        title="잔돈을 찾지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="outline" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        }
      />
    </div>
  );
}

// ── 3. 발견 결과 ───────────────────────────────────────────────────────────────
function ResultView({
  sources,
  total,
  fxForeign,
  accountAmount,
  dormantAmount,
  dormantCount,
  cleanupDone,
  bankDone,
  onStart,
  onCheckAccount,
  onCheckDormant,
}: {
  sources: ScanSource[];
  total: number;
  fxForeign: number;
  accountAmount: number;
  dormantAmount: number;
  dormantCount: number;
  cleanupDone: boolean;
  bankDone: boolean;
  onStart: () => void;
  onCheckAccount: () => void;
  onCheckDormant: () => void;
}) {
  // FX(SOL트래블) 행 부제 — 원화 환산액(우측)과 함께 외화(USD)도 같이 노출.
  const fxSubtitle =
    fxForeign > 0
      ? `$${fxForeign.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} · ${SOURCE_SUBTITLE.FX}`
      : SOURCE_SUBTITLE.FX;
  // 금액형(FX·포인트·카드)은 금액 표시, 은행 계좌(끝전)는 확인 필요 → "확인하기"
  const amountSources = sources.filter(
    (s) => s.sourceType !== "ACCOUNT" && toDecimal(s.amount).greaterThan(0),
  );
  // 모을 자투리가 있거나(확정 전) 이미 이체 확정한 경우에만 계좌 항목 노출
  const showAccount = accountAmount > 0 || bankDone;
  const showDormant = dormantCount > 0 || cleanupDone;
  // 출처별 내역(=수집 가능 재원)은 포인트·FX·계좌만. 휴면계좌는 별도 섹션이라 제외.
  const collectableCount = amountSources.length + (showAccount ? 1 : 0);

  return (
    <div className="pb-32 pt-2">
      {/* 모을 수 있는 돈 — 히어로 */}
      <div className="py-8 text-center">
        <p className="text-xs text-muted-foreground">모을 수 있는 돈</p>
        <AmountDisplay
          value={total}
          size="xl"
          className="mt-1.5 block text-primary"
        />
        <p className="mt-1.5 text-sm text-muted-foreground">
          {collectableCount > 0
            ? `${collectableCount}곳에서 발견했어요`
            : "모을 수 있는 잔돈은 없어요"}
        </p>
      </div>

      {/* 출처별 내역 — 수집 가능 재원이 있을 때만 */}
      {collectableCount > 0 && (
        <div className="space-y-2">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            출처별 내역
          </p>
          {amountSources.map((s, i) => (
            <div
              key={`${s.sourceType}-${s.name}`}
              className="ps-rise-in flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3.5"
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {SOURCE_TITLE[s.sourceType]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.sourceType === "FX"
                    ? fxSubtitle
                    : SOURCE_SUBTITLE[s.sourceType]}
                </p>
              </div>
              <AmountDisplay value={s.amount} size="sm" className="font-bold" />
            </div>
          ))}

          {/* 은행 계좌 잔돈 — 완료 또는 확인하기. 금액은 항상 표시(확정 후에만 총합 반영) */}
          {showAccount &&
            (bankDone ? (
              <div
                className="ps-rise-in flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3.5"
                style={{ "--i": amountSources.length } as React.CSSProperties}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {SOURCE_TITLE.ACCOUNT}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {SOURCE_SUBTITLE.ACCOUNT}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <AmountDisplay
                    value={accountAmount}
                    size="sm"
                    className="font-bold"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onCheckAccount}
                className="ps-rise-in flex w-full items-center gap-3 rounded-xl bg-muted/40 px-4 py-3.5 text-left"
                style={{ "--i": amountSources.length } as React.CSSProperties}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {SOURCE_TITLE.ACCOUNT}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {SOURCE_SUBTITLE.ACCOUNT}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <AmountDisplay
                    value={accountAmount}
                    size="sm"
                    className="font-semibold text-zinc-400"
                  />
                  <span className="text-xs font-bold text-primary">
                    확인하기 →
                  </span>
                </div>
              </button>
            ))}
        </div>
      )}

      {/* 휴면계좌 — '모을 수 있는 돈'과 분리. 해지 금액은 CMA에 바로 반영(재원별 수집 대상 아님) */}
      {showDormant && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            휴면계좌 정리
          </p>
          {cleanupDone ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-bold text-primary">휴면계좌 발견</p>
                <p className="text-xs text-primary/70">
                  계좌 정리가 완료됐어요
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <AmountDisplay
                  value={dormantAmount}
                  size="sm"
                  className="font-bold text-primary"
                />
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  CMA 반영 완료
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onCheckDormant}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3.5 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-primary">휴면계좌 발견</p>
                <p className="text-xs text-primary/70">
                  쓰지 않는 계좌 {dormantCount}개가 있어요
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <AmountDisplay
                  value={dormantAmount}
                  size="sm"
                  className="font-semibold text-zinc-400"
                />
                <span className="text-xs font-bold text-primary">
                  확인하기 →
                </span>
              </div>
            </button>
          )}
          <p className="mt-3 px-1 text-xs text-muted-foreground break-keep">
            * 휴면계좌 해지 금액은 위 ‘모을 수 있는 돈’과 별개로, CMA 계좌에
            바로 반영돼요
          </p>
        </div>
      )}

      {/* 수집 가능 재원도 휴면계좌도 없을 때만 */}
      {collectableCount === 0 && !showDormant && (
        <EmptyState title="발견된 잔돈이 없어요" />
      )}

      <BottomCta>
        <Button onClick={onStart} className="h-12 w-full text-base font-bold">
          투자 시작하기
        </Button>
      </BottomCta>
    </div>
  );
}

// ── 4. 휴면계좌 발견 및 확인 (14) ──────────────────────────────────────────────
function DormantFoundView({
  accounts,
  onNext,
}: {
  accounts: DormantAccount[];
  onNext: () => void;
}) {
  return (
    <div className="pb-32 pt-2">
      <h2 className="text-xl font-bold leading-snug text-foreground">
        휴면계좌 정리하고
        <br />
        남은 돈 옮겨드릴게요
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        쓰지 않던 계좌에 있던 금액을 포켓스톡 CMA로 모을 수 있어요
      </p>

      <div className="mt-6 space-y-2">
        {accounts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            휴면계좌가 없어요
          </p>
        ) : (
          accounts.map((a) => (
            <div
              key={a.accountId}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3.5"
            >
              <InstitutionLogo
                code={bankCodeFromName(a.bankName)}
                name={a.bankName}
                className="size-9 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {a.accountName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.bankName} · 휴면
                </p>
              </div>
              <AmountDisplay
                value={a.balance}
                size="sm"
                className="font-bold"
              />
            </div>
          ))
        )}
      </div>

      <BottomCta>
        <Button
          onClick={onNext}
          disabled={accounts.length === 0}
          className="h-12 w-full text-base font-bold"
        >
          휴면계좌 해지하기
        </Button>
      </BottomCta>
    </div>
  );
}

// ── 5. 계좌 선택 (18) ──────────────────────────────────────────────────────────
function DormantSelectView({
  accounts,
  selected,
  onToggle,
  onConfirm,
}: {
  accounts: DormantAccount[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="pb-32 pt-2">
      <h2 className="text-xl font-bold leading-snug text-foreground">
        선택한 휴면계좌의
        <br />
        자산을 옮기고 해지할게요
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        원하지 않으면 선택을 해제해주세요
      </p>

      <div className="mt-5 space-y-2">
        {accounts.map((a) => {
          const on = selected.has(a.accountId);
          return (
            <button
              key={a.accountId}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(a.accountId)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                on ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <InstitutionLogo
                code={bankCodeFromName(a.bankName)}
                name={a.bankName}
                className="size-9 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <AmountDisplay
                  value={a.balance}
                  size="sm"
                  className="block font-bold"
                />
                <p className="truncate text-xs text-muted-foreground">
                  {a.accountName} · 휴면
                </p>
              </div>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  on ? "border-primary" : "border-muted-foreground/30",
                )}
              >
                {on && <span className="size-2.5 rounded-full bg-primary" />}
              </span>
            </button>
          );
        })}
      </div>

      <BottomCta>
        <Button
          onClick={onConfirm}
          disabled={selected.size === 0}
          className="h-12 w-full text-base font-bold"
        >
          확인
        </Button>
      </BottomCta>
    </div>
  );
}

// ── 6. 정리 중 (로딩, 19) ──────────────────────────────────────────────────────
// 휴면계좌 해지(dormant)와 은행계좌 잔돈 이전(bank)이 같은 로딩 레이아웃을 공유하되
// 진행 문구는 플로우별로 구분한다.
const LOADING_COPY = {
  dormant: {
    title: ["정리할 수 있는", "계좌인지 알아볼게요"],
    steps: [
      "해지 가능한지 확인 중",
      "잔액 옮김 계좌 확인 중",
      "예상 금액 확인 중",
    ],
  },
  bank: {
    title: ["은행계좌 잔돈을", "모을 준비를 하고 있어요"],
    steps: [
      "계좌 잔돈 확인 중",
      "이체 가능 여부 확인 중",
      "모으기 설정 적용 중",
    ],
  },
} as const;

function CleanupLoadingView({
  variant = "dormant",
}: {
  variant?: keyof typeof LOADING_COPY;
}) {
  const { title, steps } = LOADING_COPY[variant];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), 700);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center text-center">
      <h2 className="text-xl font-bold leading-snug text-foreground">
        {title[0]}
        <br />
        {title[1]}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        화면을 나가면 처음부터 시작해요
      </p>

      <div className="mt-8 w-full max-w-xs space-y-3 text-left">
        {steps.map((s, i) => {
          const on = i <= active;
          return (
            <div key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  on ? "border-primary" : "border-muted-foreground/30",
                )}
              >
                {on && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span
                className={cn(
                  "text-sm transition-colors",
                  on ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {s}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 7. 휴면계좌 해지 완료 (20) ─────────────────────────────────────────────────
function cleanupStatusText(status: string) {
  if (status === "COMPLETED") return "이체 완료";
  if (status === "ALREADY_CLOSED") return "해지 완료";
  return "실패";
}

function CleanupDoneView({
  result,
  accounts,
  onNext,
}: {
  result: DormantCloseResult | null;
  accounts: DormantAccount[];
  onNext: () => void;
}) {
  const nameById = new Map(accounts.map((a) => [a.accountId, a.accountName]));
  const items = result?.results ?? [];

  return (
    <div className="pb-32 pt-2">
      <h2 className="text-xl font-bold leading-snug text-foreground">
        계좌 해지 성공!
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        돈을 CMA로 옮기고 있어요
      </p>

      <div className="mt-6 space-y-2">
        {items.map((it, i) => (
          <div
            key={it.accountId}
            className="ps-rise-in flex items-center gap-3 rounded-xl border border-border px-4 py-3.5"
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Landmark className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <AmountDisplay
                value={it.amount}
                size="sm"
                className="block font-bold"
              />
              <p className="truncate text-xs text-muted-foreground">
                {nameById.get(it.accountId) ?? "계좌"}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                it.status === "COMPLETED"
                  ? "bg-primary/10 text-primary"
                  : it.status === "ALREADY_CLOSED"
                    ? "bg-muted text-muted-foreground"
                    : "bg-destructive/10 text-destructive",
              )}
            >
              {cleanupStatusText(it.status)}
            </span>
          </div>
        ))}
      </div>

      <BottomCta>
        <Button onClick={onNext} className="h-12 w-full text-base font-bold">
          다음
        </Button>
      </BottomCta>
    </div>
  );
}

// ── 8. 카드 선택 (잔돈 적립, 15) ───────────────────────────────────────────────

function CardSelectView({
  cards,
  isLoading,
  isError,
  onRetry,
  initialSelectedIds,
  selectedIds,
  onChangeSelected,
  onNext,
}: {
  cards: LinkedCard[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  initialSelectedIds: Set<number>;
  selectedIds: Set<number>;
  onChangeSelected: (ids: Set<number>) => void;
  onNext: () => void;
}) {
  // 초기값 반영 — collectSettings 로드 완료 시 한 번만 적용
  useEffect(() => {
    if (initialSelectedIds.size > 0 && selectedIds.size === 0) {
      onChangeSelected(new Set(initialSelectedIds));
    }
    // 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedIds.size]);

  const toggle = (cardId: number) => {
    // 카드 선택은 단일 선택 — 같은 카드를 다시 누르면 해제
    onChangeSelected(selectedIds.has(cardId) ? new Set() : new Set([cardId]));
  };

  return (
    <div className="pb-32 pt-2">
      <h2 className="text-xl font-bold text-foreground">
        결제 후 잔돈 자동 모으기
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        결제 후 남는 잔돈을 모을 카드를 선택해 주세요.
      </p>

      <div className="mt-5 space-y-2">
        {isLoading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              카드 정보를 불러오지 못했어요.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="text-sm font-bold text-primary underline"
            >
              다시 시도
            </button>
          </div>
        ) : cards.length === 0 ? (
          <EmptyState title="연동된 카드가 없어요" />
        ) : (
          cards.map((c) => {
            const on = selectedIds.has(c.cardId);
            return (
              <button
                key={c.cardId}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => toggle(c.cardId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                  on ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <InstitutionLogo
                  code={cardCodeFromName(c.companyName)}
                  name={c.companyName}
                  className="size-9 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {c.cardName}
                  </p>
                  <p className="truncate font-numeric text-xs text-muted-foreground">
                    {c.maskedNo ?? "····-····-····"}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    on
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30",
                  )}
                >
                  {on && <Check className="size-3 text-primary-foreground" />}
                </span>
              </button>
            );
          })
        )}
      </div>

      <BottomCta>
        <Button
          onClick={onNext}
          disabled={isError || isLoading}
          className="h-12 w-full text-base font-bold"
        >
          선택 완료
        </Button>
      </BottomCta>
    </div>
  );
}

// ── 9. 자동 적립 동의 (16) ─────────────────────────────────────────────────────
const AGREE_ITEMS = [
  {
    key: "collect",
    required: false,
    label: "신한카드 결제 잔돈 수집",
    desc: "월 1회 자동으로 잔돈을 모아 포켓스톡 CMA에 입금해요",
  },
  {
    key: "push",
    required: false,
    label: "포켓스톡 앱 알림 수신",
    desc: "잔돈 모음 완료 및 자산 변동 시 알림을 받을 수 있어요",
  },
  {
    key: "privacy",
    required: true,
    label: "개인정보 수집 및 이용 (필수)",
    desc: "신한카드 결제 잔돈을 포켓스톡 서비스에 저장해요",
  },
];

function AutoAgreeView({
  pending,
  onAgree,
  onLater,
}: {
  pending: boolean;
  /** collect 체크 여부를 전달 — true면 카드 선택으로, false면 홈으로 */
  onAgree: (collectChecked: boolean) => void;
  onLater: () => void;
}) {
  // 필수 항목(privacy) + collect 기본 체크
  const [checked, setChecked] = useState<Set<string>>(
    () =>
      new Set(
        AGREE_ITEMS.filter((i) => i.required || i.key === "collect").map(
          (i) => i.key,
        ),
      ),
  );
  const requiredOk = AGREE_ITEMS.filter((i) => i.required).every((i) =>
    checked.has(i.key),
  );
  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="pb-32 pt-2">
      <h2 className="text-xl font-bold text-foreground">자동 적립 설정</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        신한카드 결제 잔돈이 자동으로
        <br />
        포켓스톡 CMA에 모여요
      </p>

      <div className="mt-5 space-y-1">
        {AGREE_ITEMS.map((item) => {
          const on = checked.has(item.key);
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(item.key)}
              className="flex w-full items-start gap-3 rounded-xl px-2 py-3 text-left"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-transparent",
                )}
              >
                <Check className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground">
                  {item.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <p className="font-bold text-foreground">유의사항</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>결제 잔돈 기준: 100원 이상</li>
          <li>적립 단위: 1,000원</li>
          <li>연동된 설정은 언제든 변경 가능</li>
        </ul>
      </div>

      <BottomCta>
        <Button
          onClick={() => onAgree(checked.has("collect"))}
          disabled={!requiredOk || pending}
          className="h-12 w-full text-base font-bold"
        >
          {pending ? "처리 중..." : "동의하고 시작"}
        </Button>
        <button
          type="button"
          onClick={onLater}
          disabled={pending}
          className="mt-2 w-full py-1 text-center text-sm text-muted-foreground disabled:opacity-50"
        >
          나중에 하기
        </button>
      </BottomCta>
    </div>
  );
}

// ── 10. 은행 계좌 소액 이체 — 계좌 선택 (505: 17) ──────────────────────────────
const TRANSFER_THRESHOLDS = [1000, 5000, 10000];

function BankSelectView({
  accounts,
  onConfirm,
}: {
  accounts: BankAccount[];
  onConfirm: (accounts: BankAccount[], threshold: number) => void;
}) {
  const [threshold, setThreshold] = useState(5000);
  // 자투리 = 잔액 % 기준금액 — 잔액이 기준금액보다 커도 기준 미만의 끝전만 부분 수집한다.
  const jaturiOf = (a: BankAccount, t: number) => toDecimal(a.balance).mod(t);
  const eligibleFor = (t: number) =>
    accounts.filter((a) => jaturiOf(a, t).greaterThan(0));
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(eligibleFor(5000).map((a) => a.accountId)),
  );

  const filtered = eligibleFor(threshold);
  const pickThreshold = (t: number) => {
    setThreshold(t);
    setSelected(new Set(eligibleFor(t).map((a) => a.accountId)));
  };
  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const chosen = filtered.filter((a) => selected.has(a.accountId));

  return (
    <div className="pb-32 pt-2">
      <h2 className="text-xl font-bold leading-snug text-foreground">
        선택한 계좌의 잔돈을
        <br />
        CMA로 모을 준비를 할게요
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        원하지 않으면 선택을 해제해주세요
      </p>

      {/* 수집 기준 금액 */}
      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          수집 기준 금액
        </span>
        <span className="text-xs text-muted-foreground">미만 잔액만 수집</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {TRANSFER_THRESHOLDS.map((t) => {
          const on = threshold === t;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => pickThreshold(t)}
              className={cn(
                "rounded-xl border py-2.5 text-sm font-bold transition-colors",
                on
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-foreground",
              )}
            >
              {t.toLocaleString("ko-KR")}원
            </button>
          );
        })}
      </div>

      {/* 대상 계좌 */}
      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState title="기준 금액 미만의 잔돈이 있는 계좌가 없어요" />
        ) : (
          filtered.map((a) => {
            const on = selected.has(a.accountId);
            return (
              <button
                key={a.accountId}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(a.accountId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                  on ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <InstitutionLogo
                  code={a.bankCode}
                  name={a.bankName}
                  className="size-9 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <AmountDisplay
                    value={jaturiOf(a, threshold).toNumber()}
                    size="sm"
                    className="block font-bold"
                  />
                  <p className="truncate text-xs text-muted-foreground">
                    {a.accountName} · 잔액 {formatKRW(a.balance)}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    on ? "border-primary" : "border-muted-foreground/30",
                  )}
                >
                  {on && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* 확인해주세요 */}
      <div className="mt-4 rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <p className="font-bold text-foreground">확인해주세요</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>기준 금액 미만 잔액만 모으기 대상에 담겨요</li>
          <li>실제 모으기는 홈에서 CMA로 모으기 버튼을 누를 때 실행돼요</li>
          <li>잔액을 모을 때 이체수수료가 발생할 수 있어요</li>
        </ul>
      </div>

      <BottomCta>
        <Button
          onClick={() => onConfirm(chosen, threshold)}
          className="h-12 w-full text-base font-bold"
        >
          확인
        </Button>
      </BottomCta>
    </div>
  );
}

// ── 11. 은행 계좌 소액 이체 완료 (505: 20) ─────────────────────────────────────
function BankDoneView({
  accounts,
  onNext,
}: {
  accounts: BankAccount[];
  onNext: () => void;
}) {
  return (
    <div className="pb-32 pt-2">
      <h2
        className="ps-rise-in text-xl font-bold leading-snug text-foreground"
        style={{ "--i": 0 } as React.CSSProperties}
      >
        모으기 설정 완료!
      </h2>
      <p
        className="ps-rise-in mt-1.5 text-sm text-muted-foreground"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        홈에서 CMA로 모으기 버튼을 누르면 한 번에 모여요
      </p>

      <div className="mt-6 space-y-2">
        {accounts.map((a, i) => (
          <div
            key={a.accountId}
            className="ps-rise-in flex items-center gap-3 rounded-xl border border-border px-4 py-3.5"
            style={{ "--i": i + 2 } as React.CSSProperties}
          >
            <InstitutionLogo
              code={a.bankCode}
              name={a.bankName}
              className="size-9 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <AmountDisplay
                value={a.balance}
                size="sm"
                className="block font-bold"
              />
              <p className="truncate text-xs text-muted-foreground">
                {a.accountName}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              설정 완료
            </span>
          </div>
        ))}
      </div>

      <BottomCta>
        <Button onClick={onNext} className="h-12 w-full text-base font-bold">
          확인
        </Button>
      </BottomCta>
    </div>
  );
}
