"use client";

import { useEffect, useRef } from "react";

/**
 * 슈퍼쏠 → 포켓스톡 진입 시에만 재생되는 전환 화면.
 * 로고 퍼즐(톡) 조각이 맞춰지는 영상을 1회 재생하고 끝나면 onDone 호출.
 */
export function PocketStockIntro({ onDone }: { onDone: () => void }) {
  const doneRef = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone();
    };
    // 영상이 ended/error를 못 쏘는 경우 대비 — 최대 5초 후 진행
    const timer = window.setTimeout(finish, 5000);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <video
        src="/pocketstock-intro.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
        onError={finish}
        className="size-full object-contain"
      />
    </div>
  );
}
