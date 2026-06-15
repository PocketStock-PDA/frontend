declare namespace NodeJS {
  interface ProcessEnv {
    // 클라이언트 노출 가능
    readonly NEXT_PUBLIC_API_URL: string;
    readonly NEXT_PUBLIC_WS_URL: string;
    readonly NEXT_PUBLIC_APP_ENV: "development" | "staging" | "production";
    readonly NEXT_PUBLIC_VAPID_PUBLIC_KEY: string;

    // 서버 전용 (NEXT_PUBLIC_ 절대 금지)
    readonly VAPID_PRIVATE_KEY: string;
    readonly VAPID_SUBJECT: string;

    readonly NODE_ENV: "development" | "production" | "test";
  }
}