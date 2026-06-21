import { cn } from "@/lib/utils";

export interface JigsawPuzzleProps {
  /** 전체 조각 수, 기본 100 */
  total?: number;
  /** 채워진 조각 수 */
  filled: number;
  /** 열 수, 기본 10 */
  columns?: number;
  /** 최근 채워진(하이라이트) 조각 인덱스. 기본 filled-1 */
  recentIndex?: number;
  className?: string;
}

const S = 40; // viewBox 단위 조각 크기
const THICK = 5.5; // 유리 두께(아래 side 면 오프셋)

// 직소 탭: 목 시작/끝(A~E)과 반경(R). R이 작을수록 홈이 얕음
const A = 0.4;
const E = 0.6;
const R = 0.14;

/** 내부 경계 탭 부호(결정적) — 같은 경계는 양쪽 조각이 같은 부호를 공유해 맞물림 */
function edgeSign(kind: "h" | "v", i: number, j: number): 1 | -1 {
  const n = (i * 928371 + j * 1299721 + (kind === "h" ? 17 : 91)) % 2;
  return n === 0 ? 1 : -1;
}

/** 가로 경계 (x0,y)→(x1,y). b: 돌출 방향(+1 아래 / -1 위 / 0 직선). 직소 탭(목+혹) */
function hEdge(x0: number, x1: number, y: number, b: number): string {
  if (b === 0) return `L ${x1} ${y} `;
  const len = Math.abs(x1 - x0);
  const dir = Math.sign(x1 - x0);
  const a = x0 + dir * len * A;
  const e = x0 + dir * len * E;
  const r = len * R;
  const sweep = b > 0 ? (dir > 0 ? 1 : 0) : dir > 0 ? 0 : 1;
  return `L ${a} ${y} A ${r} ${r} 0 1 ${sweep} ${e} ${y} L ${x1} ${y} `;
}

/** 세로 경계 (x,y0)→(x,y1). b: 돌출 방향(+1 오른쪽 / -1 왼쪽 / 0 직선). 직소 탭(목+혹) */
function vEdge(x: number, y0: number, y1: number, b: number): string {
  if (b === 0) return `L ${x} ${y1} `;
  const len = Math.abs(y1 - y0);
  const dir = Math.sign(y1 - y0);
  const a = y0 + dir * len * A;
  const e = y0 + dir * len * E;
  const r = len * R;
  const sweep = b > 0 ? (dir > 0 ? 0 : 1) : dir > 0 ? 1 : 0;
  return `L ${x} ${a} A ${r} ${r} 0 1 ${sweep} ${x} ${e} L ${x} ${y1} `;
}

function piecePath(r: number, c: number, rows: number, cols: number): string {
  const x0 = c * S;
  const y0 = r * S;
  const x1 = (c + 1) * S;
  const y1 = (r + 1) * S;
  const top = r === 0 ? 0 : edgeSign("h", r, c);
  const right = c === cols - 1 ? 0 : edgeSign("v", r, c + 1);
  const bottom = r === rows - 1 ? 0 : edgeSign("h", r + 1, c);
  const left = c === 0 ? 0 : edgeSign("v", r, c);
  return (
    `M ${x0} ${y0} ` +
    hEdge(x0, x1, y0, top) +
    vEdge(x1, y0, y1, right) +
    hEdge(x1, x0, y1, bottom) +
    vEdge(x0, y1, y0, left) +
    "Z"
  );
}

/**
 * 유리질감 직소 퍼즐. 인접 조각이 탭/홈으로 맞물리는 인터로킹 SVG.
 * filled(블루 글로시) / recent(하이라이트) / empty(회색) 3상태.
 */
export function JigsawPuzzle({
  total = 100,
  filled,
  columns = 10,
  recentIndex,
  className,
}: JigsawPuzzleProps) {
  const cols = columns;
  const rows = Math.ceil(total / cols);
  const recent = recentIndex ?? filled - 1;

  return (
    <svg
      viewBox={`-3 -3 ${cols * S + 8} ${rows * S + 14}`}
      className={cn("w-full", className)}
      role="img"
      aria-label={`${filled}/${total} 조각 완성`}
    >
      <defs>
        {/* 떠 있는 유리 조각: 부드러운 음영(diffuse) + 날카로운 광택(specular) + 드롭섀도 */}
        <filter
          id="jp-glass"
          x="-40%"
          y="-40%"
          width="180%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur" />
          {/* 완전 투명 유리: 광택(스펙큘러) + 드롭섀도로만 입체 표현 */}
          <feSpecularLighting
            in="blur"
            surfaceScale="6"
            specularConstant="1.1"
            specularExponent="30"
            lightingColor="#ffffff"
            result="spec"
          >
            <fePointLight x="62" y="42" z="150" />
          </feSpecularLighting>
          <feComposite
            in="spec"
            in2="SourceAlpha"
            operator="in"
            result="specClip"
          />
          <feMerge result="lit">
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="specClip" />
          </feMerge>
          <feDropShadow
            dx="0"
            dy="4.5"
            stdDeviation="3"
            floodColor="#1e3a8a"
            floodOpacity="0.45"
          />
        </filter>

        {/* 음각으로 파인 빈 슬롯: 인디고 inner-shadow (홈에 파인 느낌) */}
        <filter
          id="jp-groove"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feComponentTransfer in="SourceAlpha" result="inv">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur in="inv" stdDeviation="1.6" result="iblur" />
          <feOffset in="iblur" dx="0" dy="1.1" result="ioff" />
          <feFlood floodColor="#94a3c8" floodOpacity="0.3" result="icol" />
          <feComposite in="icol" in2="ioff" operator="in" result="ishadow" />
          <feComposite
            in="ishadow"
            in2="SourceAlpha"
            operator="in"
            result="ishadowClip"
          />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="ishadowClip" />
          </feMerge>
        </filter>
      </defs>

      {Array.from({ length: total }).map((_, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const state =
          idx < filled ? (idx === recent ? "recent" : "filled") : "empty";
        const d = piecePath(r, c, rows, cols);

        if (state === "empty") {
          // 흰 표면에 파인 음각 홈 (인디고 그루브)
          return (
            <path
              key={idx}
              d={d}
              fill="#f4f6fb"
              fillOpacity={0.7}
              stroke="#e9edf4"
              strokeWidth={0.75}
              strokeLinejoin="round"
              filter="url(#jp-groove)"
            />
          );
        }

        // 두꺼운 투명 유리 블록: 아래 side 면(두께) + 위 클리어 유리
        return (
          <g key={idx}>
            <path
              d={d}
              transform={`translate(0 ${THICK})`}
              fill="#1e3a8a"
              fillOpacity={0.15}
            />
            <path
              d={d}
              fill={state === "recent" ? "#3b82f6" : "#7dd3fc"}
              fillOpacity={state === "recent" ? 0.2 : 0.1}
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={0.75}
              strokeLinejoin="round"
              filter="url(#jp-glass)"
            />
          </g>
        );
      })}
    </svg>
  );
}
