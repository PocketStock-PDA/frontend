/* eslint-disable */
// @ducanh2912/next-pwa customWorker — 빌드 시 생성 서비스워커에 합쳐짐.
//
// 백엔드 푸시 payload 형식(전환 중):
//   - 신규(구조화): { type, title?, body?, url?, tag?, occurredAt?, data: {...} }
//       → data로 종목명·금액·총액을 FE가 포맷(앱 화면과 동일 표기).
//   - 구버전(폴백): { title, body, url? }  → data 없으면 그대로 표시.
// 크로스플랫폼은 LCD 단일 포맷(title+body+icon+badge+tag+data.url). actions/image 미사용.

// ── 포맷 헬퍼 ────────────────────────────────────────────────────────────────
const KRW_FMT = new Intl.NumberFormat("ko-KR");
const USD_FMT = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// 소수점 주식 수량 — 기본(최대 3자리)은 0.0325 같은 값을 조용히 반올림하므로 자릿수 확장.
const QTY_FMT = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 8 });

/** raw number + 통화 → 표시 문자열. KRW="112,400원" / USD="$1,234.00" */
function money(n, currency) {
  if (n == null) return "";
  return currency === "USD" ? "$" + USD_FMT.format(n) : KRW_FMT.format(n) + "원";
}

/** 수량(소수점 포함) → "0.14주" */
function qty(n) {
  return QTY_FMT.format(n) + "주";
}

const sideKo = (side) => (side === "BUY" ? "매수" : "매도");
const autoTriggerKo = (trigger, side) => {
  switch (trigger) {
    case "PERIODIC":
      return "정기매수";
    case "DIP_BUY":
      return "물타기";
    case "TAKE_PROFIT":
      return "익절";
    default:
      return sideKo(side);
  }
};
const autoStatusKo = (status) => {
  switch (status) {
    case "ACCEPTED":
    case "QUEUED":
      return "접수";
    case "FILLED":
      return "완료";
    case "FAILED":
      return "실패";
    default:
      return "실행";
  }
};
const autoStatusVerb = (status) => {
  switch (status) {
    case "ACCEPTED":
    case "QUEUED":
      return "접수되었어요";
    case "FILLED":
      return "완료됐어요";
    case "FAILED":
      return "실패했어요";
    default:
      return "실행됐어요";
  }
};

function autoValue(d) {
  if (d.amount != null) return money(d.amount, d.currency);
  if (d.quantity != null) return qty(d.quantity);
  return "";
}

function stockLabel(d) {
  if (typeof d.stockName === "string" && d.stockName.trim()) {
    return d.stockName.trim();
  }
  return d.stockCode || "종목";
}

/**
 * 구조화 payload → { title, body }. data 템플릿 없는 type은 null 반환 → title/body 폴백.
 */
function format(p) {
  const d = p.data || {};
  const name = stockLabel(d); // 종목명 없으면 코드 폴백
  switch (p.type) {
    case "TRADE_FILLED": {
      // 토스형 1줄: 제목=종목+액션, 본문=수량·총액 한 문장(주당가·라벨 생략, 앱에서 확인).
      const verb = d.side === "BUY" ? "샀어요" : "팔았어요";
      return {
        title: `${name} ${sideKo(d.side)} 체결`,
        body: `${qty(d.quantity)}를 ${money(d.totalAmount, d.currency)}에 ${verb}`,
      };
    }
    case "UNFILLED":
      // 백엔드 UNFILLED = 주문 거부·체결 실패(미체결 아님). reason 미존재 시 일반 문구.
      return {
        title: `${name} ${sideKo(d.side)} 주문 실패`,
        body: d.reason || "주문이 체결되지 못했어요",
      };
    case "AUTO_INVEST_EXECUTED": {
      const trigger = autoTriggerKo(d.trigger, d.side);
      const status = autoStatusKo(d.status);
      const value = autoValue(d);
      return {
        title: `${trigger} ${status}`,
        body: [name, value, trigger, autoStatusVerb(d.status)]
          .filter(Boolean)
          .join(" "),
      };
    }
    case "AUTO_INVEST_FAILED": {
      const trigger = autoTriggerKo(d.trigger, d.side);
      const reason = d.reason ? ` (${d.reason})` : "";
      return {
        title: `${trigger} 실패`,
        body: `${name} ${trigger} 실패${reason}`,
      };
    }
    default:
      return null; // GOAL_NUDGE / ACCOUNT_VERIFY / 미지원 → 폴백
  }
}

/** type별 딥링크. 백엔드 url 우선, 없으면 FE 파생. */
function routeFor(p) {
  if (p.url) return p.url;
  const d = p.data || {};
  switch (p.type) {
    case "TRADE_FILLED":
      return d.stockCode ? `/portfolio/detail?stockCode=${d.stockCode}` : "/portfolio";
    case "UNFILLED":
      return "/history?tab=pending";
    case "AUTO_INVEST_EXECUTED":
    case "AUTO_INVEST_FAILED":
      return d.stockCode
        ? `/portfolio/detail?stockCode=${d.stockCode}&view=collect`
        : "/portfolio";
    case "GOAL_NUDGE":
      return "/budget";
    default:
      return "/notifications";
  }
}

/** 그룹/덮어쓰기 태그. 백엔드 tag 우선. */
function tagFor(p) {
  if (p.tag) return p.tag;
  const d = p.data || {};
  switch (p.type) {
    case "TRADE_FILLED":
    case "UNFILLED":
      return d.orderId != null ? `order-${d.orderId}` : undefined;
    case "AUTO_INVEST_EXECUTED":
    case "AUTO_INVEST_FAILED":
      return d.settingId != null && d.roundNo != null
        ? `autoinvest-${d.settingId}-${d.roundNo}`
        : undefined;
    case "GOAL_NUDGE":
      return "goal-nudge";
    case "ACCOUNT_VERIFY":
      return "account-verify"; // 최신 코드만 유지(이전 알림 덮어쓰기)
    default:
      return undefined;
  }
}

self.addEventListener("push", (event) => {
  let p = {};
  try {
    p = event.data ? event.data.json() : {};
  } catch (e) {
    p = {};
  }

  const f =
    (p.data && format(p)) || { title: p.title || "포켓스톡", body: p.body || "" };

  const ts = p.occurredAt ? Date.parse(p.occurredAt) : NaN; // UTC(Z) → epoch
  const options = {
    body: f.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png", // iOS 무시·안드로이드 사용 (분기 불필요)
    tag: tagFor(p),
    data: { url: routeFor(p) },
  };
  if (!Number.isNaN(ts)) options.timestamp = ts; // 표시 시각을 이벤트 시각으로
  event.waitUntil(self.registration.showNotification(f.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/notifications";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(url);
            return undefined;
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
