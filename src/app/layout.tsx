import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#1a56db" />
      </head>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
