"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Download, Plus, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type GateState = "checking" | "gate" | "app";

/** standalone(설치 실행) 여부 — 설치되면 게이트 통과. */
function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

// display-mode 변경 구독 (설치 후 standalone 전환 감지)
function subscribeDisplayMode(onChange: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
// 실데스크톱 신호 — 마우스(fine pointer) + 터치 없음. UA 위장과 무관하게 실데스크톱이면 통과.
function isDesktopDevice(): boolean {
  return (
    window.matchMedia("(pointer: fine)").matches &&
    window.navigator.maxTouchPoints === 0
  );
}
// 미설치 + 모바일 → "gate", 설치됨/데스크톱 → "app"
// dev에선 게이트 비활성(next-pwa도 dev disable이라 설치 불가) → 항상 통과. DevTools 기기 에뮬레이션 오작동 방지.
function getGateSnapshot(): GateState {
  if (process.env.NODE_ENV !== "production") return "app";
  if (isStandalone() || isDesktopDevice()) return "app";
  const isMobile = /android|iphone|ipad|ipod/i.test(window.navigator.userAgent);
  return isMobile ? "gate" : "app";
}
// SSR/첫 렌더는 판별 불가 → 스플래시 (dev는 곧장 통과)
const getServerSnapshot = (): GateState =>
  process.env.NODE_ENV !== "production" ? "app" : "checking";

/**
 * 설치 게이트. 미설치 + 모바일 브라우저면 앱 대신 설치 화면만 노출하고,
 * 설치(standalone)·데스크톱은 그대로 통과시킨다. 루트 레이아웃에서 전체를 감싼다.
 */
export function InstallGate({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(
    subscribeDisplayMode,
    getGateSnapshot,
    getServerSnapshot,
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // 브라우저 기본 배너 억제 → 전용 버튼으로 유도
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true); // 설치 직후 같은 탭이면 통과
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // 판별 전 깜빡임 방지용 빈 스플래시
  if (state === "checking") {
    return <div className="min-h-screen bg-background" />;
  }
  if (state === "app" || installed) return <>{children}</>;

  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-8 text-center">
      <div className="flex flex-col items-center gap-5">
        <Image
          src="/icons/icon-192x192.png"
          alt="PocketStock"
          width={88}
          height={88}
          className="rounded-3xl shadow-lg"
          priority
          unoptimized
        />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            앱으로 설치하고 시작하세요
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            포켓스톡은 홈 화면에 설치해
            <br />
            앱처럼 사용하는 서비스예요.
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs">
        {isIos ? (
          // iOS Safari는 자동 설치 불가 → 공유 → 홈 화면에 추가 안내
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5 text-left">
            <p className="text-sm font-bold text-foreground">
              Safari에서 홈 화면에 추가
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Share className="size-4 shrink-0 text-primary" />
                하단 <span className="font-medium text-foreground">공유</span>{" "}
                버튼을 누르고
              </li>
              <li className="flex items-center gap-2">
                <Plus className="size-4 shrink-0 text-primary" />
                <span className="font-medium text-foreground">
                  홈 화면에 추가
                </span>
                를 선택하세요
              </li>
            </ol>
          </div>
        ) : deferred ? (
          <Button
            onClick={handleInstall}
            className="h-14 w-full gap-2 text-base font-bold"
          >
            <Download className="size-5" />앱 설치하기
          </Button>
        ) : (
          // 안드로이드인데 아직 설치 이벤트 미수신 / 미지원 브라우저 → 메뉴 안내
          <div className="rounded-2xl border border-border bg-card p-5 text-left text-sm text-muted-foreground">
            브라우저 메뉴(⋮)에서{" "}
            <span className="font-medium text-foreground">앱 설치</span> 또는{" "}
            <span className="font-medium text-foreground">홈 화면에 추가</span>
            를 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
}
