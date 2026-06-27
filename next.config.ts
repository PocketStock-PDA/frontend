import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const devAllowedOrigins =
  process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  output: "export",
  // 정적 export(S3+CloudFront)는 이미지 최적화 서버가 없어 기본 로더 사용 불가 → 최적화 비활성화
  images: { unoptimized: true },
  ...(devAllowedOrigins.length > 0
    ? { allowedDevOrigins: devAllowedOrigins }
    : {}),
  reactCompiler: true,
  // 상위 디렉토리(홈 ~/package-lock.json·pnpm-lock.yaml)로 workspace root가 잘못 추론되는 것 방지.
  // 이 디렉토리를 root로 고정해야 next/package.json을 정상 resolve함.
  turbopack: { root: __dirname },
  distDir: ".next",
  // 개발용 same-origin 프록시: 브라우저 /api/* → 백엔드로 포워딩 (CORS 회피).
  // afterFiles 단계라 로컬 라우트(/api/push/*)가 우선 매칭되어 보존됨.
  // 운영(S3+CloudFront)은 이 rewrite가 아니라 CloudFront 경로 라우팅이 담당.
  async rewrites() {
    const target = process.env.NEXT_PUBLIC_API_URL;
    if (!target) return [];
    // budget은 core-api(8081)에 있어서 catch-all 앞에 먼저 매칭
    const coreTarget = process.env.NEXT_PUBLIC_CORE_API_URL;
    return [
      ...(coreTarget
        ? [
            { source: "/api/budget/:path*", destination: `${coreTarget}/api/budget/:path*` },
            { source: "/api/assets/:path*", destination: `${coreTarget}/api/assets/:path*` },
            { source: "/api/recommendations/:path*", destination: `${coreTarget}/api/recommendations/:path*` },
            { source: "/api/trading/calendar/:path*", destination: `${coreTarget}/api/trading/calendar/:path*` },
            // 인증·회원(계좌개설·1원인증·약관·비밀번호)도 core-api
            { source: "/api/auth/:path*", destination: `${coreTarget}/api/auth/:path*` },
            { source: "/api/users/:path*", destination: `${coreTarget}/api/users/:path*` },
          ]
        : []),
      { source: "/api/:path*", destination: `${target}/api/:path*` },
    ];
  },
};

export default withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /\/api\/.*/,
        handler: "NetworkOnly",
      },
    ],
  },
})(nextConfig);
