import { cn } from "@/lib/utils";

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** 기본 좌우/상하 패딩 제거 */
  noPadding?: boolean;
}

/**
 * 페이지 래퍼. 폰에선 풀폭, 큰 화면에선 430px 캡 + 중앙 정렬.
 * 사방 공통 여백(헤더 포함 모든 콘텐츠가 이 안에 들어감). 상단은 노치(safe-area) + 표준 여백.
 * 하단 탭바 클리어런스는 layout의 pb가 담당.
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
        !noPadding && "px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
