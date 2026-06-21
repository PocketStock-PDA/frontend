declare namespace NodeJS {
  interface ProcessEnv {
    // 클라이언트 노출 가능
    readonly NEXT_PUBLIC_API_URL: string;
    readonly NEXT_PUBLIC_WS_URL: string;
    readonly NEXT_PUBLIC_APP_ENV: "development" | "staging" | "production";
    readonly NEXT_PUBLIC_VAPID_PUBLIC_KEY: string;
    // 개발용 임시 토큰 (로그인 구현 후 제거)
    readonly NEXT_PUBLIC_DEV_TOKEN?: string;

    readonly NODE_ENV: "development" | "production" | "test";
  }
}