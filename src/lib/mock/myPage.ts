import type { MyProfile } from "@/types/domain/myPage";

// ⚠️ 임시 mock — 사용자 프로필/설정 API 미구현.
// 백엔드 연결 시 이 파일과 useMyProfile 의 mock queryFn 을 제거하면 됨.
// 화면 확인용 더미 값 — 이름/아이디는 실제 회원으로 오인되지 않도록 가상값 사용.
export const MOCK_MY_PROFILE: MyProfile = {
  name: "홍길동",
  username: "test1",
  cmaBalance: 37840,
  puzzleValuation: 71516,
  linkedAccounts: [
    { id: "shinhan-bank", name: "신한은행", type: "BANK", linked: true },
    { id: "shinhan-card", name: "신한카드", type: "CARD", linked: true },
    { id: "sol-travel", name: "SOL트래블", type: "TRAVEL", linked: true },
    { id: "shinhan-play", name: "신한플레이", type: "PAY", linked: true },
  ],
  settings: {
    cardChangeCollect: true,
    monthlySavingCollect: true,
  },
};
