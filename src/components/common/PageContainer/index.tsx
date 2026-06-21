import { cn } from "@/lib/utils";

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** 기본 좌우 패딩(px-4) 제거 */
  noPadding?: boolean;
}

/**
 * 페이지 래퍼. 폰에선 풀폭, 큰 화면에선 430px 캡 + 중앙 정렬.
 * 하단 탭바 여백은 (main)/layout.tsx의 pb가 담당.
 */
export function PageContainer({
  children,
  className,
  noPadding = false,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[430px]",
        !noPadding && "px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
