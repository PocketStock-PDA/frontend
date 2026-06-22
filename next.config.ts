import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
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
            { source: "/api/trading/calendar/:path*", destination: `${coreTarget}/api/trading/calendar/:path*` },
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
        urlPattern: /\/api\/(cma|portfolio|asset|budget)/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
        },
      },
      {
        urlPattern: /\/api\/(trading|exchange)/,
        handler: "NetworkOnly",
      },
    ],
  },
})(nextConfig);