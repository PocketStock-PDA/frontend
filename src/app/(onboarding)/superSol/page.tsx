"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markEventSeen } from "@/lib/auth/session";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function SuperSolPage() {
  const router = useRouter();
  const { status } = useAuth();

  // 로그인하지 않은 사용자가 직접 들어오면 로그인으로.
  useEffect(() => {
    if (status === "guest") router.replace("/login");
  }, [status, router]);

  const handleGoToMain = () => {
    markEventSeen(); // 슈퍼쏠 확인 완료 표시 → 가드가 홈 진입 허용
    router.replace("/home");
  };

  if (status !== "authed") return null;

  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>🎉 환영합니다! 특별 이벤트 페이지 🎉</h1>
      <p>메인 홈으로 가기 전에 이 혜택을 놓치지 마세요!</p>

      <button
        onClick={handleGoToMain}
        style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}
      >
        혜택 받고 메인 홈으로 가기
      </button>
    </div>
  );
}
