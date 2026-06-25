import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { InstallGate } from "@/components/common/InstallGate";
import "./globals.css";

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
      <body>
        <Providers>
          <InstallGate>{children}</InstallGate>
        </Providers>
      </body>
    </html>
  );
}
