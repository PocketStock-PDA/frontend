"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useSendUnlockCode,
  useUnlockAccountPassword,
} from "@/hooks/mutations/useAccountPasswordUnlock";

interface AccountPasswordUnlockProps {
  /** 잠금 해제 성공 후 호출 — 보통 비밀번호 입력 화면으로 복귀. */
  onUnlocked: () => void;
}

/**
 * 계좌 비밀번호 잠금 해제 — 등록 휴대폰으로 받은 푸시 인증번호로 해제.
 * 계좌 비밀번호 검증이 ACCOUNT_PASSWORD_LOCKED(423)를 던질 때 노출한다.
 */
export function AccountPasswordUnlock({ onUnlocked }: AccountPasswordUnlockProps) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const send = useSendUnlockCode();
  const unlock = useUnlockAccountPassword();

  const handleSend = () => {
    if (send.isPending) return;
    send.mutate(undefined, {
      onSuccess: () => {
        setSent(true);
        toast.success("푸시 알림으로 인증번호를 보냈어요 (3분 내 유효)");
      },
      onError: (e) =>
        toast.error(
          e instanceof ApiError ? e.message : "인증번호 발송에 실패했어요",
        ),
    });
  };

  const handleUnlock = () => {
    if (unlock.isPending || !code.trim()) return;
    unlock.mutate(code.trim(), {
      onSuccess: () => {
        toast.success("잠금이 해제됐어요. 다시 입력해 주세요.");
        onUnlocked();
      },
      onError: (e) => {
        toast.error(
          e instanceof ApiError ? e.message : "잠금 해제에 실패했어요",
        );
        setCode("");
      },
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 px-2 py-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-bold text-foreground">
          계좌 비밀번호가 잠겼어요
        </p>
        <p className="text-sm text-muted-foreground">
          5회 잘못 입력했어요. 휴대폰 푸시 알림으로 받은
          <br />
          인증번호로 잠금을 해제해 주세요.
        </p>
      </div>

      {!sent ? (
        <Button
          onClick={handleSend}
          disabled={send.isPending}
          className="mt-2 h-12 w-full text-base font-bold"
        >
          {send.isPending ? "발송 중..." : "인증번호 받기 (푸시)"}
        </Button>
      ) : (
        <div className="w-full space-y-3">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            autoFocus
            placeholder="푸시로 받은 인증번호 입력"
            className="h-12 text-center text-lg tracking-widest"
          />
          <Button
            onClick={handleUnlock}
            disabled={unlock.isPending || !code.trim()}
            className="h-12 w-full text-base font-bold"
          >
            {unlock.isPending ? "확인 중..." : "잠금 해제"}
          </Button>
          <button
            type="button"
            onClick={handleSend}
            disabled={send.isPending}
            className="text-sm text-muted-foreground underline disabled:opacity-50"
          >
            인증번호 재발송
          </button>
        </div>
      )}
    </div>
  );
}
