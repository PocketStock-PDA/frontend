---
name: PocketStock
description: 잔돈·포인트를 소수점 주식으로 자동으로 모으는 핀테크 앱
colors:
  brand: "#2563eb"
  brand-surface: "#f0f6ff"
  up: "#f04452"
  down: "#3182f6"
  foreground: "#1a1d23"
  muted-foreground: "#6b7280"
  primary-foreground: "#ffffff"
  destructive: "#f04452"
  background: "oklch(1 0 0)"
  card: "oklch(1 0 0)"
  muted: "oklch(0.97 0 0)"
  border: "oklch(0.922 0 0)"
typography:
  display:
    fontFamily: "Inter, var(--font-inter), ui-sans-serif, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
    fontFeature: "tabular-nums"
  headline:
    fontFamily: "Noto Sans KR, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Noto Sans KR, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Noto Sans KR, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Noto Sans KR, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  numeric:
    fontFamily: "Inter, var(--font-inter), ui-sans-serif, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    fontFeature: "tabular-nums"
rounded:
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  full: "9999px"
spacing:
  card: "16px"
  card-lg: "20px"
  section: "24px"
  list: "12px"
  gutter: "20px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "48px"
  button-buy:
    backgroundColor: "{colors.up}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "48px"
  button-sell:
    backgroundColor: "{colors.down}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "48px"
  card-holding:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  card-facet-active:
    backgroundColor: "{colors.brand-surface}"
    textColor: "{colors.brand}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  chip-status-filled:
    backgroundColor: "{colors.brand-surface}"
    textColor: "{colors.brand}"
    rounded: "{rounded.full}"
    padding: "2px 6px"
  segmented-thumb-active:
    backgroundColor: "{colors.background}"
    textColor: "{colors.brand}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
---

# Design System: PocketStock

## 1. Overview

**Creative North Star: "조용한 창구, 한 조각의 빛 (The Calm Counter, One Bright Piece)"**

PocketStock은 잔돈·포인트를 소수점 주식으로 모으는 입문자용 핀테크 앱이다. 화면의 기본기는 **조용하고 정직한 금융 창구** — 토스식 절제, 큰 숫자, 넉넉한 여백, 솔리드 색. 돈·수익률·보유량은 과장도 축소도 없이 그대로 읽힌다. 그 차분함 위에서 단 하나, **"모으는 중"인 조각 퍼즐**만 살아 빛난다. 재미는 전면에 깔지 않고 한 모멘트로 등장할 때 가장 강하다는 원칙(`/portfolio/[code]?view=pieces`의 JigsawPuzzle)이 시스템 전체를 지배한다.

밀도는 모바일 한 손 사용에 맞춰져 있다(콘텐츠 폭 430px 고정, 세로 스크롤). 깊이는 그림자가 아니라 **톤 레이어링**으로 만든다: 흰 배경 위 흰 카드(`card`)를 테두리로 떼어내고, 강조 영역은 옅은 브랜드 틴트(`brand-surface`)로, 보조 영역은 회색 면(`muted`)으로 구분한다. 리스트는 카드를 반복하지 않고 `divide-y` 행으로 흐른다.

이 시스템이 명시적으로 거부하는 것: HTS/MTS식 정보 과부하, 유치한 과잉 게이미피케이션(폭죽·캐릭터 남발), 딱딱한 전통 은행앱의 차가움. 그리고 무엇보다 **"AI가 만든 티"** — 그라데이션 텍스트, 똑같은 카드 그리드, 중첩 카드, 모든 것에 둥근모서리+그림자.

**Key Characteristics:**
- 솔리드 색만. 강조는 위계·굵기로.
- 깊이는 그림자가 아닌 톤 레이어링 + 테두리 + `divide-y`.
- 숫자는 Inter `tabular-nums`로 정직하게, 텍스트는 Noto Sans KR로.
- 등락은 한국식(상승=red `up`, 하락=blue `down`) + 항상 부호/화살표 병행(색만으로 구분 금지).
- 퍼즐은 시스템에서 유일하게 "재미"가 허용된 시그니처 한 곳.

## 2. Colors

절제된 뉴트럴(흰 배경·흰 카드·회색 보조) 위에 브랜드 블루 하나가 강조를 전담하고, 등락 전용 빨강·파랑이 수치에만 쓰이는 **Restrained** 전략.

### Primary
- **PocketStock Blue** (`#2563eb`): 브랜드 핵심. 1차 버튼, 현재 선택, 활성 상태, 라벨 강조(`scopeLabel`, 칩 텍스트), 커스텀 SVG 아이콘 채움(`var(--brand)`)에만. 장식이 아니라 행동·상태에만 쓴다. 다크모드에서는 `#3b82f6`.

### Secondary
- **Brand Surface** (`#f0f6ff`): 옅은 블루 틴트 면. 개요 카드, FacetCard 활성, 모으기 배너, 상태 칩 배경. "여기에 주목" 영역을 그림자 없이 띄운다. 다크모드 `#1e293b`.

### Tertiary (등락 — 의미 전용)
- **Up Red** (`#f04452`): 상승. `ChangeIndicator` 양수, 매수 버튼(`bg-up`). 한국 관습(상승=빨강). `destructive`와 동일 값이지만 역할은 분리해 생각한다.
- **Down Blue** (`#3182f6`): 하락. `ChangeIndicator` 음수, 매도 버튼(`bg-down`).

### Neutral
- **Ink** (`#1a1d23`): 본문·제목 기본 텍스트(`foreground`).
- **Muted Ink** (`#6b7280`): 보조 텍스트·라벨(`muted-foreground`). 본문 대비 하한을 지킬 것(아래 규칙).
- **Surface** (`oklch(1 0 0)`): 배경·카드(`background`/`card`). 둘 다 순백 — 카드는 테두리로 구분한다.
- **Muted Surface** (`oklch(0.97 0 0)`): 회색 보조 면(`muted`). SegmentedControl 트랙, CollectStatus 통계 패널, 보조 버튼.
- **Border** (`oklch(0.922 0 0)`): 카드 테두리·`divide-y` 구분선.

### Named Rules
**The Quiet Accent Rule.** 브랜드 블루는 한 화면에서 행동·상태·선택에만. 면적으로 도배하지 않는다. 큰 면적이 필요하면 `brand-surface`(틴트)로 내려간다.

**The Two-Signal Rule.** 등락은 색만으로 구분하지 않는다. `+/−` 부호, `▲/▼`, 퍼센트 병기를 항상 함께 쓴다(색각 이상 배려, PRODUCT.md 원칙 5).

## 3. Typography

**Display / Numeric Font:** Inter (with `var(--font-inter)`, ui-sans-serif) — 숫자 전용.
**Body / Heading Font:** Noto Sans KR (with ui-sans-serif, system-ui) — 모든 한글 텍스트.
**Mono Font:** ui-monospace, SFMono-Regular, Menlo (드물게).

**Character:** 본문은 Noto Sans KR의 정직하고 또렷한 한글, 숫자는 Inter의 `tabular-nums`로 자릿수가 흔들리지 않게. 두 가족을 **역할 축(텍스트 vs 숫자)**으로 가르며, 비슷한 산세리프 두 개를 장식적으로 섞지 않는다.

### Hierarchy
- **Display** (Inter, 600, `text-3xl`/1.875rem, tabular-nums): 평가금액 히어로(`AmountDisplay size="xl"`). 화면당 하나.
- **Headline** (Noto Sans KR, 700, `text-2xl`/1.5rem): 온보딩·페이지 진입 제목. `AppHeader` 제목은 `text-[18px]`/700.
- **Title** (Noto Sans KR, 700, `text-base`/1rem): 섹션 제목 `h2`("퍼즐 현황", "최근 내역").
- **Body** (Noto Sans KR, 400, `text-sm`/0.875rem): 본문·행 라벨. 한글 가독 우선.
- **Label** (Noto Sans KR, 500, `text-xs`/0.75rem ~ `text-[10px]`): 마이크로 라벨·배지·칩.
- **Numeric** (Inter, 600, tabular-nums): 모든 금액·수량·수익률. `AmountDisplay`/`ChangeIndicator`는 항상 `font-numeric tabular-nums`.

### Named Rules
**The Numbers-Are-Inter Rule.** 돈·수량·수익률·퍼센트는 예외 없이 `font-numeric` + `tabular-nums`. 한글 라벨에 Inter를 쓰거나, 숫자에 Noto를 쓰면 시스템이 깨진다. 장식 디스플레이 폰트를 라벨·숫자에 끼얹는 것도 금지.

**The Honest Precision Rule.** 5.11주를 가진 사람에게 0.11주처럼 보이게 하지 않는다. 위계가 진실을 가리면 안 된다. 추정 수량 등은 의미 없는 소수점 자릿수 나열(가짜 정밀)을 피한다.

## 4. Elevation

이 시스템은 **기본적으로 평평하다(flat).** 카드·패널은 그림자 없이 `테두리 + 배경 톤`으로만 떠 있고, 깊이는 레이어 톤(`background` → `card` → `brand-surface` / `muted`)과 `divide-y` 구분선으로 만든다. "모든 것에 둥근모서리 + 그림자"의 물렁한 soft-UI는 금지다.

### Shadow Vocabulary (극히 제한적)
- **Thumb lift** (`shadow-sm`): SegmentedControl의 활성 썸, CurrencyToggle 노브 등 "움직이는 작은 컨트롤"에만. 상태 변화의 신호.
- **Floating chip** (`shadow-lg`, 다크칩 `bg-[#0f172a]/90` + `backdrop-blur-sm`): 퍼즐 드래그 중 실시간 HUD 같은 일시적 오버레이에만.

### Named Rules
**The Flat-By-Default Rule.** 표면은 쉴 때 평평하다. 그림자는 상태(움직이는 컨트롤·일시 오버레이)에 대한 응답으로만 등장한다. 정적 카드에 그림자를 깔면 틀린 것.

**The Tactile-Exception Rule.** 단 하나의 예외는 시그니처 JigsawPuzzle. 거기서는 SVG 필터(`feSpecularLighting` 광택, `feDropShadow`, inner-shadow groove)로 "만질 수 있을 듯한" 입체 질감을 의도적으로 만든다. 이 질감은 퍼즐 밖으로 새어나가지 않는다.

## 5. Components

### Buttons
- **Shape:** 둥근 모서리 `rounded-lg`(10px). shadcn 베이스. `focus-visible`에 `ring-3 ring-ring/50`.
- **Primary:** `bg-primary` + `text-primary-foreground`. 앱의 주요 CTA는 폭 전체 + `h-12`~`h-14` + `text-base font-bold`.
- **Buy / Sell:** 매수 `bg-up`, 매도 `bg-down`, 둘 다 `text-white` + `h-12`. 등락 색을 행동에 직결.
- **Variants:** outline / secondary / ghost / link / destructive. 보조 동작은 `ghost`(hover `bg-muted`), 텍스트 액션은 `link`.
- **States:** hover는 `/80~/90` 톤 다운, active는 `translate-y-px`, disabled `opacity-50`.

### Chips / Badges
- **Style:** `rounded-full px-1.5 py-0.5 text-[10px] font-semibold/medium`. 솔리드 면 + 톤 텍스트.
- **Status tone map:** 체결/진행 = `bg-brand-surface text-primary`; 대기/취소 = `bg-muted text-muted-foreground`; 실패 = `bg-destructive/10 text-destructive`. 실패 계열만 destructive, 나머지는 muted/brand.

### Cards / Containers
- **Corner Style:** `rounded-2xl`(18px)가 표준 카드. 아이콘 타일은 `rounded-xl`(14px), 칩은 `rounded-full`.
- **Background:** 기본 `bg-card`(흰색). 강조 카드는 `bg-brand-surface`, 보조 통계 패널은 `bg-muted`.
- **Border:** `border border-border`(솔리드). 비활성/유도 상태만 `border-dashed`(예: AutoPendingCard "모으기 전").
- **Shadow Strategy:** 없음(Elevation의 Flat-By-Default).
- **Internal Padding:** `p-4`(16px) 표준, 큰 패널 `p-5`(20px).
- **States:** hover `bg-muted/40`(흰 카드) 또는 `bg-brand-surface/70`(틴트 카드); focus `focus-visible:outline-2 outline-offset-2 outline-ring`.

### Lists (divide-y rows — 카드 반복 아님)
- 주문/모으기/전환 내역은 카드를 반복하지 않고 `divide-y divide-border`의 행(`py-3`)으로 흐른다. 좌측 라벨+상태칩, 우측 수치(Inter) 정렬.

### Segmented Control (렌즈·스코프 전환)
- **Track:** `bg-muted rounded-lg p-1 w-full`. **Active thumb:** `bg-background text-primary shadow-sm rounded-md`. **Inactive:** `text-muted-foreground`. `transition-colors`.
- 전체/국내/해외(스코프), 전체/모으기/조각(렌즈) 같은 1차원 토글 전용.

### Data Display (AmountDisplay / ChangeIndicator)
- **AmountDisplay:** `font-numeric tabular-nums text-foreground`. size sm `text-sm` / md `text-base` / lg `text-2xl font-semibold` / xl `text-3xl font-semibold`. `signed`로 부호 표시.
- **ChangeIndicator:** `inline-flex font-numeric font-semibold tabular-nums`. 양수 `text-up` / 음수 `text-down` / 0 `text-muted-foreground`. `subPercent`로 "값(±X.XX%)" 병기, 부호·퍼센트 항상 함께.

### Navigation (AppHeader)
- `h-14`(56px), 제목 `text-[18px] font-bold text-foreground` truncate. variant `sub`(뒤로가기) / `modal`. `sticky` 시 `z-40` + safe-area top. 하단 탭바 위 고정 액션바는 `fixed bottom-16 max-w-[430px] border-t bg-background`.

### Empty / Loading
- **EmptyState:** 중앙 정렬 `gap-2 py-10`, 제목 `text-sm font-medium`, 설명 `text-xs text-muted-foreground`, 액션 `mt-2`. "nothing here"가 아니라 다음 행동을 유도.
- **SkeletonCard:** `rounded-xl border border-border bg-card p-4`. 로딩은 스피너가 아니라 스켈레톤으로.

### Signature: JigsawPuzzle (조각 모으기)
PocketStock의 단 하나뿐인 "재미 모멘트". 1주 = 100조각을 **SVG 직소**로 그린다(그리드 div 아님). 두 모드: 로고가 있으면 채운 조각에 **로고 노출 + 흰 컷선**, 빈 칸은 `#f4f6fb` + inner-shadow groove에 미완성 영역은 로고 고스트(opacity 0.1); 로고가 없으면 **파란 유리 모드**(recent `#3b82f6`/0.2, filled `#7dd3fc`/0.1, 두께 인디고 `#1e3a8a`). 빈 조각 탭 → 매수, 채운 조각 탭 → 매도(드래그로 사각 범위 선택). 모션은 framer-motion: 매수 접수 시 **스프링 팝인**(stiffness 520, damping 17) + **글린트** 반짝 + 대기 **펄스**, 매도는 중심 밖으로 **날아가 사라짐**. `useReducedMotion` 전부 존중, `role="img" aria-label="N/100 조각 완성"`. **로고색이 우선, 시맨틱 up/down 색은 단어/HUD에만.**

## 6. Do's and Don'ts

### Do:
- **Do** 색은 **솔리드**로 쓰고 강조는 위계·굵기로 만든다.
- **Do** 깊이를 **톤 레이어링 + 테두리 + `divide-y`**로 만든다. 카드 표준은 `rounded-2xl border border-border bg-card p-4`, 그림자 없음.
- **Do** 모든 금액·수량·수익률을 `font-numeric tabular-nums`(Inter)로, 한글은 Noto Sans KR로.
- **Do** 등락을 **한국식(상승=red `up`, 하락=blue `down`)** 으로, 그리고 **부호/화살표/퍼센트를 색과 함께** 항상 병행한다.
- **Do** 리스트는 카드를 반복하지 말고 `divide-y` 행으로 흘린다.
- **Do** 보조 텍스트(`muted-foreground`)가 `brand-surface`/틴트 위에 올라갈 때 대비 ≥4.5:1을 확인한다. 안 되면 ink 쪽으로 끌어올린다.
- **Do** "재미"는 JigsawPuzzle 한 곳에만 모은다.

### Don't:
- **Don't** 그라데이션 텍스트(`background-clip:text`)·네온 글로우·그라데이션 보더·무지개 다색 액센트를 쓴다.
- **Don't** **컬러 위에 흐린 회색 텍스트**를 올린다(빨아 보이는 저대비). 같은 hue 어두운 톤이나 텍스트색 투명도로.
- **Don't** **히어로-메트릭 템플릿**(큰 숫자+작은 라벨+보조 스탯+그라데이션 액센트)으로 잔액·수익률을 박는다.
- **Don't** **똑같은 카드 그리드**를 끝없이 반복하거나 **카드 안에 카드(중첩 카드)**를 만든다. 정보 조각마다 박스로 가두지 말 것(과한 박스화).
- **Don't** 모든 것에 둥근모서리 + 그림자를 떡칠한다(물렁한 soft-UI). 그림자·radius는 의도적으로만.
- **Don't** 섹션마다 대문자 트래킹 eyebrow나 `01/02/03` 번호 마커를 비계로 깐다(실제 단계 플로우일 때만 번호).
- **Don't** 이모지를 UI 아이콘 대신 쓴다. lucide + 커스텀 SVG(`var(--brand)`/`--up`/`--down`)만.
- **Don't** 카드 좌측 컬러 스트라이프 보더(`border-left` 굵게)를 쓴다.
- **Don't** 바운스/엘라스틱 이징, 균일한 fade-up 일괄 적용, 체결마다 카운트업·폭죽·컨페티를 남발한다. 이징은 ease-out 지수 곡선, 렌즈 전환은 0.15s 크로스페이드.
- **Don't** **녹색=상승** 글로벌 디폴트를 쓴다(한국은 빨강=상승/파랑=하락).
- **Don't** 모달/바텀시트를 첫 생각으로 꺼낸다. 인라인·점진적 대안을 먼저.
- **Don't** 시스템 용어(`roundId`, `exchange`, `QUEUED`)를 사용자 화면에 노출한다. 사람 말로 번역.
