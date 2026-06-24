import type { MyProfile } from "@/types/domain/myPage";

// ⚠️ 임시 mock — 사용자 프로필/설정 API 미구현.
// 백엔드 연결 시 이 파일과 useMyProfile 의 mock queryFn 을 제거하면 됨.
// test1 유저가 마이페이지(화면 25)를 그대로 확인할 수 있도록 Figma 값으로 채움.
export const MOCK_MY_PROFILE: MyProfile = {
  name: "김준형",
  email: "kim****han@shinhan.com",
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
