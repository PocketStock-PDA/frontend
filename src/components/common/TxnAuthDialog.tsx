"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { PinKeypad } from "@/components/common/PinKeypad";
import { useTxnAuth } from "@/hooks/mutations/useTxnAuth";

interface TxnAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 계좌 비밀번호 인증 성공 후 호출 — 보통 직전 주문을 동일 멱등키로 재시도한다. */
  onVerified: () => void;
}

/**
 * 거래 인증(계좌 비밀번호) 입력 시트.
 * 주문/이체가 TXN_AUTH_REQUIRED(401)를 던지면 띄워, 4자리 계좌 비밀번호를
 * 검증(keepAuth=true, 30분 세션 유지)한 뒤 onVerified로 원래 동작을 재시도한다.
 */
export function TxnAuthDialog({
  open,
  onOpenChange,
  onVerified,
}: TxnAuthDialogProps) {
  const [pin, setPin] = useState("");
  // ON이면 30분간 비밀번호 없이 거래(keepAuth). OFF면 이번 1건만 인증(VALUE_ONCE).
  const [keepAuth, setKeepAuth] = useState(false);
  const txnAuth = useTxnAuth();

  // 시트가 닫힐 때 입력을 비워 다음 진입이 깨끗하게 시작되도록 한다.
  const handleOpenChange = (next: boolean) => {
    if (!next) setPin("");
    onOpenChange(next);
  };

  const handleChange = async (value: string) => {
    setPin(value);
    if (value.length < 4) return;
    try {
      await txnAuth.mutateAsync({ accountPassword: value, keepAuth });
      setPin("");
      onOpenChange(false);
      onVerified();
    } catch {
      toast.error("비밀번호가 틀렸어요. 다시 입력해 주세요.");
      setPin("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="gap-0 px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-7"
      >
        <SheetHeader className="p-0">
          <SheetTitle className="text-center text-base font-bold text-foreground">
            계좌 비밀번호 입력
          </SheetTitle>
          <SheetDescription className="text-center text-sm text-muted-foreground">
            거래 인증을 위해 4자리 숫자를 입력해 주세요
          </SheetDescription>
        </SheetHeader>
        <PinKeypad
          value={pin}
          onChange={handleChange}
          length={4}
          disabled={txnAuth.isPending}
          className="mt-8"
        />

        <label className="mt-8 flex items-center justify-between">
          <span className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              30분간 비밀번호 없이 거래
            </span>
            <span className="text-[11px] text-muted-foreground">
              켜두면 30분 동안 추가 입력 없이 매매할 수 있어요
            </span>
          </span>
          <Switch
            checked={keepAuth}
            onCheckedChange={setKeepAuth}
            disabled={txnAuth.isPending}
            aria-label="30분간 비밀번호 없이 거래"
          />
        </label>
      </SheetContent>
    </Sheet>
  );
}
