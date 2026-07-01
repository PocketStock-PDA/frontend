"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const C0 = ["#2563eb", "#60a5fa"] as const;
const C1 = ["#6366f1", "#a5b4fc"] as const;

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

const EASE_QUINT = "cubic-bezier(0.22,1,0.36,1)";
const EASE_EXPO  = "cubic-bezier(0.16,1,0.3,1)";

interface CollectSliderProps {
  onCollect: () => void;
  disabled?: boolean;
  amountLabel: string;
  isPending?: boolean;
  isError?: boolean;
  /** 증가할 때마다 슬라이더를 원위치시킨다 — 부모가 코인 애니 종료 후 제어 */
  resetTrigger?: number;
  className?: string;
  guideEnabled?: boolean;
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
  resetTrigger = 0,
  className,
  guideEnabled = true,
  onDragStart,
  onDragEnd,
  onProgress,
}: CollectSliderProps) {
  const glowRef       = useRef<HTMLDivElement>(null);
  const trackRef      = useRef<HTMLDivElement>(null);
  const thumbRef      = useRef<HTMLDivElement>(null);
  const thumbInnerRef = useRef<HTMLDivElement>(null);
  const fillRef       = useRef<HTMLDivElement>(null);
  const labelRef      = useRef<HTMLDivElement>(null);

  const dragging   = useRef(false);
  const startX     = useRef(0);
  const posRef     = useRef({ px: 0, pct: 0 });
  const doneRef    = useRef(false);
  const reducedRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [done, setDone]                     = useState(false);
  const [isDragging, setIsDragging]         = useState(false);
  const [showGuideLabel, setShowGuideLabel] = useState(false);

  const THUMB_W = 56;
  const PAD     = 6;

  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!guideEnabled) return;
    if (localStorage.getItem("ps-cslide-hinted")) return;
    const t = setTimeout(() => setShowGuideLabel(true), 1800);
    return () => clearTimeout(t);
  }, [guideEnabled]);

  function trackWidth() {
    return trackRef.current?.offsetWidth ?? 300;
  }

  function maxTravel() {
    return trackWidth() - THUMB_W - PAD * 2;
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
      if (!reducedRef.current) fillRef.current.style.background = morphGradient(pct);
    }

    if (!reducedRef.current) {
      if (glowRef.current) glowRef.current.style.filter = morphGlow(pct);
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

  const initResetTrigger = useRef(resetTrigger);
  useEffect(() => {
    if (resetTrigger === initResetTrigger.current) return;
    clearTimeout(resetTimer.current);
    resetSlider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]);

  function onPointerStart(x: number) {
    if (showGuideLabel) {
      setShowGuideLabel(false);
      localStorage.setItem("ps-cslide-hinted", "1");
    }
    if (doneRef.current || disabled || isPending) return;
    dragging.current = true;
    setIsDragging(true);
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
    setIsDragging(false);
    if (!reducedRef.current && thumbInnerRef.current) {
      thumbInnerRef.current.style.boxShadow = "";
    }
    onDragEnd?.();

    if (posRef.current.pct >= THRESHOLD) {
      doneRef.current = true; // bounce 즉시 차단
      animate(true, () => {
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

  const checkStyle: React.CSSProperties = {
    clipPath: done ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
    opacity:  done ? 1 : 0,
    transition: done
      ? `clip-path 0.35s ${EASE_EXPO} 0.05s, opacity 0.1s`
      : "opacity 0.15s",
  };

  return (
    <>
      <style>{`
        @keyframes _cguide-in {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
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
            <div
              className="absolute inset-y-0 right-0 w-10 rounded-r-full"
              style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18))" }}
            />
          </div>

          {/* CMA로 모으기 + 금액 */}
          <div
            ref={labelRef}
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center gap-2 transition-[opacity,transform] duration-200",
            amountLabel ? "pl-10" : "",
              done ? "translate-y-1.5 opacity-0" : "translate-y-0 opacity-100",
            )}
          >
            <span className="text-[15px] font-bold tracking-[-0.01em] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.22)]">
              CMA로 모으기
            </span>
            {amountLabel && (
              <span className="font-numeric text-[13px] font-semibold tabular-nums text-white/70">
                {amountLabel}
              </span>
            )}
          </div>

          {/* 완료 라벨 */}
          <div className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-200",
            done ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0",
          )}>
            <span className="text-[15px] font-bold tracking-[-0.01em] text-white">모으기 완료!</span>
          </div>

          {/* 썸 — 알약 형태 */}
          <div
            ref={thumbRef}
            className="absolute left-[6px] top-[6px] h-9 w-14"
            style={{ transform: "translateX(0px)" }}
          >
            <motion.div
              className="size-full"
              animate={!done && !isDragging && !disabled
                ? { x: [0, 24, -4, 2, -1, 0] }
                : { x: 0 }}
              transition={!done && !isDragging && !disabled
                ? {
                    duration: 2.4,
                    times: [0, 0.35, 0.54, 0.65, 0.73, 0.82],
                    ease: ["easeOut", [0.22, 1, 0.36, 1], "easeOut", "easeOut", "easeOut"],
                    repeat: Infinity,
                    repeatDelay: 0.7,
                  }
                : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                ref={thumbInnerRef}
                className="relative flex size-full items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.16)]"
              >
                <svg
                  className={cn(
                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[opacity,transform] duration-200",
                    done && "scale-75 opacity-0",
                  )}
                  width="20" height="14" viewBox="0 0 20 14" fill="none"
                >
                  <g>
                    <path d="M3 2l5 5-5 5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 2l5 5-5 5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </svg>

                <svg
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={checkStyle}
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                >
                  <path d="M3 8l3.5 3.5L13 4" stroke="#2563eb" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </motion.div>
          </div>
        </div>

        {showGuideLabel && !done && !isLocked && (
          <p
            className="mt-2 text-center text-[11px] text-muted-foreground"
            style={{ animation: `_cguide-in 0.5s ${EASE_EXPO} both` }}
            aria-hidden="true"
          >
            밀어서 잔돈을 CMA에 모아보세요
          </p>
        )}
      </div>
    </>
  );
}
