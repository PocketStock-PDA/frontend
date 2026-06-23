"use client";

// 메모리 액세스 토큰 전략에서는 서버 미들웨어가 토큰을 볼 수 없으므로 인증 보호를
// 클라이언트에서 한다. 앱 부팅 시 refresh를 1회 시도해 세션을 복구하고(새로고침 대응),
// status를 기준으로 가드한다.  ([[auth-strategy]])

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { refreshAccessToken } from "@/lib/api/client";
import { clearSession, hasSeenEvent } from "@/lib/auth/session";

type AuthStatus = "loading" | "authed" | "guest";

interface AuthContextValue {
  status: AuthStatus;
  /** 로그인 성공 직후 호출 — 메모리 토큰은 mutation에서 이미 세팅됨. */
  setAuthed: () => void;
  /** 로그아웃 시 호출 — 메모리 세션 정리 + 게스트 전환. */
  setGuest: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");

  // 부팅 1회 silent refresh — refreshToken 쿠키(/api/auth)로 세션 복구 시도.
  useEffect(() => {
    let cancelled = false;
    refreshAccessToken().then((ok) => {
      if (!cancelled) setStatus(ok ? "authed" : "guest");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      setAuthed: () => setStatus("authed"),
      setGuest: () => {
        clearSession();
        setStatus("guest");
      },
    }),
    [status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

// ── 가드 ──────────────────────────────────────────────────────────────────────

function AuthSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
        aria-label="로딩 중"
      />
    </div>
  );
}

// has_seen_event 쿠키 값. 가드는 status가 "loading"인 동안 스플래시만 그리므로,
// 서버(false)와 클라이언트(실제 값)가 달라도 하이드레이션 불일치로 이어지지 않는다.
function useSeenEvent(): boolean {
  const [seen] = useState(hasSeenEvent);
  return seen;
}

/**
 * 보호 페이지((main))용. 게스트면 /login, 로그인했지만 슈퍼쏠을 안 거쳤으면 /superSol.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const seen = useSeenEvent();
  const router = useRouter();

  useEffect(() => {
    if (status === "guest") router.replace("/login");
    else if (status === "authed" && !seen) router.replace("/superSol");
  }, [status, seen, router]);

  if (status === "authed" && seen) return <>{children}</>;
  return <AuthSplash />;
}

/**
 * 로그인/회원가입 페이지용. 이미 로그인 상태면 슈퍼쏠/홈으로 보낸다(역주행 방지).
 */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const seen = useSeenEvent();
  const router = useRouter();

  useEffect(() => {
    if (status === "authed") {
      router.replace(seen ? "/home" : "/superSol");
    }
  }, [status, seen, router]);

  if (status === "guest") return <>{children}</>;
  return <AuthSplash />;
}
