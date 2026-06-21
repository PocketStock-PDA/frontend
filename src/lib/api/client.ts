import type { ApiResponse } from "@/types/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error("[Critical] NEXT_PUBLIC_API_URL 환경변수가 누락되었습니다.");
}

// 개발용 임시 인증 — 로그인 구현 전까지 /dev/token JWT를 Bearer로 부착.
// 운영에선 미설정(로그인 시 메모리 access token + 인터셉터로 대체 예정).
const DEV_TOKEN = process.env.NEXT_PUBLIC_DEV_TOKEN;

const pendingRequests = new Map<string, Promise<unknown>>();

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  dedupe?: boolean;
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

  const promise = fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(DEV_TOKEN ? { Authorization: `Bearer ${DEV_TOKEN}` } : {}),
      ...fetchOptions.headers,
    },
    credentials: "include",
  })
    .then(async (res) => {
      const body = (await res
        .json()
        .catch(() => null)) as ApiResponse<T> | null;

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
    })
    .finally(() => pendingRequests.delete(requestKey));

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
  patch: <T>(ep: string, body: unknown, opts?: RequestOptions) =>
    apiClient<T>(ep, { ...opts, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(ep: string, opts?: RequestOptions) =>
    apiClient<T>(ep, { ...opts, method: "DELETE" }),
};