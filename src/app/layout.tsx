import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import { InstallGate } from "@/components/common/InstallGate";
import "./globals.css";

// 셀프호스팅(오프라인 빌드 대응) — Google Fonts 빌드타임 다운로드 제거.
// 한글은 기존(subsets: latin)과 동일하게 시스템 폰트로 폴백된다.
const notoSansKr = localFont({
  src: "./fonts/noto-sans-kr-latin.woff2",
  weight: "400 700",
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "400 700",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "PocketStock", template: "%s | PocketStock" },
  description: "잔돈·포인트 소수점 투자 플랫폼",
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PocketStock",
  },
};

// PWA standalone: 노치/상태바 영역까지 콘텐츠를 펼치고 safe-area로 여백 처리
export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSansKr.variable} ${inter.variable}`}>
        <Providers>
          <InstallGate>{children}</InstallGate>
        </Providers>
      </body>
    </html>
  );
}
