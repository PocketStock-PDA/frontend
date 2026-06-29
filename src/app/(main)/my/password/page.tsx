"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdatePassword } from "@/hooks/mutations/useUpdatePassword";
import { useLogout } from "@/hooks/mutations/useAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

// 서버 PasswordPolicy(8자/대/소/숫자/특수)와 동일 기준 — 최종 판정은 서버에 위임.
const PW_RULES = [
  { key: "MIN_LENGTH", label: "8자 이상", test: (p: string) => p.length >= 8 },
  { key: "UPPERCASE", label: "대문자", test: (p: string) => /[A-Z]/.test(p) },
  { key: "LOWERCASE", label: "소문자", test: (p: string) => /[a-z]/.test(p) },
  { key: "DIGIT", label: "숫자", test: (p: string) => /\d/.test(p) },
  { key: "SPECIAL", label: "특수문자", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const errMsg = (e: unknown) =>
  e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.";

export default function PasswordChangePage() {
  const router = useRouter();
  const update = useUpdatePassword();
  const logout = useLogout();
  const { setGuest } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const allPwOk = PW_RULES.every((r) => r.test(next));
  const match = next.length > 0 && next === confirm;
  const sameAsCurrent = current.length > 0 && current === next;
  const canSubmit =
    current.length > 0 && allPwOk && match && !sameAsCurrent && !update.isPending;

  const onSubmit = () => {
    if (!canSubmit) return;
    update.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast.success("비밀번호를 변경했어요. 다시 로그인해 주세요.");
          // 서버가 refresh token을 전부 폐기 → 세션 정리 후 재로그인 유도.
          logout.mutate(undefined, {
            onSettled: () => {
              setGuest();
              router.replace("/login");
            },
          });
        },
        onError: (e) => toast.error(errMsg(e)),
      },
    );
  };

  return (
    <>
      <AppHeader variant="sub" title="비밀번호 변경" />

      <div className="flex flex-col gap-6 pb-24 pt-2">
        <p className="text-sm text-muted-foreground">
          현재 비밀번호 확인 후 새 비밀번호로 변경해요.
        </p>

        {/* 현재 비밀번호 */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-foreground">현재 비밀번호</span>
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="현재 비밀번호"
            aria-label="현재 비밀번호"
            autoComplete="current-password"
            className="h-12"
          />
        </div>

        {/* 새 비밀번호 */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-foreground">새 비밀번호</span>
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="새 비밀번호"
            aria-label="새 비밀번호"
            autoComplete="new-password"
            className="h-12"
          />
          <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
            {PW_RULES.map((r) => {
              const ok = r.test(next);
              return (
                <li
                  key={r.key}
                  className={cn(
                    "inline-flex items-center gap-1 text-xs transition-colors",
                    ok ? "font-medium text-primary" : "text-muted-foreground",
                  )}
                >
                  <Check className={cn("size-3.5", ok ? "opacity-100" : "opacity-30")} />
                  {r.label}
                </li>
              );
            })}
          </ul>
          {sameAsCurrent && (
            <p className="text-xs text-destructive">
              새 비밀번호는 현재 비밀번호와 달라야 해요.
            </p>
          )}
        </div>

        {/* 새 비밀번호 확인 */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-foreground">새 비밀번호 확인</span>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="새 비밀번호 확인"
            aria-label="새 비밀번호 확인"
            autoComplete="new-password"
            className="h-12"
          />
          {confirm.length > 0 && !match && (
            <p className="text-xs text-destructive">비밀번호가 일치하지 않아요.</p>
          )}
        </div>
      </div>

      <div className="fixed bottom-[var(--bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-5">
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="h-12 w-full text-base font-bold"
        >
          {update.isPending ? "변경 중..." : "변경하기"}
        </Button>
      </div>
    </>
  );
}
