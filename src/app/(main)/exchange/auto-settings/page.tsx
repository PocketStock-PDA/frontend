"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import { useExchangeAutoSettings } from "@/hooks/queries/useExchangeAutoSettings";
import { useUpdateAutoSettings } from "@/hooks/mutations/useUpdateAutoSettings";
import type { FxAutoSetting } from "@/types/domain/exchange";

// residualHandling 백엔드 enum 값
const RESIDUAL_CONVERT = "CONVERT_TO_KRW";
const RESIDUAL_KEEP = "KEEP_AS_USD";
const DEFAULT_SETTINGS: FxAutoSetting = {
  autoEnabled: false,
  useDollarFirst: true,
  maxAmountPerTx: null,
  residualHandling: RESIDUAL_CONVERT,
};

function fmtKRW(v: number) {
  return v.toLocaleString("ko-KR");
}

export default function AutoSettingsPage() {
  const {
    data: settings,
    isError,
    isLoading,
    refetch,
  } = useExchangeAutoSettings();

  if (isLoading) {
    return (
      <>
        <AppHeader variant="sub" title="자동환전 설정" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <AppHeader variant="sub" title="자동환전 설정" />
        <EmptyState
          title="설정을 불러오지 못했어요"
          description="저장된 설정을 확인한 뒤 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          }
          className="mt-8"
        />
      </>
    );
  }

  return <AutoSettingsForm initialSettings={settings ?? DEFAULT_SETTINGS} />;
}

function AutoSettingsForm({
  initialSettings,
}: {
  initialSettings: FxAutoSetting;
}) {
  const router = useRouter();
  const update = useUpdateAutoSettings();

  const [autoEnabled, setAutoEnabled] = useState(initialSettings.autoEnabled);
  const [useDollarFirst, setUseDollarFirst] = useState(
    initialSettings.useDollarFirst,
  );
  const [maxAmount, setMaxAmount] = useState<number | null>(
    initialSettings.maxAmountPerTx,
  );
  const [residual, setResidual] = useState<string>(
    initialSettings.residualHandling ?? RESIDUAL_CONVERT,
  );

  // 한도 시트
  const [limitSheetOpen, setLimitSheetOpen] = useState(false);
  const [limitInputRaw, setLimitInputRaw] = useState(
    initialSettings.maxAmountPerTx !== null
      ? fmtKRW(initialSettings.maxAmountPerTx)
      : "",
  );

  function handleLimitInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
    const n = Number(raw);
    setLimitInputRaw(n > 0 ? fmtKRW(n) : "");
  }

  function applyLimit() {
    const n = Number(limitInputRaw.replace(/,/g, "")) || null;
    setMaxAmount(n);
    setLimitSheetOpen(false);
  }

  async function handleSave() {
    try {
      await update.mutateAsync({
        autoEnabled,
        useDollarFirst,
        maxAmountPerTx: maxAmount,
        residualHandling: residual,
      });
      toast.success("설정이 저장됐어요");
      router.push("/exchange");
    } catch {
      toast.error("저장에 실패했어요. 다시 시도해 주세요.");
    }
  }

  return (
    <>
      <AppHeader variant="sub" title="자동환전 설정" />

      <div className="flex flex-col gap-5 pb-8">
        {/* 안내 카드 */}
        <div className="rounded-2xl bg-blue-50 px-4 py-4">
          <p className="mb-1 text-[13px] font-bold text-blue-900">
            미국 주식 매수 시 자동환전
          </p>
          <p className="text-[12px] leading-relaxed text-blue-700">
            달러가 부족할 경우 매수에 필요한 금액만
            {"\n"}포켓스톡 CMA에서 자동으로 환전합니다
          </p>
        </div>

        {/* 설정 리스트 */}
        <div className="rounded-2xl bg-white shadow-sm">
          {/* 자동환전 사용 */}
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-[14px] font-bold text-foreground">자동환전 사용</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                미국 주식 매수 시 달러 자동 환전
              </p>
            </div>
            <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
          </div>

          <div className="mx-5 border-t border-border" />

          {/* 달러 예수금 우선 사용 */}
          <div
            className={`flex items-center justify-between px-5 py-4 transition-opacity ${
              !autoEnabled ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <div>
              <p className="text-[14px] font-bold text-foreground">
                달러 예수금 우선 사용
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                보유 달러 먼저 사용 후 부족분만 환전
              </p>
            </div>
            <Switch
              checked={useDollarFirst}
              onCheckedChange={setUseDollarFirst}
              disabled={!autoEnabled}
            />
          </div>

          <div className="mx-5 border-t border-border" />

          {/* 1회 최대 환전 한도 */}
          <div
            className={`px-5 pt-4 transition-opacity ${
              !autoEnabled ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <p className="text-[14px] font-bold text-foreground">1회 최대 환전 한도</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              이 금액 초과 시 직접 확인 후 환전
            </p>
            <div className="mx-0 mt-3 border-t border-border" />
            <button
              type="button"
              onClick={() => setLimitSheetOpen(true)}
              className="flex w-full items-center justify-between py-4"
            >
              <span className="text-[13px] text-muted-foreground">한도</span>
              <span className="flex items-center gap-1 text-[13px] font-semibold text-foreground">
                {maxAmount !== null ? `${fmtKRW(maxAmount)}원` : "제한 없음"}
                <ChevronRight className="size-4 text-muted-foreground" />
              </span>
            </button>
          </div>
        </div>

        {/* 외화 잔돈 처리 */}
        <div
          className={`flex flex-col gap-2.5 transition-opacity ${
            !autoEnabled ? "pointer-events-none opacity-40" : ""
          }`}
        >
          <p className="px-1 text-[12px] font-medium text-muted-foreground">
            외화 잔돈 처리
          </p>
          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
            <p className="mb-1 text-[13px] font-bold text-foreground">
              환전 후 남은 소액 외화
            </p>
            <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
              $0.01 미만 소액 잔돈은 원화로 전환하여{"\n"}포켓스톡 CMA에 적립합니다
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResidual(RESIDUAL_CONVERT)}
                className={`rounded-xl border-2 py-3 text-[13px] font-bold transition-colors ${
                  residual === RESIDUAL_CONVERT
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-foreground"
                }`}
              >
                원화로 전환
              </button>
              <button
                type="button"
                onClick={() => setResidual(RESIDUAL_KEEP)}
                className={`rounded-xl border-2 py-3 text-[13px] font-bold transition-colors ${
                  residual === RESIDUAL_KEEP
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-foreground"
                }`}
              >
                달러로 유지
              </button>
            </div>
          </div>
        </div>

        <Button
          className="h-14 w-full rounded-2xl text-base font-bold"
          onClick={handleSave}
          disabled={update.isPending}
        >
          설정 저장
        </Button>
      </div>

      {/* 한도 입력 시트 */}
      <Sheet open={limitSheetOpen} onOpenChange={setLimitSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-10 pt-6">
          <SheetHeader className="mb-6 text-left">
            <SheetTitle>1회 최대 환전 한도</SheetTitle>
          </SheetHeader>
          <div className="flex items-baseline gap-2 rounded-xl bg-muted/50 px-4 py-3">
            <Input
              autoFocus
              inputMode="numeric"
              placeholder="제한 없음"
              value={limitInputRaw}
              onChange={handleLimitInput}
              className="h-auto border-0 bg-transparent p-0 text-[22px] font-bold shadow-none focus-visible:ring-0"
            />
            <span className="shrink-0 text-base font-bold text-muted-foreground">원</span>
          </div>
          <div className="mt-3 flex gap-2">
            {[50_000, 100_000, 300_000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setLimitInputRaw(fmtKRW(amt))}
                className="flex-1 rounded-xl bg-muted py-2.5 text-[12px] font-bold text-foreground active:bg-muted/70"
              >
                {fmtKRW(amt)}원
              </button>
            ))}
            <button
              type="button"
              onClick={() => setLimitInputRaw("")}
              className="flex-1 rounded-xl bg-muted py-2.5 text-[12px] font-bold text-muted-foreground active:bg-muted/70"
            >
              제한 없음
            </button>
          </div>
          <Button className="mt-5 h-13 w-full rounded-2xl text-base font-bold" onClick={applyLimit}>
            확인
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
