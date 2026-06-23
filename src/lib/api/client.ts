import type { ApiResponse } from "@/types/api";
import { getAccessToken, setAccessToken, clearSession } from "@/lib/auth/session";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error("[Critical] NEXT_PUBLIC_API_URL 환경변수가 누락되었습니다.");
}

// 개발용 임시 인증 — 로그인 세션이 없을 때만 사용하는 fallback(/dev/token JWT).
// 운영(NODE_ENV !== "development")에선 절대 사용 안 함.
const DEV_TOKEN =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_DEV_TOKEN
    : undefined;

/** 현재 Bearer 토큰 — 로그인 세션(메모리) 우선, 없으면 dev fallback */
function authToken(): string | undefined {
  return getAccessToken() ?? DEV_TOKEN;
}

const pendingRequests = new Map<string, Promise<unknown>>();

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  dedupe?: boolean;
}

// refresh·login·logout 자체는 401이어도 재시도하지 않음(무한루프 방지)
const NO_AUTH_RETRY = [
  "/api/auth/login",
  "/api/auth/login/pin",
  "/api/auth/refresh",
  "/api/auth/logout",
];

// ── access token 재발급 (single-flight) ───────────────────────────────────────
let refreshPromise: Promise<boolean> | null = null;

export function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    const base =
      typeof window === "undefined" ? BASE_URL : window.location.origin;
    refreshPromise = fetch(new URL("/api/auth/refresh", base).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const body = (await res
          .json()
          .catch(() => null)) as ApiResponse<{ accessToken: string }> | null;
        if (!body?.success || !body.data?.accessToken) return false;
        setAccessToken(body.data.accessToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, dedupe = false, ...fetchOptions } = options;

  // 브라우저: same-origin(/api/*) 호출 → next.config rewrite가 백엔드로 프록시 (CORS 회피).
  // 서버(SSR): 백엔드를 직접 호출.
  const base = typeof window === "undefined" ? BASE_URL : window.location.origin;
  const url = new URL(endpoint, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const requestKey = `${fetchOptions.method ?? "GET"}:${url.toString()}`;

  if (dedupe && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey) as Promise<T>;
  }

  // 토큰을 매 전송 시점에 읽어 헤더 구성(재발급 후 재시도 시 새 토큰 반영)
  const send = () => {
    const token = authToken();
    return fetch(url.toString(), {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
      credentials: "include",
    });
  };

  const run = async (): Promise<T> => {
    let res = await send();

    // 401 → refresh 1회 시도 후 원요청 재시도
    if (
      res.status === 401 &&
      !NO_AUTH_RETRY.some((p) => endpoint.startsWith(p))
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed) res = await send();
      else clearSession();
    }

    const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

    // HTTP 레벨 에러
    if (!res.ok) {
      throw new ApiError(
        res.status,
        body?.code ?? "UNKNOWN",
        body?.message ?? "서버 오류가 발생했습니다.",
      );
    }

    // HTTP는 200인데 success: false인 경우 (백엔드 비즈니스 에러)
    if (!body?.success) {
      throw new ApiError(
        res.status,
        body?.code ?? "UNKNOWN",
        body?.message ?? "요청에 실패했습니다.",
      );
    }

    // data가 null인 경우 방어
    if (body.data === null || body.data === undefined) {
      return {} as T;
    }

    return body.data;
  };

  const promise = run().finally(() => pendingRequests.delete(requestKey));

  if (dedupe) pendingRequests.set(requestKey, promise);

  return promise;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string, // "MOCK_INVEST_400" 같은 백엔드 에러 코드
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  get: <T>(ep: string, opts?: RequestOptions) =>
    apiClient<T>(ep, { ...opts, method: "GET" }),
  post: <T>(ep: string, body: unknown, opts?: RequestOptions) =>
    apiClient<T>(ep, { ...opts, method: "POST", body: JSON.stringify(body) }),
  put: <T>(ep: string, body: unknown, opts?: RequestOptions) =>
    apiClient<T>(ep, { ...opts, method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(ep: string, body: unknown, opts?: RequestOptions) =>
    apiClient<T>(ep, { ...opts, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(ep: string, opts?: RequestOptions) =>
    apiClient<T>(ep, { ...opts, method: "DELETE" }),
};
