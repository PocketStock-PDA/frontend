"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// 앱은 라이트 전용(ThemeProvider 미사용)이라 테마 고정. 색은 아래 CSS 변수(토큰)를 따름.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      // 토스트가 상단 고정 헤더(h-14 + safe-area)의 뒤로가기/햄버거 버튼을 가리지 않도록
      // 헤더 높이만큼 아래로 내린다. 좌우는 sonner 기본 모바일 여백(16px) 유지.
      offset={{ top: "calc(env(safe-area-inset-top) + 4rem)" }}
      mobileOffset={{
        top: "calc(env(safe-area-inset-top) + 4rem)",
        left: "16px",
        right: "16px",
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500" />,
        info: <InfoIcon className="size-4 text-[#2563eb]" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
        error: <OctagonXIcon className="size-4 text-[#f04452]" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "0.8125rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
