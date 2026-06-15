import type { ApiResponse } from "@/types/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error("[Critical] NEXT_PUBLIC_API_URL 환경변수가 누락되었습니다.");
}

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

  const url = new URL(`${BASE_URL}${endpoint}`);
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