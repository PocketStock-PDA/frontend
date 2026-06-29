"use client";

import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/common/AppHeader";
import { AutoChargeSettingsForm } from "@/components/features/cma/AutoChargeSettingsForm";

export default function AutoChargePage() {
  const router = useRouter();

  return (
    <>
      <AppHeader variant="sub" title="부족금액 자동충전 설정" />
      <AutoChargeSettingsForm onSaved={() => router.back()} />
    </>
  );
}
