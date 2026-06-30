"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { PageContainer } from "@/components/common/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinKeypad } from "@/components/common/PinKeypad";
import { PatternLock } from "@/components/features/auth/PatternLock";
import { useLogin, usePinLogin } from "@/hooks/mutations/useAuth";
import { RedirectIfAuthed, useAuth } from "@/lib/auth/AuthProvider";
import type { AuthMethodType } from "@/types/domain/auth";

const errMsg = (e: unknown) =>
  e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.";

type Mode = "PASSWORD" | "SIMPLE";

export default function LoginPage() {
  return (
    <RedirectIfAuthed>
      <LoginScreen />
    </RedirectIfAuthed>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState<Mode>("PASSWORD");

  return (
    <PageContainer className="flex min-h-screen flex-col">
      <div className="pt-24 pb-10 text-center">
        <Image
          src="/images/PocketStock-logo-clean.png"
          alt="포켓스톡"
          width={72}
          height={72}
          priority
          className="mx-auto mb-3 size-16"
        />
        <h1 className="text-lg font-bold text-primary">포켓스톡</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          잔돈으로 시작하는 소수점 투자
        </p>
      </div>

      {mode === "PASSWORD" ? (
        <PasswordLogin onSimple={() => setMode("SIMPLE")} />
      ) : (
        <SimpleLogin onPassword={() => setMode("PASSWORD")} />
      )}
    </PageContainer>
  );
}

// ── 아이디/비밀번호 로그인 ─────────────────────────────────────────────────────
function PasswordLogin({ onSimple }: { onSimple: () => void }) {
  const router = useRouter();
  const { setAuthed } = useAuth();
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = username.trim().length > 0 && password.length > 0;

  const onSubmit = () => {
    if (!canSubmit || login.isPending) return;
    login.mutate(
      { username: username.trim(), password },
      {
        onSuccess: () => {
          setAuthed();
          router.replace("/superSol");
        },
        onError: (e) => toast.error(errMsg(e)),
      },
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-3">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="아이디"
          aria-label="아이디"
          autoCapitalize="none"
          className="h-12"
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="비밀번호"
          aria-label="비밀번호"
          className="h-12"
        />
        <Button
          onClick={onSubmit}
          disabled={!canSubmit || login.isPending}
          className="h-12 w-full text-base font-bold"
        >
          {login.isPending ? "로그인 중..." : "로그인"}
        </Button>
      </div>

      <button
        type="button"
        onClick={onSimple}
        className="mt-4 text-sm font-medium text-primary hidden"
      >
        간편 로그인 (PIN·패턴)
      </button>

      <div className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-primary">
          회원가입
        </Link>
      </div>
    </div>
  );
}

// ── 간편 로그인 (PIN/패턴) ─────────────────────────────────────────────────────
function SimpleLogin({ onPassword }: { onPassword: () => void }) {
  const router = useRouter();
  const { setAuthed } = useAuth();
  const pinLogin = usePinLogin();
  const [method, setMethod] = useState<AuthMethodType | null>(null);
  const [nonce, setNonce] = useState(0);

  const submit = (type: AuthMethodType, value: string) => {
    if (pinLogin.isPending) return;
    pinLogin.mutate(
      { type, value },
      {
        onSuccess: () => {
          setAuthed();
          router.replace("/superSol");
        },
        onError: (e) => {
          toast.error(errMsg(e));
          setNonce((n) => n + 1); // 입력 초기화
        },
      },
    );
  };

  if (method === null) {
    return (
      <div className="flex flex-1 flex-col">
        <p className="text-center text-sm text-muted-foreground">
          등록한 간편 로그인 수단을 선택해 주세요.
        </p>
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => setMethod("PIN")}
            className="flex w-full flex-col items-start gap-1 rounded-xl border border-border px-4 py-4 text-left"
          >
            <span className="text-base font-bold text-foreground">
              PIN 번호
            </span>
            <span className="text-xs text-muted-foreground">숫자 6자리</span>
          </button>
          <button
            type="button"
            onClick={() => setMethod("PATTERN")}
            className="flex w-full flex-col items-start gap-1 rounded-xl border border-border px-4 py-4 text-left"
          >
            <span className="text-base font-bold text-foreground">패턴</span>
            <span className="text-xs text-muted-foreground">점 4개 이상</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onPassword}
          className="mt-auto pt-8 text-center text-sm font-medium text-primary"
        >
          비밀번호로 로그인
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-base font-bold text-foreground">
        {method === "PIN" ? "PIN 번호를 입력해 주세요" : "패턴을 그려 주세요"}
      </p>

      <div className="mt-10">
        {method === "PIN" ? (
          <PinLoginField
            key={`pin-${nonce}`}
            disabled={pinLogin.isPending}
            onSubmit={(v) => submit("PIN", v)}
          />
        ) : (
          <PatternLock
            key={`pattern-${nonce}`}
            minLength={4}
            disabled={pinLogin.isPending}
            onComplete={(v) => submit("PATTERN", v)}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setMethod(null);
          onPassword();
        }}
        className="mt-auto pt-8 text-center text-sm font-medium text-primary"
      >
        비밀번호로 로그인
      </button>
    </div>
  );
}

/** PIN 6자리 입력 — 6자리 채우면 제출. key로 리마운트해 초기화. */
function PinLoginField({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (v: string) => void;
}) {
  const [pin, setPin] = useState("");
  const handleChange = (v: string) => {
    setPin(v);
    if (v.length === 6) onSubmit(v);
  };
  return (
    <PinKeypad
      value={pin}
      onChange={handleChange}
      length={6}
      disabled={disabled}
    />
  );
}
