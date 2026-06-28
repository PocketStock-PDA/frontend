"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useTransferAccount } from "@/hooks/queries/useTransferAccount";
import { useSetTransferAccount } from "@/hooks/mutations/useSetTransferAccount";
import { cn } from "@/lib/utils";
import type { BankAccount } from "@/types/domain/account";

function AccountItem({
  account,
  selected,
  onSelect,
}: {
  account: BankAccount;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background",
      )}
    >
      <div>
        <p className="text-sm font-medium text-foreground">{account.bankName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{account.accountName}</p>
      </div>
      {selected && <CheckCircle2 className="size-5 shrink-0 text-primary" />}
    </button>
  );
}

export default function SavingsTransferPage() {
  const router = useRouter();
  const bankAccounts = useBankAccounts();
  const currentAccount = useTransferAccount();
  const setAccount = useSetTransferAccount();

  const initialSelectedId = currentAccount.data?.accountId ?? null;
  const [selectedOverride, setSelectedOverride] = useState<
    number | null | undefined
  >(undefined);
  const selectedId =
    selectedOverride !== undefined ? selectedOverride : initialSelectedId;

  // 절약금 이체는 입출금(DEMAND)·비휴면 원화 계좌만 가능 (예금/적금 제외)
  const krwAccounts = (bankAccounts.data ?? []).filter(
    (a) => a.currency === "KRW" && a.accountType === "DEMAND" && !a.isDormant,
  );

  const isLoading = bankAccounts.isLoading || currentAccount.isLoading;
  const isError = bankAccounts.isError;

  const handleSave = () => {
    if (selectedId === null) return;
    setAccount.mutate(selectedId, {
      onSuccess: () => router.back(),
    });
  };

  return (
    <>
      <AppHeader variant="sub" title="절약금 이체 계좌 변경" />

      <div className="pb-24">
        <p className="mb-4 text-sm text-muted-foreground">
          매월 절약금을 이체받을 계좌를 선택해 주세요.
        </p>

        {isLoading && <SkeletonCard lines={3} className="h-20" />}

        {isError && (
          <EmptyState
            title="계좌 정보를 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => bankAccounts.refetch()}
              >
                다시 시도
              </Button>
            }
          />
        )}

        {!isLoading && !isError && krwAccounts.length === 0 && (
          <EmptyState
            title="받을 수 있는 입출금통장이 없어요"
            description="절약금은 입출금통장으로만 받을 수 있어요. 통장을 연동하고 다시 시도해 주세요."
            action={
              <Button size="sm" onClick={() => router.push("/asset-link")}>
                계좌 연동하기
              </Button>
            }
          />
        )}

        {!isLoading && !isError && krwAccounts.length > 0 && (
          <div role="radiogroup" className="space-y-2.5">
            {krwAccounts.map((account) => (
              <AccountItem
                key={account.accountId}
                account={account}
                selected={selectedId === account.accountId}
                onSelect={() => setSelectedOverride(account.accountId)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-[var(--bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-5">
        <Button
          className="h-14 w-full text-base font-bold"
          disabled={selectedId === null || isError || isLoading || setAccount.isPending}
          onClick={handleSave}
        >
          {setAccount.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </>
  );
}
