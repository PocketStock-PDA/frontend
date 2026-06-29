"use client";

import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import {
  FxAutoSettingsForm,
  DEFAULT_FX_AUTO_SETTINGS,
} from "@/components/features/exchange/FxAutoSettingsForm";
import { useExchangeAutoSettings } from "@/hooks/queries/useExchangeAutoSettings";

export default function AutoSettingsPage() {
  const router = useRouter();
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

  return (
    <>
      <AppHeader variant="sub" title="자동환전 설정" />
      <FxAutoSettingsForm
        initialSettings={settings ?? DEFAULT_FX_AUTO_SETTINGS}
        onSaved={() => router.push("/exchange")}
      />
    </>
  );
}
