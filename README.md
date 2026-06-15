# PocketStock Frontend

잔돈·포인트 → 소수점 투자 플랫폼의 프론트엔드 레포지토리.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS + shadcn/ui (Radix · Nova) |
| 서버 상태 | TanStack Query v5 |
| 클라이언트 상태 | Zustand |
| 금액 계산 | decimal.js (부동소수점 정밀도) |
| 스키마 검증 | Zod |
| PWA | next-pwa + Web Push (VAPID) |
| 날짜 처리 | date-fns |

---

## 시작하기

### 요구 사항

- Node.js 20 이상
- npm 10 이상

### 설치

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 열어서 실제 값 입력
```

### 개발 서버 실행

```bash
npm run dev
# http://localhost:3000
```

### 빌드

```bash
npm run build
npm run start
```

### 코드 검사

```bash
npm run lint          # ESLint
npm run type-check    # tsc --noEmit
```

---

## 환경변수

`.env.example`을 복사해서 `.env.local`을 만들고 값을 채운다.  
`.env.local`은 `.gitignore` 처리되어 있어 커밋되지 않는다.

```bash
# API Gateway (모든 요청의 단일 진입점)
NEXT_PUBLIC_API_URL=http://localhost:8080

# WebSocket (실시간 시세)
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws

# 앱 환경
NEXT_PUBLIC_APP_ENV=development

# PWA 푸시 알림 — 공개키 (클라이언트 노출 가능)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=

# PWA 푸시 알림 — 비공개키 (서버 전용, NEXT_PUBLIC_ 금지)
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

> **VAPID 키 최초 생성**
> ```bash
> node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k);"
> ```

---

## 프로젝트 구조

```
frontend/
├── public/
│   ├── icons/                        # PWA 아이콘 (72 ~ 512px)
│   └── manifest.json                 # PWA manifest
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 비로그인 접근 가능
│   │   │   ├── login/
│   │   │   └── signup/
│   │   │
│   │   ├── (main)/                   # 로그인 필요 (하단 탭바 레이아웃)
│   │   │   ├── home/                 # 잔액·포트폴리오 요약
│   │   │   ├── asset/                # 마이데이터·소비분석
│   │   │   ├── portfolio/            # 포트폴리오·추천·리밸런싱
│   │   │   ├── budget/               # 가계부·절약금
│   │   │   ├── trading/              # 주문·체결·자동투자
│   │   │   ├── cma/                  # CMA 자금풀·이체
│   │   │   ├── exchange/             # 환전
│   │   │   └── my/                   # 마이페이지·설정
│   │   │
│   │   ├── api/                      # BFF API Routes
│   │   │   └── push/                 # 서버사이드 푸시 발송
│   │   │
│   │   ├── layout.tsx                # 루트 레이아웃 (서버 컴포넌트)
│   │   └── providers.tsx             # 전역 Provider (클라이언트 컴포넌트)
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui 자동 생성
│   │   ├── common/                   # 도메인 무관 공통 컴포넌트
│   │   │   ├── AmountInput/          # 금액 입력 (decimal.js 연동)
│   │   │   ├── AmountDisplay/        # 금액 표시 (포맷팅)
│   │   │   ├── BottomTabBar/         # 하단 탭 네비게이션
│   │   │   ├── ErrorBoundary/
│   │   │   └── SkeletonCard/
│   │   └── features/                 # 도메인별 컴포넌트
│   │       ├── auth/
│   │       ├── asset/
│   │       ├── portfolio/
│   │       ├── budget/
│   │       ├── trading/              # OrderBook (렌더링 최적화)
│   │       ├── cma/
│   │       └── exchange/
│   │
│   ├── hooks/
│   │   ├── queries/                  # TanStack Query 조회 훅
│   │   │   ├── useAssetQuery.ts      # asset 서비스 (8082)
│   │   │   ├── usePortfolioQuery.ts  # portfolio 서비스 (8083)
│   │   │   ├── useBudgetQuery.ts     # budget 서비스 (8084)
│   │   │   ├── useTradingQuery.ts    # trading 서비스 (8087)
│   │   │   ├── useCmaQuery.ts        # cma 서비스 (8086)
│   │   │   └── useExchangeQuery.ts   # exchange 서비스 (8088)
│   │   ├── mutations/                # TanStack Query 변경 훅
│   │   │   ├── useOrderMutation.ts   # 주문 (중복 방지 핵심)
│   │   │   ├── useTransferMutation.ts
│   │   │   └── useExchangeMutation.ts
│   │   └── usePushNotification.ts    # PWA 푸시 구독·해제
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts             # fetch 인스턴스 (CSRF · dedupe · 에러 처리)
│   │   │   └── endpoints.ts          # 백엔드 서비스별 엔드포인트 상수
│   │   ├── utils/
│   │   │   ├── currency.ts           # decimal.js 금액 계산·포맷팅
│   │   │   ├── date.ts               # 날짜 포맷
│   │   │   └── validation.ts         # 계좌번호·금액 입력값 검증
│   │   ├── queryKeys.ts              # TanStack Query 키 중앙 관리
│   │   └── constants/
│   │       └── finance.ts            # 최소 투자금액·수수료율 등
│   │
│   ├── store/
│   │   ├── authStore.ts              # 인증 상태 (Zustand)
│   │   └── uiStore.ts                # 모달·토스트 UI 상태 (Zustand)
│   │
│   └── types/
│       ├── domain/                   # 백엔드 서비스별 도메인 모델 타입
│       │   ├── asset.ts
│       │   ├── portfolio.ts
│       │   ├── budget.ts
│       │   ├── trading.ts
│       │   ├── cma.ts
│       │   └── exchange.ts
│       ├── api.ts                    # API 공통 응답 타입
│       ├── env.d.ts                  # 환경변수 타입 선언
│       └── common.ts
│
├── next.config.ts                    # PWA (next-pwa) 설정 포함
├── tailwind.config.ts
├── tsconfig.json                     # strict mode + noUncheckedIndexedAccess
└── .eslintrc.json                    # any 금지 · floating promise 감지
```

---

## 백엔드 서비스 연결

모든 API 요청은 **API Gateway(8080)** 단일 진입점을 경유한다.  
Gateway가 Docker Compose 내부 DNS로 각 마이크로서비스에 라우팅한다.

| 서비스 | 포트 | 프론트엔드 연결 경로 |
|--------|------|------------------|
| api-gateway | 8080 | 모든 요청의 진입점 |
| user | 8081 | `/api/user/*` — 인증·계정 |
| asset | 8082 | `/api/asset/*` — 마이데이터·소비분석 |
| portfolio | 8083 | `/api/portfolio/*` — 포트폴리오·추천 |
| budget | 8084 | `/api/budget/*` — 가계부·절약금 |
| notification | 8085 | FCM 직접 수신 (Web Push 별도) |
| cma | 8086 | `/api/cma/*` — CMA 자금풀·이체 |
| trading | 8087 | `/api/trading/*` — 주문·체결·자동투자 |
| exchange | 8088 | `/api/exchange/*` — 환전 |

> 백엔드 로컬 실행은 `backend/` 레포지토리 README 참고.

---

## 주요 설계 원칙

### 금액 계산 — decimal.js 필수

JavaScript 부동소수점 오차(`0.1 + 0.2 = 0.30000000000000004`)는 금융 서비스에서 실제 금전 손실로 이어진다. 모든 금액 연산은 `decimal.js`를 통해 처리한다.

```typescript
import { addAmount, formatKRW } from '@/lib/utils/currency';

formatKRW(addAmount(0.1, 0.2)) // "0원" 아닌 정확한 계산
```

### 중복 요청 방지 — Mutation retry: false

송금·주문 등 Mutation은 전역으로 `retry: false`를 설정한다.  
네트워크 타임아웃 후 자동 재시도 시 이중 출금·이중 주문 사고가 발생할 수 있다.

```typescript
// src/app/providers.tsx
mutations: {
  retry: false, // 전역 강제 — 절대 변경 금지
}
```

### API 보안

- `X-Requested-With: XMLHttpRequest` 헤더로 CSRF 방어
- `credentials: 'include'`로 HttpOnly 쿠키 자동 포함 (XSS 토큰 탈취 차단)
- `NEXT_PUBLIC_` 없는 환경변수는 서버 전용 (클라이언트 번들 포함 금지)

### Server / Client 컴포넌트 분리

`layout.tsx`는 서버 컴포넌트로 유지하고, `useState` 등 클라이언트 의존성은 `providers.tsx`에 격리한다. Next.js SSR 이점(초기 로딩 성능·SEO)을 보존하기 위함이다.

### TanStack Query 캐시 전략

| 데이터 종류 | staleTime | 이유 |
|------------|-----------|------|
| 잔액·계좌 정보 | 5분 | 자주 변경되지 않음 |
| 거래 내역 | 1분 | 실시간성 중요 |
| 시세·환율 | 0 (즉시 만료) | 항상 최신 데이터 필요 |
| 사용자 프로필 | 10분 | 거의 변경되지 않음 |

---

## PWA · 푸시 알림

Web Push(VAPID) 기반으로 앱 설치 없이 브라우저 푸시 알림을 지원한다.

```
알림 종류
├── 입금 완료        → CMA 잔액 변동 시
├── 주문 체결        → trading 이벤트 수신 시
├── 자동투자 실행    → 스케줄 완료 시
└── 이상 거래 감지   → 보안 알림 (긴급, urgency: high)
```

알림 권한 요청 및 구독 처리는 `usePushNotification` 훅을 통해 이루어진다.

---

## 관련 레포지토리

- **백엔드**: `backend/` — Java 17 · Spring Boot 3.3 · MSA 8개 서비스
- **문서**: `docs/` — ERD · 기능명세 · 아키텍처