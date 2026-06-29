"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const C0 = ["#2563eb", "#60a5fa"] as const; // blue-600 → blue-400
const C1 = ["#6366f1", "#a5b4fc"] as const; // indigo-500 → indigo-300

function lerpHex(a: string, b: string, t: number): string {
  const p = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ] as const;
  const [ar, ag, ab] = p(a);
  const [br, bg, bb] = p(b);
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${hex(ar + (br - ar) * t)}${hex(ag + (bg - ag) * t)}${hex(ab + (bb - ab) * t)}`;
}

const THRESHOLD = 0.82;

function morphGradient(pct: number): string {
  const t = Math.min(1, pct / THRESHOLD);
  const angle = Math.round(135 - t * 20);
  return `linear-gradient(${angle}deg, ${lerpHex(C0[0], C0[1], t)} 0%, ${lerpHex(C1[0], C1[1], t)} 100%)`;
}

function morphGlow(pct: number): string {
  if (pct < 0.06) return "none";
  const t = Math.min(1, pct / THRESHOLD);
  const r = Math.round(99 + (165 - 99) * t);
  const g = Math.round(102 + (180 - 102) * t);
  const b = Math.round(241 + (252 - 241) * t);
  const opacity = (t * 0.35).toFixed(2);
  const blur = Math.round(4 + t * 8);
  return `drop-shadow(0 0px ${blur}px rgba(${r},${g},${b},${opacity}))`;
}

// Easing curves per animate reference
const EASE_QUINT = "cubic-bezier(0.22,1,0.36,1)"; // snap-to-end: smooth confidence
const EASE_EXPO  = "cubic-bezier(0.16,1,0.3,1)";  // snap-to-start: rubber-band release

interface CollectSliderProps {
  onCollect: () => void;
  disabled?: boolean;
  amountLabel: string;
  isPending?: boolean;
  isError?: boolean;
  className?: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onProgress?: (pct: number) => void;
}

export function CollectSlider({
  onCollect,
  disabled = false,
  amountLabel,
  isPending = false,
  isError = false,
  className,
  onDragStart,
  onDragEnd,
  onProgress,
}: CollectSliderProps) {
  const glowRef       = useRef<HTMLDivElement>(null);
  const trackRef      = useRef<HTMLDivElement>(null);
  const thumbRef      = useRef<HTMLDivElement>(null);
  const thumbInnerRef = useRef<HTMLDivElement>(null);
  const fillRef       = useRef<HTMLDivElement>(null);

  const dragging   = useRef(false);
  const startX     = useRef(0);
  const posRef     = useRef({ px: 0, pct: 0 });
  const doneRef    = useRef(false);
  const reducedRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [done, setDone]         = useState(false);
  // showHint starts false to avoid SSR mismatch; activated post-mount if motion is allowed
  const [showHint, setShowHint] = useState(false);

  const THUMB_W = 36;
  const PAD     = 6;

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = reduced;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!reduced) setShowHint(true);
  }, []);

  function maxTravel() {
    return (trackRef.current?.offsetWidth ?? 300) - THUMB_W - PAD * 2;
  }

  function updateVisuals(px: number) {
    const max     = maxTravel();
    const clamped = Math.max(0, Math.min(px, max));
    const pct     = max > 0 ? clamped / max : 0;
    const prevPct = posRef.current.pct;
    posRef.current = { px: clamped, pct };
    onProgress?.(pct);

    if (thumbRef.current) thumbRef.current.style.transform = `translateX(${clamped}px)`;
    if (fillRef.current) {
      fillRef.current.style.transform = `translateX(${(pct - 1) * 100}%)`;
      if (!reducedRef.current)
        fillRef.current.style.background = morphGradient(pct);
    }

    if (!reducedRef.current) {
      if (glowRef.current)  glowRef.current.style.filter = morphGlow(pct);

      // Threshold pulse on thumb inner
      if (thumbInnerRef.current && prevPct < THRESHOLD && pct >= THRESHOLD) {
        thumbInnerRef.current.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.11)" }, { transform: "scale(1)" }],
          { duration: 220, easing: "cubic-bezier(0.4,0,0.2,1)" },
        );
      }
    }
  }

  function setMotionTransition(on: boolean, toEnd = false) {
    const ease = toEnd ? EASE_QUINT : EASE_EXPO;
    const t    = on ? `transform 0.3s ${ease}` : "";
    if (thumbRef.current) thumbRef.current.style.transition = t;
    if (fillRef.current)  fillRef.current.style.transition  = t;
    if (reducedRef.current) return;
    if (trackRef.current) trackRef.current.style.transition = on ? `background 0.3s ${ease}` : "";
    if (glowRef.current)  glowRef.current.style.transition  = on ? "filter 0.3s" : "";
  }

  function animate(toEnd: boolean, cb?: () => void) {
    setMotionTransition(true, toEnd);
    updateVisuals(toEnd ? maxTravel() : 0);

    if (toEnd && !reducedRef.current) {
      if (trackRef.current) trackRef.current.style.background = "linear-gradient(115deg, #dbeafe 0%, #e0e7ff 100%)";
      if (glowRef.current)  glowRef.current.style.filter      = "drop-shadow(0 0px 10px rgba(99,102,241,0.35))";
    }

    setTimeout(() => {
      setMotionTransition(false);

      if (toEnd && !reducedRef.current) {
        // Settle back to brand gradient so "완료!" text is readable
        if (trackRef.current) {
          trackRef.current.style.transition = `background 0.45s ${EASE_QUINT}`;
          trackRef.current.style.background = "var(--grad-1)";
          setTimeout(() => { if (trackRef.current) trackRef.current.style.transition = ""; }, 450);
        }
        if (glowRef.current) {
          glowRef.current.style.transition = "filter 0.45s";
          glowRef.current.style.filter = "none";
          setTimeout(() => { if (glowRef.current) glowRef.current.style.transition = ""; }, 450);
        }
      }

      cb?.();
    }, 300);
  }

  function resetSlider() {
    doneRef.current = false;
    setDone(false);
    animate(false);
  }

  useEffect(() => {
    if (isError && doneRef.current) resetSlider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const prevPending = useRef(false);
  useEffect(() => {
    if (prevPending.current && !isPending && doneRef.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(resetSlider, 1200);
    }
    prevPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  function onPointerStart(x: number) {
    if (showHint) setShowHint(false); // stop hint on first touch
    if (doneRef.current || disabled || isPending) return;
    dragging.current = true;
    startX.current   = x - posRef.current.px;
    if (!reducedRef.current && thumbInnerRef.current) {
      thumbInnerRef.current.style.transition = "box-shadow 150ms ease-out";
      thumbInnerRef.current.style.boxShadow  = "0 5px 18px rgba(37,99,235,0.28), 0 2px 6px rgba(0,0,0,0.14)";
    }
    onDragStart?.();
  }

  function onPointerMove(x: number) {
    if (!dragging.current || doneRef.current) return;
    updateVisuals(x - startX.current);
  }

  function onPointerEnd() {
    if (!dragging.current) return;
    dragging.current = false;
    if (!reducedRef.current && thumbInnerRef.current) {
      thumbInnerRef.current.style.boxShadow = "";
    }
    onDragEnd?.();
    if (posRef.current.pct >= THRESHOLD) {
      animate(true, () => {
        doneRef.current = true;
        setDone(true);
        onCollect();
      });
    } else {
      animate(false);
    }
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => onPointerMove(e.clientX);
    const onMouseUp   = ()              => onPointerEnd();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLocked = disabled || isPending;

  // Checkmark clip-path transition: left-to-right draw-in on done=true
  const checkStyle: React.CSSProperties = {
    clipPath: done ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
    opacity: done ? 1 : 0,
    transition: done
      ? `clip-path 0.35s ${EASE_EXPO} 0.05s, opacity 0.1s`
      : "opacity 0.15s",
  };

  return (
    <>
      {/* Keyframe for idle hint — plays twice after 1s, stops on interaction */}
      <style>{`
        @keyframes _cslide-hint {
          0%, 80%, 100% { transform: translateX(0); }
          35%            { transform: translateX(4px); }
          62%            { transform: translateX(2px); }
        }
        ._cslide-hint-active {
          animation: _cslide-hint 1.3s ${EASE_QUINT} 1.0s 2 both;
        }
        @media (prefers-reduced-motion: reduce) {
          ._cslide-hint-active { animation: none !important; }
        }
      `}</style>

      <div
        ref={glowRef}
        className={cn(
          "w-full rounded-full transition-opacity duration-300",
          isLocked && !done ? "opacity-40" : "opacity-100",
          className,
        )}
      >
        <div
          ref={trackRef}
          className={cn(
            "relative h-12 w-full select-none overflow-hidden rounded-full",
            !isLocked && !done ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          style={{ background: "var(--grad-1)", touchAction: "none" }}
          onMouseDown={e => { e.preventDefault(); onPointerStart(e.clientX); }}
          onTouchStart={e => { const t = e.touches[0]; if (t) onPointerStart(t.clientX); }}
          onTouchMove={e => { e.preventDefault(); const t = e.touches[0]; if (t) onPointerMove(t.clientX); }}
          onTouchEnd={() => onPointerEnd()}
        >
          {/* 상단 하이라이트 */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {/* 슬라이드 fill */}
          <div
            ref={fillRef}
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ transform: "translateX(-100%)", background: "var(--grad-1)" }}
          >
            {/* 선행 에지 shimmer — fill이 쓸릴 때 오른쪽 끝에 빛이 맺히는 효과 */}
            <div
              className="absolute inset-y-0 right-0 w-10 rounded-r-full"
              style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18))" }}
            />
          </div>

          {/* 기본 라벨 — done 시 아래로 밀리며 페이드 아웃 */}
          <div className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center gap-2 transition-[opacity,transform] duration-200",
            done ? "translate-y-1.5 opacity-0" : "translate-y-0 opacity-100",
          )}>
            <span className="text-[15px] font-bold tracking-[-0.01em] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.22)]">
              CMA로 모으기
            </span>
            <span className="font-numeric text-[13px] font-semibold tabular-nums text-white/70">
              {amountLabel}
            </span>
          </div>

          {/* 완료 라벨 — 위에서 내려오며 페이드 인 */}
          <div className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-200",
            done ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0",
          )}>
            <span className="text-[15px] font-bold tracking-[-0.01em] text-white">모으기 완료!</span>
          </div>

          {/* 썸 */}
          <div
            ref={thumbRef}
            className="absolute left-[6px] top-[6px] size-9"
            style={{ transform: "translateX(0px)" }}
          >
            <div
              ref={thumbInnerRef}
              className="flex size-full items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.16)]"
            >
              {/* 화살표 — hint animation on <g>, done-state on <svg> */}
              <svg
                className={cn("absolute transition-[opacity,transform] duration-200", done && "scale-75 opacity-0")}
                width="16" height="16" viewBox="0 0 16 16" fill="none"
              >
                <g className={showHint && !done && !isLocked ? "_cslide-hint-active" : ""}>
                  <path d="M2 8h12M9 4l5 4-5 4" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </svg>

              {/* 체크 — clip-path left→right draw-in */}
              <svg
                className="absolute"
                style={checkStyle}
                width="16" height="16" viewBox="0 0 16 16" fill="none"
              >
                <path d="M3 8l3.5 3.5L13 4" stroke="#2563eb" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
