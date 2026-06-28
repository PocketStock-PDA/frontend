/**
 * 단일 직소 조각 — 위·오른쪽은 탭(돌출), 아래·왼쪽은 홈(함입).
 * 웰컴 팝업·포트폴리오 facet 등에서 공용으로 쓰는 시그니처 조각 실루엣.
 * 조각 bbox ≈ x[10,128] y[-8,110] → 정사각 viewBox로 가운데 정렬.
 */
export const PUZZLE_PIECE_PATH =
  "M 10,10 L 42,10 Q 42,-8 60,-8 Q 78,-8 78,10 L 110,10 " +
  "L 110,42 Q 128,42 128,60 Q 128,78 110,78 L 110,110 " +
  "L 78,110 Q 78,92 60,92 Q 42,92 42,110 L 10,110 " +
  "L 10,78 Q 30,78 30,60 Q 30,42 10,42 Z";

export interface PuzzlePieceIconProps {
  /** true=브랜드 솔리드 채움 / false=브랜드 윤곽 */
  filled?: boolean;
  className?: string;
}

export function PuzzlePieceIcon({
  filled = false,
  className,
}: PuzzlePieceIconProps) {
  return (
    <svg viewBox="7 -11 124 124" fill="none" className={className} aria-hidden="true">
      <path
        d={PUZZLE_PIECE_PATH}
        {...(filled
          ? { fill: "var(--brand)" }
          : {
              fill: "none",
              stroke: "var(--brand)",
              strokeWidth: 7,
              strokeLinejoin: "round" as const,
            })}
      />
    </svg>
  );
}
