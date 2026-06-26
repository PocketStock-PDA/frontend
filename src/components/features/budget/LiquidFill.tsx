"use client";

/**
 * sin 기반 다층 파도 채움. (Jetpack Compose LiquidFill 포팅 → SVG 버전)
 *
 * - 수위(level)로 양을 표현: progress 0 → 바닥, 1 → 가득.
 * - viewBox(0~100)를 preserveAspectRatio="none"으로 셀에 100% 늘려 채워서
 *   셀 크기 측정 없이 항상 가로로 꽉 찬다.
 * - 속도·진폭·위상이 다른 파도 2겹을 좌우 반대로 흘려(SMIL) 간섭시켜 물결처럼 보이게 한다.
 * - progress >= 1 이면 출렁임 없이 평평하게 가득 채운다.
 */

const PERIOD = 60; // viewBox 기준 한 주기 폭 (translate 거리와 동일해야 이음매 없음)

/** 수면(level) 위로 sin 파형을 그리고 아래(200)까지 채우는 path 문자열 */
function buildWavePath(level: number, amp: number, phaseShift: number): string {
  const x0 = -PERIOD;
  const x1 = 100 + PERIOD;
  const yAt = (x: number) =>
    level + amp * Math.sin((2 * Math.PI * (x + phaseShift)) / PERIOD);
  let d = `M ${x0} 200 L ${x0} ${yAt(x0).toFixed(2)}`;
  for (let x = x0 + 3; x <= x1; x += 3) {
    d += ` L ${x} ${yAt(x).toFixed(2)}`;
  }
  d += ` L ${x1} 200 Z`;
  return d;
}

interface LiquidFillProps {
  /** 채움 비율 0~1, 1 초과 시 넘침 효과 */
  progress: number;
  /** 파도색 RGB 채널 문자열 (예: "4,113,233") */
  color?: string;
  /** 파도 진폭 (viewBox 단위) */
  amplitude?: number;
  /** 한 주기 ms (작을수록 빠름) */
  speed?: number;
  /** false면 정지된 파도 한 컷만 그림 (reduceMotion 대응) */
  animate?: boolean;
  className?: string;
}

export function LiquidFill({
  progress,
  color = "4,113,233",
  amplitude = 6,
  speed = 3500,
  animate = true,
  className,
}: LiquidFillProps) {
  const p = Math.max(0, progress);

  // 가득 차거나 초과하면 출렁임 없이 평평하게 채운다.
  if (p >= 1) {
    return (
      <svg
        className={className}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect width="100" height="100" fill={`rgba(${color},0.6)`} />
      </svg>
    );
  }

  const level = 100 * (1 - p);
  const frontPath = buildWavePath(level, amplitude, 0);
  const backPath = buildWavePath(level, amplitude * 0.6, PERIOD / 8);

  const frontDur = `${(speed / 1000).toFixed(2)}s`;
  const backDur = `${((speed * 1.6) / 1000).toFixed(2)}s`;

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={backPath} fill={`rgba(${color},0.3)`}>
        {animate && (
          <animateTransform
            attributeName="transform"
            type="translate"
            from="0 0"
            to={`${PERIOD} 0`}
            dur={backDur}
            repeatCount="indefinite"
          />
        )}
      </path>
      <path d={frontPath} fill={`rgba(${color},0.5)`}>
        {animate && (
          <animateTransform
            attributeName="transform"
            type="translate"
            from="0 0"
            to={`${-PERIOD} 0`}
            dur={frontDur}
            repeatCount="indefinite"
          />
        )}
      </path>
    </svg>
  );
}
