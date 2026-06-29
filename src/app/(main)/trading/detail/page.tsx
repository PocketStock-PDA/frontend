"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { CurrencyToggle } from "@/components/common/CurrencyToggle";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TxnAuthDialog } from "@/components/common/TxnAuthDialog";
import { JigsawPuzzle } from "@/components/features/portfolio/JigsawPuzzle";
import { OrderAmountPanel } from "@/components/features/trading/OrderAmountPanel";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { useExchangeRate } from "@/hooks/queries/useExchangeRate";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import { useOrders } from "@/hooks/queries/useOrders";
import { useBuyOrder } from "@/hooks/mutations/useBuyOrder";
import { useSellOrder } from "@/hooks/mutations/useSellOrder";
import { useWholeOrder } from "@/hooks/mutations/useWholeOrder";
import { useStockTradeSocket } from "@/hooks/useStockTradeSocket";
import { useStockBestAsk } from "@/hooks/useStockBestAsk";
import { genClientOrderId } from "@/lib/utils/idempotency";
import { toDecimal } from "@/lib/utils/decimal";
import { PIECES_PER_SHARE } from "@/lib/utils/pieces";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { splitOrderToast, wholeOrderToast } from "@/lib/utils/orderResult";
import { cn } from "@/lib/utils";
import { tradingOrderbookPath } from "@/lib/navigation/routes";
import type {
  SplitOrderResponse,
  WholeOrderResponse,
} from "@/types/domain/order";

type Tab = "PIECES" | "FRACTION" | "WHOLE"; // 조각(퍼즐) / 소수점 / 온주
type InputMode = "QTY" | "AMOUNT"; // 수량으로 / 금액으로 (소수점 전용)
type Side = "BUY" | "SELL";
// 조각(퍼즐) 선택 — 확정 시점에 멱등키 1개 발급. 하단 고정바에서 인라인 확정.
type PieceSel = { indexes: number[]; clientOrderId: string };
type LiveSel = { mode: "buy" | "sell"; indexes: number[] };
// 접수(체결 대기) 조각 주문 — 퍼즐 손맛 애니메이션용. 실제 FILLED 시 개별 해제.
type PendingOrder = { orderId: number; mode: "buy" | "sell"; count: number };



function formatShares(q: Decimal) {
  return q.toDecimalPlaces(4).toString();
}

export default function TradePage() {
  const searchParams = useSearchParams();
  const stockCode = searchParams.get("stockCode");
  // 진입 방향 — 보유 상세의 매도 버튼 등에서 ?side=SELL로 넘어옴(기본 구매)
  const initialSide: Side = searchParams.get("side") === "SELL" ? "SELL" : "BUY";

  if (!stockCode) {
    return <MissingStockCodeState />;
  }

  return <TradeContent stockCode={stockCode} initialSide={initialSide} />;
}

function MissingStockCodeState() {
  const router = useRouter();

  return (
    <>
      <AppHeader variant="sub" title="주문하기" />
      <EmptyState
        title="종목 정보가 없어요"
        description="주문할 종목을 다시 선택해 주세요."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/trading/search")}
          >
            종목 선택
          </Button>
        }
        className="mt-8"
      />
    </>
  );
}

function TradeContent({
  stockCode,
  initialSide,
}: {
  stockCode: string;
  initialSide: Side;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const detailQ = useStockDetail(stockCode);
  const exchangeRateQ = useExchangeRate(); // 해외 종목 원화 환산 토글용(매매기준율)
  const holdingsQ = useHoldings();
  const cmaQ = useCmaHome();
  const ordersQ = useOrders(); // 접수 조각 reconcile용 폴링 소스
  const buyOrder = useBuyOrder();
  const sellOrder = useSellOrder();
  const wholeOrder = useWholeOrder();
  // 실시간 시세(체결) → stockDetail 캐시 갱신 (issue #10)
  useStockTradeSocket(stockCode, {
    overseas: detailQ.data?.currency === "USD",
    enabled: !!detailQ.data,
  });

  // 최우선 매도호가: WS → REST polling(Redis) → currentPrice 순 폴백
  const bestAskResult = useStockBestAsk(stockCode, {
    overseas: detailQ.data?.currency === "USD",
    currentPrice: detailQ.data?.price?.currentPrice ?? null,
    enabled: !!detailQ.data,
  });

  const [side, setSide] = useState<Side>(initialSide); // 주문 방향(구매/판매) — 진입 side(보유 상세 매도 등) 반영, 상단에서 전환
  const [tab, setTab] = useState<Tab>("PIECES"); // 조각(퍼즐) 기본 — 소수점/온주는 숫자 입력
  const [inputMode, setInputMode] = useState<InputMode>("QTY");
  const [qty, setQty] = useState(0);
  const [amount, setAmount] = useState(0);
  const [autoCharge, setAutoCharge] = useState(true);
  // 조각(퍼즐) 선택 — 확정(탭/드래그 종료) 시 채워짐. 하단 고정바가 이 선택을 확정.
  const [pieceSel, setPieceSel] = useState<PieceSel | null>(null);
  // 드래그 중 라이브 선택(조각 수·금액 HUD용). 손 떼면 null
  const [live, setLive] = useState<LiveSel | null>(null);
  // 해외 종목 한정: 조회용 금액(현재가·매수가능·예상주문금액)을 원화로 환산해 볼지 토글. 주문은 항상 달러 체결.
  const [ovsKrw, setOvsKrw] = useState(false);
  // 거래 인증 필요(TXN_AUTH_REQUIRED) 시 계좌 비밀번호를 받기 위한 시트 — 인증 후 그 side로 재시도
  const [authSide, setAuthSide] = useState<Side | null>(null);

  // 멱등키: 같은 주문(파라미터·side) 재시도 시 동일 키 재사용, 입력 변경 시 폐기 (issue #4)
  const orderKeys = useRef<Record<Side, string | null>>({ BUY: null, SELL: null });
  const resetKeys = () => {
    orderKeys.current = { BUY: null, SELL: null };
  };
  // 따닥 탭 방지 — React state 업데이트 지연 없이 즉시 잠금
  const submitting = useRef(false);

  // 접수(체결 대기) 조각 주문들 — 확정 즉시 퍼즐 애니메이션. 동시 다건 누적, 각자 실제 FILLED 시 개별 해제.
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const hasPending = pendingOrders.length > 0;
  const ordersRefetch = ordersQ.refetch;
  const holdingsRefetch = holdingsQ.refetch;
  // 폴링 콜백에서 최신 pending을 읽기 위한 ref(이펙트 내부 동기 setState 회피)
  const pendingRef = useRef(pendingOrders);
  useEffect(() => {
    pendingRef.current = pendingOrders;
  }, [pendingOrders]);

  // 접수 중이면 주문내역을 폴링(차수배치 ~1분)하며 reconcile.
  // FILLED → 보유 갱신 후 해제(확정 스냅) / 실패 → 해제(롤백). 5분 안전망.
  useEffect(() => {
    if (!hasPending) return;
    const tick = async () => {
      const res = await ordersRefetch();
      const list = res.data ?? [];
      const resolved = new Set<number>();
      let anyFilled = false;
      let anyFailed = false;
      for (const p of pendingRef.current) {
        const o = list.find((x) => x.orderId === p.orderId);
        if (!o) continue;
        if (o.status === "FILLED") {
          resolved.add(p.orderId);
          anyFilled = true;
        } else if (o.status === "REJECTED" || o.status === "CANCELLED") {
          resolved.add(p.orderId);
          anyFailed = true;
        }
      }
      if (resolved.size === 0) return;
      if (anyFilled) void holdingsRefetch();
      if (anyFailed) toast.error("체결되지 못한 주문이 있어요.");
      setPendingOrders((prev) => prev.filter((p) => !resolved.has(p.orderId)));
    };
    const iv = setInterval(() => void tick(), 4000);
    const stop = setTimeout(() => setPendingOrders([]), 300_000);
    return () => {
      clearInterval(iv);
      clearTimeout(stop);
    };
  }, [hasPending, ordersRefetch, holdingsRefetch]);

  if (detailQ.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={1} className="h-10 border-0 bg-transparent p-0" />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (detailQ.isError || !detailQ.data) {
    return (
      <div>
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => detailQ.refetch()}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  const detail = detailQ.data;
  const isUSD = detail.currency === "USD";
  const market = isUSD ? "OVERSEAS" : "DOMESTIC";
  const amountDp = isUSD ? 2 : 0; // 금액 반올림 자리수: KRW 0 / USD 2(센트)
  const fmtAmount = (v: number | string) => (isUSD ? formatUSD(v) : formatKRW(v));
  const minOrder = isUSD ? 1 : 1000; // 소수점 최소 주문금액 (국내 1,000원 / 해외 $1)

  // 해외 종목을 원화로 보기: 매매기준율(baseRate)이 있을 때만. 국내는 항상 원화라 무관.
  const fx = isUSD ? exchangeRateQ.data?.baseRate ?? null : null;
  const showKrw = ovsKrw && fx !== null;
  const viewCurrency: "USD" | "KRW" = isUSD && !showKrw ? "USD" : "KRW";
  // 조회용 금액 포맷 — 원화 보기면 USD값을 환율로 환산, 아니면 종목 통화 그대로.
  const fmtView = (v: number | string) =>
    showKrw ? formatKRW(toDecimal(v).times(fx).toNumber()) : fmtAmount(v);

  // 금액 계산은 decimal.js 필수 (README 가이드라인). API 값은 toDecimal로 안전 변환(null→0)
  const price = toDecimal(detail.price?.currentPrice); // 표시용 현재가(체결가)
  // hold 계산용 매도 1호가 — WS/REST/currentPrice 폴백 체인. null이면 시세 미수신.
  const bestAsk = toDecimal(bestAskResult.bestAsk ?? detail.price?.currentPrice);
  const holding = holdingsQ.data?.find((h) => h.stockCode === stockCode);
  const holdingQty = toDecimal(holding?.quantity);
  const buyingPower = cmaQ.data?.cmaBalance?.[isUSD ? "USD" : "KRW"] ?? 0;

  // 조각(퍼즐) — 보유 소수분 → 채운 조각(0~99). 1조각 = 매도 1호가/100(hold 기준과 동일).
  const heldPieces = holdingQty
    .minus(holdingQty.floor())
    .times(PIECES_PER_SHARE)
    .toDecimalPlaces(0, Decimal.ROUND_DOWN)
    .toNumber();
  const perPiece = bestAsk.gt(0) ? bestAsk.div(PIECES_PER_SHARE) : price.div(PIECES_PER_SHARE);
  // 백엔드 최소 주문금액(국내 1,000원/해외 $1)을 채우는 최소 조각 수.
  const minPieces = perPiece.gt(0)
    ? new Decimal(minOrder).div(perPiece).ceil().toNumber()
    : 1;
  const selPieces = pieceSel?.indexes.length ?? 0;
  const piecesAmount = perPiece.times(selPieces);
  // 판매+조각인데 채운 조각이 0 → 팔 조각이 없음(소수분 0 또는 1조각 미만). 빈 상태로 유도.
  const piecesSellEmpty =
    tab === "PIECES" && side === "SELL" && heldPieces === 0;
  // 접수분 합산(동시 다건) → 퍼즐에 채움/날림 애니메이션으로 전달
  const pendingBuy = pendingOrders.reduce(
    (s, p) => s + (p.mode === "buy" ? p.count : 0),
    0,
  );
  const pendingSell = pendingOrders.reduce(
    (s, p) => s + (p.mode === "sell" ? p.count : 0),
    0,
  );

  // 소수점 QUANTITY 매수 hold = qty × bestAsk × (1 + buffer). 백엔드와 동일 버퍼 적용해 한도 역산.
  // 국내 1%, 해외 2% — FractionalOrderService.BUFFER_DOMESTIC/OVERSEAS와 일치.
  const fracBuyBuffer = isUSD ? 0.02 : 0.01;
  // 계산용 유효 호가 — bestAsk 없으면 표시가(currentPrice) 사용
  const calcPrice = bestAsk.gt(0) ? bestAsk : price;

  // 최대 수량 — 매수는 매수가능/bestAsk, 매도는 보유수량. 온주는 내림, 소수점은 4자리 내림.
  // bestAsk 기준: 백엔드 hold = qty × bestAsk × (1+buffer) 와 동일 소스 → INSUFFICIENT_BALANCE 방지.
  const maxBuyQty = calcPrice.gt(0)
    ? tab === "WHOLE"
      ? new Decimal(buyingPower).div(calcPrice)
      : new Decimal(buyingPower).div(calcPrice.times(1 + fracBuyBuffer))
    : new Decimal(0);
  const maxQtyBase = side === "BUY" ? maxBuyQty : holdingQty;
  const maxQtyValue =
    tab === "WHOLE"
      ? maxQtyBase.floor().toNumber()
      : maxQtyBase.toDecimalPlaces(4, Decimal.ROUND_DOWN).toNumber();

  // 방향 전환 — 매도는 금액으로 불가(수량만). 조각 선택·멱등키 초기화.
  const changeSide = (s: Side) => {
    setSide(s);
    if (s === "SELL") setInputMode("QTY");
    setPieceSel(null);
    setLive(null);
    resetKeys();
  };

  // 주문 방식 전환(조각/소수점/온주). 온주는 정수 수량, 조각은 퍼즐.
  const changeTab = (t: Tab) => {
    setTab(t);
    if (t === "WHOLE") {
      setInputMode("QTY");
      setQty((q) => Math.floor(q)); // 온주는 정수 수량
    } else if (t === "PIECES") {
      setInputMode("QTY");
    }
    setPieceSel(null);
    setLive(null);
    resetKeys();
  };
  const changeInputMode = (im: InputMode) => {
    setInputMode(im); // 금액으로는 소수점 전용(이 탭에서만 노출)
    resetKeys();
  };

  const onQtyChange = (v: number) => {
    setQty(v);
    resetKeys();
  };
  const onAmountChange = (v: number) => {
    setAmount(v);
    resetKeys();
  };

  // 소수점/온주 예상 주문금액 — bestAsk 기준(hold 소스와 일치). AMOUNT 모드는 그대로.
  const orderAmount =
    inputMode === "AMOUNT" ? new Decimal(amount) : new Decimal(qty).times(calcPrice);

  const pending =
    buyOrder.isPending || sellOrder.isPending || wholeOrder.isPending;
  // 하단 고정바 활성/금액 — 조각이면 선택 조각 기준, 아니면 수량·금액 기준
  const numericValid = inputMode === "AMOUNT" ? amount > 0 : qty > 0;
  const stickyValid = tab === "PIECES" ? selPieces > 0 : numericValid;
  const stickyAmount =
    tab === "PIECES"
      ? piecesAmount.toDecimalPlaces(amountDp).toNumber()
      : orderAmount.toDecimalPlaces(amountDp).toNumber();

  // 한도 초과 — 버튼 비활성 + 경고 텍스트 즉시 표시. 백엔드 검증과 별도 피드백.
  const isOverLimit = (() => {
    if (!stickyValid) return false;
    if (side === "BUY") {
      if (tab === "PIECES") return piecesAmount.times(1 + fracBuyBuffer).gt(buyingPower);
      // AMOUNT 모드: hold = 금액 그대로(버퍼 없음). QUANTITY/WHOLE: bestAsk × (1+buffer) or bestAsk.
      const need =
        inputMode === "AMOUNT"
          ? new Decimal(amount)
          : tab === "WHOLE"
            ? new Decimal(qty).times(calcPrice)
            : new Decimal(qty).times(calcPrice).times(1 + fracBuyBuffer);
      return need.gt(buyingPower);
    }
    // SELL — PIECES는 퍼즐 UI가 heldPieces 초과 선택 불가하므로 체크 불필요
    if (tab === "PIECES") return false;
    const sellQty =
      inputMode === "AMOUNT" && calcPrice.gt(0)
        ? new Decimal(amount).div(calcPrice)
        : new Decimal(qty);
    return sellQty.gt(holdingQty);
  })();
  const overLimitMsg =
    side === "BUY" ? "매수 가능 금액을 초과했어요" : "보유 수량을 초과했어요";

  // 조각 탭: 아직 아무것도 안 골랐으면 버튼이 곧 안내 문구(비활성). 탭/드래그하면 구매/판매로.
  const piecesHint = tab === "PIECES" && selPieces === 0;
  const ctaLabel = piecesHint
    ? piecesSellEmpty
      ? "판매할 소수점 조각이 없어요"
      : side === "BUY"
        ? "빈 조각을 드래그해 구매하기"
        : "모은 조각을 드래그해 판매하기"
    : side === "BUY"
      ? "구매"
      : "판매";

  // 주문창 안내 문구 — 방향(구매/판매) + 모드별
  const action = side === "BUY" ? "구매" : "판매";
  const qtyPlaceholder =
    tab === "WHOLE"
      ? `몇 주 ${action}할까요?`
      : `소수점 몇 주 ${action}할까요?`;
  const amountPlaceholder = `얼마어치 ${action}할까요?`;

  // 매도인데 보유 수량이 아예 없으면 주문 폼 대신 빈 상태 노출
  const noSellable = side === "SELL" && holdingQty.lte(0);

  const resetAfterSuccess = (side: Side) => {
    orderKeys.current[side] = null; // 키 폐기 → 다음 주문은 새 키
    setQty(0);
    setAmount(0);
  };
  const makeOpts = (side: Side) => ({
    onSuccess: () => {
      resetAfterSuccess(side);
      toast.success(`${action} 주문이 접수됐어요`);
    },
    // 실패 시 키 유지 → 같은 주문 재시도 시 동일 키(멱등)
    onError: (err: unknown) => {
      submitting.current = false;
      // 거래 인증 미완료: 계좌 비밀번호 시트를 띄우고, 인증되면 동일 키로 재시도
      if (err instanceof ApiError && err.code === "TXN_AUTH_REQUIRED") {
        setAuthSide(side);
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        toast.error("이미 처리 중인 주문이에요. 잠시 후 다시 확인해 주세요.");
        return;
      }
      toast.error(
        err instanceof ApiError
          ? err.message
          : "주문에 실패했어요. 잠시 후 다시 시도해 주세요.",
      );
    },
  });

  // 조각(퍼즐) 선택 확정 — 상단 토글이 마스터: 방향과 다른 제스처는 무시, 최소금액 미달은 상향 보정.
  const handlePieceCommit = (s: LiveSel | null) => {
    if (!s) {
      setPieceSel(null);
      return;
    }
    const want = side === "BUY" ? "buy" : "sell";
    if (s.mode !== want) {
      toast.warning(
        side === "BUY"
          ? "구매는 빈 조각을 탭해 담아요"
          : "판매는 채운 조각을 탭해요",
      );
      return;
    }
    let indexes = s.indexes;
    if (indexes.length < minPieces) {
      const candidates =
        s.mode === "buy"
          ? Array.from(
              { length: PIECES_PER_SHARE - heldPieces },
              (_, i) => heldPieces + i,
            )
          : Array.from({ length: heldPieces }, (_, i) => i);
      const chosen = new Set(indexes);
      for (const idx of candidates) {
        if (chosen.size >= minPieces) break;
        chosen.add(idx);
      }
      indexes = Array.from(chosen).sort((a, b) => a - b);
      if (indexes.length < minPieces) {
        toast.warning(`최소 주문금액(${fmtView(minOrder)})을 채울 조각이 부족해요`);
        setPieceSel(null);
        return;
      }
      if (indexes.length > s.indexes.length) {
        toast.warning(
          `최소 주문금액은 ${fmtView(minOrder)} 이상이에요. ${indexes.length}조각으로 맞췄어요`,
        );
      }
    }
    setPieceSel({ indexes, clientOrderId: genClientOrderId() });
  };

  // 조각 주문 실행 — 소수 주수(조각/100)로 QUANTITY 주문(소수분 차수대기).
  const submitPieces = (s: Side) => {
    if (pending || submitting.current || !pieceSel || pieceSel.indexes.length <= 0) return;
    submitting.current = true;
    const quantity = new Decimal(pieceSel.indexes.length)
      .div(PIECES_PER_SHARE)
      .toNumber();
    const clientOrderId = pieceSel.clientOrderId;
    // 접수 애니메이션용 — 확정 시점의 조각 수·모드 고정(이후 sel은 null로 닫힘)
    const committedMode = s === "BUY" ? "buy" : "sell";
    const committedCount = pieceSel.indexes.length;
    const opts = {
      ...makeOpts(s),
      onSuccess: (data: SplitOrderResponse) => {
        submitting.current = false;
        // 소수분 접수됨 → 퍼즐에 즉시 손맛 애니메이션(실제 체결 전까지 pending). 동시 다건 누적.
        const fid = data.fractionalOrderId;
        if (fid !== null) {
          setPendingOrders((prev) => [
            ...prev,
            { orderId: fid, mode: committedMode, count: committedCount },
          ]);
        }
        setPieceSel(null);
        setLive(null);
        const t = splitOrderToast(s, data);
        toast.success(
          t.title,
          t.description ? { description: t.description } : undefined,
        );
      },
    };
    if (s === "BUY") {
      buyOrder.mutate(
        { clientOrderId, stockCode, market, orderType: "QUANTITY", quantity },
        opts,
      );
    } else {
      sellOrder.mutate(
        { clientOrderId, stockCode, market, orderType: "QUANTITY", quantity },
        opts,
      );
    }
  };

  // 소수점/온주 숫자 주문 실행
  const submit = (side: Side) => {
    if (pending || submitting.current || !numericValid) return;
    submitting.current = true;
    const clientOrderId = orderKeys.current[side] ?? genClientOrderId();
    orderKeys.current[side] = clientOrderId;
    const opts = makeOpts(side);

    if (tab === "WHOLE") {
      // 온주 간편 = 시장가. 지정가(호가창)는 '주문방법 변경하기'에서 (이슈 ②)
      wholeOrder.mutate(
        { clientOrderId, stockCode, market, side, orderType: "MARKET", quantity: qty },
        {
          ...opts,
          onSuccess: (data: WholeOrderResponse) => {
            submitting.current = false;
            resetAfterSuccess(side);
            const t = wholeOrderToast(data, fmtAmount);
            toast.success(
              t.title,
              t.description ? { description: t.description } : undefined,
            );
          },
        },
      );
      return;
    }
    // 소수점: 금액 모드는 AMOUNT(원하는 금액), 수량 모드는 QUANTITY(소수 주수). 금액 단위·배수 제약 없음.
    // 최소 주문금액(1,000원·$1) 미만은 자동으로 최소금액/최소수량으로 상향 보정.
    let correctedAmount = amount;
    let correctedQty = qty;
    if (inputMode === "AMOUNT") {
      if (amount > 0 && amount < minOrder) {
        correctedAmount = minOrder;
        setAmount(minOrder);
        toast.warning(
          `최소 주문금액은 ${fmtAmount(minOrder)} 이상이에요. ${fmtAmount(minOrder)}으로 맞췄어요`,
        );
      }
    } else if (calcPrice.gt(0) && new Decimal(qty).times(calcPrice).lt(minOrder)) {
      correctedQty = new Decimal(minOrder)
        .div(calcPrice)
        .toDecimalPlaces(4, Decimal.ROUND_UP)
        .toNumber();
      setQty(correctedQty);
      toast.warning(
        `최소 주문금액은 ${fmtAmount(minOrder)} 이상이에요. ${formatShares(new Decimal(correctedQty))}주로 조정했어요`,
      );
    }
    // 보정 후 실제 주문 가능 범위 검증 — 매수 가능 금액 / 매도 가능 수량 초과 시 차단.
    // bestAsk 기준: 백엔드 hold 계산과 동일 소스 → INSUFFICIENT_BALANCE 방지.
    if (side === "BUY") {
      // AMOUNT 모드: hold = 금액 그대로. QUANTITY: hold = qty × bestAsk × (1+buffer).
      const need =
        inputMode === "AMOUNT"
          ? new Decimal(correctedAmount)
          : new Decimal(correctedQty).times(calcPrice).times(1 + fracBuyBuffer);
      if (need.gt(buyingPower)) {
        submitting.current = false;
        toast.error("매수 가능 금액을 초과했어요.");
        return;
      }
    } else {
      const sellQty =
        inputMode === "AMOUNT"
          ? calcPrice.gt(0)
            ? new Decimal(correctedAmount).div(calcPrice)
            : new Decimal(0)
          : new Decimal(correctedQty);
      if (sellQty.gt(holdingQty)) {
        submitting.current = false;
        toast.error("보유 수량을 초과했어요.");
        return;
      }
    }
    const orderDetail =
      inputMode === "AMOUNT"
        ? ({ orderType: "AMOUNT", amount: correctedAmount } as const)
        : ({ orderType: "QUANTITY", quantity: correctedQty } as const);
    // 소수점 응답(split)은 결과를 보여준다 — 온주분 즉시체결 / 소수분 차수대기
    const fracOpts = {
      ...opts,
      onSuccess: (data: SplitOrderResponse) => {
        submitting.current = false;
        resetAfterSuccess(side);
        const t = splitOrderToast(side, data);
        toast.success(
          t.title,
          t.description ? { description: t.description } : undefined,
        );
      },
    };
    if (side === "BUY") {
      buyOrder.mutate({ clientOrderId, stockCode, market, ...orderDetail }, fracOpts);
    } else {
      sellOrder.mutate({ clientOrderId, stockCode, market, ...orderDetail }, fracOpts);
    }
  };

  // 하단 고정바·인증 재시도의 단일 진입점 — 탭에 따라 조각/숫자 주문으로 분기
  const submitForTab = (s: Side) => {
    if (tab === "PIECES") submitPieces(s);
    else submit(s);
  };

  return (
    <>
      <AppHeader
        variant="sub"
        right={
          // 해외 종목 + 환율 보유 시: 달러 ↔ 원화 조회 토글
          isUSD && fx !== null ? (
            <CurrencyToggle checked={ovsKrw} onChange={setOvsKrw} />
          ) : undefined
        }
        title={
          // 헤더 탭 → 검색 전용 오버레이 (메뉴 아님). 종목명 옆 돋보기로 검색 가능함을 암시
          <button
            type="button"
            onClick={() => router.push("/trading/search")}
            aria-label="종목 검색 열기"
            className="-mx-1 flex items-center gap-2 rounded-lg px-1 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Avatar className="size-7">
              {detail.logoUrl && (
                <AvatarImage src={detail.logoUrl} alt={detail.stockName} />
              )}
              <AvatarFallback className="text-[10px]">
                {(detail.stockCode ?? detail.stockName).trim().charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex flex-col text-left leading-tight">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {detail.stockName}
                <Search className="size-3" />
              </span>
              <span className="flex items-baseline gap-1.5">
                <AmountDisplay
                  value={(showKrw ? price.times(fx) : price).toString()}
                  currency={viewCurrency}
                  size="md"
                  className="font-bold"
                />
                <ChangeIndicator value={detail.price?.changeRate ?? 0} percent size="sm" />
              </span>
            </span>
          </button>
        }
      />

      <div className="space-y-5 pb-40">
        {/* 구매 | 판매 — 주문 방향 먼저 선택(시맨틱색). 활성 알약이 좌우로 미끄러져
            방향 전환을 손에 잡히게 한다. 가운데 정렬·좁은 알약 */}
        <div className="relative mx-auto flex w-[64%] rounded-full bg-muted p-1">
          {(
            [
              { s: "BUY", label: "구매", bg: "bg-up" },
              { s: "SELL", label: "판매", bg: "bg-down" },
            ] as const
          ).map(({ s, label, bg }) => {
            const active = side === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => changeSide(s)}
                className={cn(
                  "relative flex-1 rounded-full py-2 text-sm font-bold transition-colors",
                  active ? "text-white" : "text-muted-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sideThumb"
                    aria-hidden
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "tween", duration: 0.25, ease: [0.22, 1, 0.36, 1] }
                    }
                    className={cn("absolute inset-0 rounded-full", bg)}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>

        {noSellable ? (
          <EmptyState
            title="판매할 주식이 없어요"
            description="보유한 수량이 없어요. 구매로 먼저 담아보세요."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => holdingsQ.refetch()}
              >
                새로고침
              </Button>
            }
            className="py-12"
          />
        ) : (
          <>
        {/* 조각 | 소수점 | 온주 — 주문 방식 선택 */}
        <SegmentedControl<Tab>
          options={[
            { label: "조각", value: "PIECES" },
            { label: "소수점", value: "FRACTION" },
            { label: "온주", value: "WHOLE" },
          ]}
          value={tab}
          onChange={changeTab}
        />

        {/* 렌즈 전환 — 조각/소수점/온주 사이를 0.15s 크로스페이드(DESIGN: 렌즈 전환).
            key={tab}로 remount해 들어오는 콘텐츠만 살짝 떠오른다. */}
        <motion.div
          key={tab}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
        {tab === "PIECES" ? (
          /* 조각(퍼즐) — 빈/채운 조각을 탭해 담고, 하단 고정바에서 확정 */
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">조각 모으기</h2>
              <span className="font-numeric text-sm font-bold text-primary">
                {heldPieces}/{PIECES_PER_SHARE} 조각
              </span>
            </div>
            <div className="relative">
              <JigsawPuzzle
                total={PIECES_PER_SHARE}
                filled={heldPieces}
                onSelectionCommit={handlePieceCommit}
                onSelectionChange={setLive}
                selectedIndexes={pieceSel?.indexes ?? []}
                logoUrl={detail.logoUrl}
                pendingBuy={pendingBuy}
                pendingSell={pendingSell}
              />
              {/* 드래그 중 실시간 HUD — 중립 다크 칩(로고색 무관). 방향=시맨틱색 단어 */}
              {live &&
                live.indexes.length > 0 &&
                live.mode === (side === "BUY" ? "buy" : "sell") && (
                  <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                    <div className="flex items-center gap-1.5 rounded-full bg-[#0f172a]/90 px-3.5 py-1.5 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
                      <span className={side === "BUY" ? "text-up" : "text-down"}>
                        {action}
                      </span>
                      <span>{live.indexes.length}조각</span>
                      <span className="opacity-40">·</span>
                      <span className="font-numeric">
                        {fmtView(perPiece.times(live.indexes.length).toString())}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </section>
        ) : (
          /* 소수점 / 온주 — 수량·금액 입력 카드 */
          <div className="rounded-2xl bg-muted/50 p-4">
            <OrderAmountPanel
              amountMode={inputMode}
              onAmountModeChange={changeInputMode}
              isUSD={isUSD}
              showKrw={showKrw}
              fx={fx}
              amount={amount}
              onAmountChange={onAmountChange}
              buyingPower={buyingPower}
              maxBuyQty={maxQtyValue}
              qty={qty}
              onQtyChange={onQtyChange}
              fractional={tab === "FRACTION"}
              showAmountMode={tab === "FRACTION" && side === "BUY"}
              qtyPlaceholder={qtyPlaceholder}
              amountPlaceholder={amountPlaceholder}
              infoLabel={side === "BUY" ? "구매 가능" : "판매 수량"}
            />
          </div>
        )}
        </motion.div>

        {/* 부족금액 자동충전 — 구매에서만 */}
        {side === "BUY" && (
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              부족금액 자동충전
            </span>
            <Switch checked={autoCharge} onCheckedChange={setAutoCharge} />
          </label>
        )}

        {/* 온주: 호가창(지정가) 매매로 이동 (이슈 ②) */}
        {tab === "WHOLE" && (
          <button
            type="button"
            onClick={() => router.push(tradingOrderbookPath(stockCode))}
            className="ps-rise-in flex w-full items-center justify-center rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            주문방법 변경하기
          </button>
        )}

          </>
        )}
      </div>

      {/* 실행 — 하단 탭바 위 고정 액션바. 예상 주문금액 + 구매/판매 인라인 확정 */}
      {!noSellable && (
        <div className="fixed bottom-[var(--bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background px-5 pt-3">
          {/* 예상 주문금액 — 유효해질 때 한 줄이 펼쳐지고, 값이 바뀌면 살짝 스왑(시세 틱 아님) */}
          <AnimatePresence initial={false}>
            {stickyValid && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
                }
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between pb-1.5 text-sm">
                  <span className="text-muted-foreground">예상 주문금액</span>
                  <span
                    key={stickyAmount}
                    className="ps-amount-swap font-numeric font-bold text-primary"
                  >
                    {fmtView(stickyAmount)}
                  </span>
                </div>
                {/* 소수점·조각 매수: 실제 예약 차감액(bestAsk × qty × 1+buffer). AMOUNT·매도·온주는 미표시. */}
                {side === "BUY" && tab !== "WHOLE" && inputMode !== "AMOUNT" && (() => {
                  const holdQty = tab === "PIECES"
                    ? new Decimal(selPieces).div(PIECES_PER_SHARE)
                    : new Decimal(qty);
                  const holdAmt = holdQty.times(calcPrice).times(1 + fracBuyBuffer);
                  if (holdAmt.lte(0)) return null;
                  return (
                    <div className="flex items-center justify-between pb-1.5 text-xs">
                      <span className="text-muted-foreground">예약 차감</span>
                      <span className="font-numeric text-muted-foreground">
                        약 {fmtView(holdAmt.toDecimalPlaces(amountDp).toNumber())}
                      </span>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
          {stickyValid && isOverLimit && (
            <p className="pb-2 text-center text-xs font-medium text-destructive">
              {overLimitMsg}
            </p>
          )}
          <Button
            onClick={() => submitForTab(side)}
            disabled={pending || !stickyValid || isOverLimit}
            className={cn(
              "mb-3 h-12 w-full text-base font-bold text-white",
              side === "BUY" ? "bg-up hover:bg-up/90" : "bg-down hover:bg-down/90",
              isOverLimit && "opacity-40",
            )}
          >
            {ctaLabel}
          </Button>
        </div>
      )}

      <TxnAuthDialog
        open={authSide !== null}
        onOpenChange={(o) => {
          if (!o) setAuthSide(null);
        }}
        onVerified={() => {
          const s = authSide;
          setAuthSide(null);
          if (s) submitForTab(s);
        }}
      />
    </>
  );
}
