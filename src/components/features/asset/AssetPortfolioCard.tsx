"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import Decimal from "decimal.js";
import { AnimatePresence, motion } from "framer-motion";
import { DonutChart } from "@/components/common/DonutChart";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { AssetPortfolioItem, PointSource } from "@/types/domain/asset";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useExternalHoldings } from "@/hooks/queries/useExternalHoldings";
import { usePortfolioSummary } from "@/hooks/queries/usePortfolioSummary";
import { useStockDetails } from "@/hooks/queries/useStockDetails";

// ── 색상 ─────────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  예금: "#3b82f6",
  적금: "#60a5fa",
  증권: "#8b5cf6",
  부동산: "#f97316",
  보험: "#14b8a6",
  연금: "#f59e0b",
  기타: "#6b7280",
};
const ACCOUNT_TYPE_TO_CATEGORY: Record<string, string> = {
  DEPOSIT: "예금",
  SAVINGS: "적금",
  PENSION: "연금",
  REAL_ESTATE: "부동산",
};
function getCategoryColor(c: string) {
  return CATEGORY_COLORS[c] ?? "#6b7280";
}
function generateSubColors(hex: string, n: number): string[] {
  if (n <= 1) return [hex];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * 0.55;
    const nr = Math.min(255, Math.round(r + (255 - r) * t));
    const ng = Math.min(255, Math.round(g + (255 - g) * t));
    const nb = Math.min(255, Math.round(b + (255 - b) * t));
    return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
  });
}

// ── 듀얼 차트 레이아웃 상수 ──────────────────────────────────────────────────
const S = 88;
const ST = 14;
const SMALL_POP = 4; // 작은 차트 선택 세그먼트 pop 거리
const L = 148;
const LT = 20;
const GAP = 28;
const DW = S + GAP + L;
const DH = L;
const S_TOP = (DH - S) / 2;

const SCX = S / 2;
const SCY = S_TOP + S / 2;
const LCX = S + GAP + L / 2;
const LCY = DH / 2;
const LR = L / 2;

// 오른쪽 차트 최상단·최하단
const RP1 = { x: LCX, y: LCY - LR };
const RP2 = { x: LCX, y: LCY + LR };

function calcConnectPoints(data: { value: number }[], idx: number) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const item = data[idx];
  if (!item) return null;
  const C = 2 * Math.PI * ((S - ST) / 2);
  const len = (item.value / total) * C;
  const half = (len / C) * Math.PI;
  const r = S / 2;
  const t1 = Math.PI / 2 - half;
  const t2 = Math.PI / 2 + half;
  // 세그먼트가 항상 우측(+x)으로 pop되므로 x에 SMALL_POP 더함
  return {
    p1: { x: SCX + r * Math.sin(t1) + SMALL_POP, y: SCY - r * Math.cos(t1) },
    p2: { x: SCX + r * Math.sin(t2) + SMALL_POP, y: SCY - r * Math.cos(t2) },
  };
}

function calcRotation(data: { value: number }[], idx: number): number {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return 0;
  const item = data[idx];
  if (!item) return 0;
  const C = 2 * Math.PI * ((S - ST) / 2);
  let off = 0;
  for (let i = 0; i < idx; i++) off += (data[i]?.value ?? 0) / total * C;
  const len = (item.value / total) * C;
  const thetaCenter = ((off + len / 2) / C) * 2 * Math.PI;
  return (Math.PI / 2 - thetaCenter) * (180 / Math.PI);
}

// ── 타입 ─────────────────────────────────────────────────────────────────────
type SubGroup = "own" | "ext" | "checking" | "point";
interface SubItem { name: string; amount: number; group?: SubGroup; company?: string }
interface AssetPortfolioCardProps {
  portfolio: AssetPortfolioItem[];
  pointSources?: PointSource[];
  /** 부모 카드 안에 박아 쓸 때 자체 카드 크롬(테두리·배경·패딩) 제거 */
  bare?: boolean;
}
// 드릴다운 그룹 헤더 라벨(증권: 자체/타사, 기타: 입출금/포인트)
const GROUP_LABELS: Record<SubGroup, string> = {
  own: "신한투자증권",
  ext: "타사",
  checking: "입출금",
  point: "포인트",
};

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────
export function AssetPortfolioCard({
  portfolio,
  pointSources = [],
  bare = false,
}: AssetPortfolioCardProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const maskId = useId();

  const isDrillDown = selectedIdx !== null;
  const selectedCategory =
    selectedIdx !== null ? (portfolio[selectedIdx]?.category ?? null) : null;

  const needsBank = isDrillDown && selectedCategory !== "증권";
  const needsSec  = isDrillDown && selectedCategory === "증권";

  const { data: bankAccounts, isFetching: bankFetching } = useBankAccounts(needsBank);
  const { data: externalHoldings, isFetching: secFetching } = useExternalHoldings(needsSec);

  // 신투(자체 증권계좌) 보유 — 증권 드릴다운에서만 조회. 종목명은 useStockDetails로 보강.
  const { data: portfolioSummary, isFetching: ownFetching } = usePortfolioSummary(needsSec);
  const ownHoldings = useMemo(
    () =>
      (portfolioSummary?.holdings ?? []).filter(
        (h) => h.priced && h.evalKrw !== null && h.evalKrw > 0,
      ),
    [portfolioSummary],
  );
  const ownCodes = useMemo(() => ownHoldings.map((h) => h.stockCode), [ownHoldings]);
  const ownDetails = useStockDetails(needsSec ? ownCodes : []);
  const ownNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    ownCodes.forEach((c, i) => {
      const n = ownDetails[i]?.data?.stockName;
      if (n) m.set(c, n);
    });
    return m;
  }, [ownCodes, ownDetails]);

  const subLoading =
    (needsBank && bankFetching) || (needsSec && (secFetching || ownFetching));

  const subItems: SubItem[] = useMemo(() => {
    if (!selectedCategory) return [];
    if (selectedCategory === "증권") {
      // 신한투자증권(자체) → 타사(외부, 증권사별) 순. 타사는 회사 단위로 와서 그대로 펼침.
      const own: SubItem[] = ownHoldings.map((h) => ({
        name: ownNameByCode.get(h.stockCode) ?? h.stockCode,
        amount: h.evalKrw as number,
        group: "own",
      }));
      const ext: SubItem[] = (externalHoldings ?? []).flatMap((h) =>
        h.stocks.map((s) => ({
          name: s.stockName,
          amount: s.evaluated,
          group: "ext",
          company: h.companyName,
        })),
      );
      return [...own, ...ext];
    }
    if (selectedCategory === "기타") {
      // 입출금(기타 계좌) → 포인트(출처별) 순. 두 그룹으로 나눠 표기.
      const specific = new Set(Object.keys(ACCOUNT_TYPE_TO_CATEGORY));
      const checking: SubItem[] = (bankAccounts ?? [])
        .filter((a) => !specific.has(a.accountType) && a.balance > 0)
        .map((a) => ({
          name: `${a.bankName} ${a.accountName}`,
          amount: a.balance,
          group: "checking",
        }));
      const pts: SubItem[] = pointSources
        .filter((p) => p.balance > 0)
        .map((p) => ({ name: p.pointName, amount: p.balance, group: "point" }));
      return [...checking, ...pts];
    }
    if (bankAccounts) {
      const types = Object.entries(ACCOUNT_TYPE_TO_CATEGORY)
        .filter(([, c]) => c === selectedCategory)
        .map(([t]) => t);
      return bankAccounts
        .filter((a) => types.includes(a.accountType) && a.balance > 0)
        .map((a) => ({ name: `${a.bankName} ${a.accountName}`, amount: a.balance }));
    }
    return [];
  }, [selectedCategory, bankAccounts, externalHoldings, ownHoldings, ownNameByCode, pointSources]);

  // 드릴다운 그룹별 소계(증권: 자체/타사, 기타: 입출금/포인트) + 타사 증권사별 합(서브헤더용).
  // 금액 합산은 Decimal로 — 포맷 경계에서만 toNumber().
  const { groupTotals, companyTotals } = useMemo(() => {
    const groupTotals = new Map<SubGroup, Decimal>();
    const companyTotals = new Map<string, Decimal>();
    for (const it of subItems) {
      if (it.group) {
        groupTotals.set(it.group, (groupTotals.get(it.group) ?? new Decimal(0)).plus(it.amount));
      }
      if (it.group === "ext" && it.company) {
        companyTotals.set(
          it.company,
          (companyTotals.get(it.company) ?? new Decimal(0)).plus(it.amount),
        );
      }
    }
    return { groupTotals, companyTotals };
  }, [subItems]);

  useEffect(() => {
    const dismiss = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node))
        setSelectedIdx(null);
    };
    document.addEventListener("click", dismiss);
    return () => document.removeEventListener("click", dismiss);
  }, []);

  const handleSelect = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIdx((prev) => (prev === idx ? null : idx));
  };

  const donutData = portfolio.map((item) => ({
    label: item.category,
    value: item.amount,
    color: getCategoryColor(item.category),
  }));

  const selected = selectedIdx !== null ? portfolio[selectedIdx] : null;
  const totalAmount = portfolio.reduce((s, i) => s + i.amount, 0);

  const subTotal = useMemo(
    () => subItems.reduce((s, i) => s.plus(i.amount), new Decimal(0)),
    [subItems],
  );
  const catColor = getCategoryColor(selectedCategory ?? "");
  const subColors = useMemo(
    () => generateSubColors(catColor, subItems.length),
    [catColor, subItems.length],
  );
  const subDonutData = subItems.map((item, i) => ({
    label: item.name,
    value: item.amount,
    color: subColors[i] ?? "#6b7280",
  }));

  const connectPts = useMemo(
    () => (selectedIdx !== null ? calcConnectPoints(donutData, selectedIdx) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIdx, totalAmount],
  );

  const smallChartRotation = useMemo(
    () => (selectedIdx !== null ? calcRotation(donutData, selectedIdx) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIdx, totalAmount],
  );

  return (
    <div
      ref={cardRef}
      className={bare ? "" : "rounded-2xl border border-border bg-card p-5"}
      onClick={() => setSelectedIdx(null)}
    >
      {/* ── 차트 영역 ── */}
      <div className="relative py-1" style={{ height: 196 }}>
        <AnimatePresence>
          {!isDrillDown && (
            <motion.div
              key="single"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <DonutChart
                data={donutData}
                size={180}
                thickness={26}
                onSegmentClick={handleSelect}
                popDistance={12}
                centerLabel={
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">순자산</p>
                    <p className="text-sm font-bold text-foreground">
                      {new Decimal(totalAmount).dividedBy(10000).toFixed(0)}만원
                    </p>
                  </div>
                }
              />
            </motion.div>
          )}

          {isDrillDown && (
            <motion.div
              key="dual"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="relative" style={{ width: DW, height: DH }}>
                <div className="absolute" style={{ top: S_TOP, left: 0 }}>
                  <DonutChart
                    data={donutData}
                    size={S}
                    thickness={ST}
                    selectedIndex={selectedIdx ?? undefined}
                    onSegmentClick={handleSelect}
                    popDistance={SMALL_POP}
                    rotate={smallChartRotation}
                    centerLabel={
                      <div className="text-center">
                        {selected && (
                          <>
                            <p className="text-[9px] font-semibold" style={{ color: catColor }}>
                              {selected.category}
                            </p>
                            <p className="text-[11px] font-bold text-foreground">
                              {selected.ratio.toFixed(1)}%
                            </p>
                          </>
                        )}
                      </div>
                    }
                  />
                </div>

                <motion.div
                  key="sub-chart"
                  className="absolute"
                  style={{ top: 0, left: S + GAP }}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                >
                  {subItems.length > 0 ? (
                    <DonutChart
                      data={subDonutData}
                      size={L}
                      thickness={LT}
                      centerLabel={
                        <div className="text-center">
                          <p className="text-[10px] font-semibold" style={{ color: catColor }}>
                            {selectedCategory}
                          </p>
                          <p className="text-xs font-bold text-foreground">
                            {subItems.length}개 항목
                          </p>
                        </div>
                      }
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center rounded-full bg-muted/30"
                      style={{ width: L, height: L }}
                    >
                      <p className="text-xs text-muted-foreground">
                        {subLoading ? "로딩 중…" : "내역 없음"}
                      </p>
                    </div>
                  )}
                </motion.div>

                {connectPts && (
                  <svg
                    className="pointer-events-none absolute inset-0"
                    width={DW}
                    height={DH}
                    overflow="visible"
                  >
                    <defs>
                      <mask id={maskId}>
                        <rect x="0" y="0" width={DW} height={DH} fill="white" />
                        {/* 왼쪽·오른쪽 차트 원 내부 제외 */}
                        <circle cx={SCX} cy={SCY} r={S / 2} fill="black" />
                        <circle cx={LCX} cy={LCY} r={LR} fill="black" />
                      </mask>
                    </defs>
                    <g mask={`url(#${maskId})`}>
                      <polygon
                        points={`${connectPts.p1.x},${connectPts.p1.y} ${connectPts.p2.x},${connectPts.p2.y} ${RP2.x},${RP2.y} ${RP1.x},${RP1.y}`}
                        fill={`${catColor}18`}
                        stroke="none"
                      />
                      <line
                        x1={connectPts.p1.x} y1={connectPts.p1.y}
                        x2={RP1.x} y2={RP1.y}
                        stroke={`${catColor}55`}
                        strokeWidth={1}
                        strokeDasharray="3 2"
                      />
                      <line
                        x1={connectPts.p2.x} y1={connectPts.p2.y}
                        x2={RP2.x} y2={RP2.y}
                        stroke={`${catColor}55`}
                        strokeWidth={1}
                        strokeDasharray="3 2"
                      />
                    </g>
                  </svg>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 카테고리 칩 선택 ── */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {portfolio.map((item, idx) => {
          const color = getCategoryColor(item.category);
          const isSelected = selectedIdx === idx;
          return (
            <button
              key={item.category}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${item.category} ${item.ratio.toFixed(1)}%`}
              onClick={(e) => handleSelect(idx, e)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl py-2 text-center transition-all duration-200 active:scale-[0.94]",
                isSelected ? "" : "bg-muted/60 text-muted-foreground",
              )}
              style={
                isSelected
                  ? { backgroundColor: `${color}18`, border: `1.5px solid ${color}` }
                  : undefined
              }
            >
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium" style={isSelected ? { color } : undefined}>
                  {item.category}
                </span>
              </div>
              <span className="text-[11px] font-semibold" style={isSelected ? { color } : undefined}>
                {item.ratio.toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 선택 카테고리 상세 ── */}
      <AnimatePresence>
        {isDrillDown && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="mt-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: catColor }} />
                <span className="text-sm font-semibold text-foreground">{selectedCategory}</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {formatKRW(selected?.amount ?? 0)}
              </span>
            </div>

            {subLoading ? (
              <p className="py-3 text-center text-xs text-muted-foreground">로딩 중…</p>
            ) : subItems.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">내역 없음</p>
            ) : (
              <div className="space-y-1">
                {subItems.map((subItem, i) => {
                  const prev = subItems[i - 1];
                  const ratio = subTotal.gt(0)
                    ? new Decimal(subItem.amount).div(subTotal).times(100)
                    : new Decimal(0);
                  // 그룹 헤더(증권: 신한투자증권/타사, 기타: 입출금/포인트) — 그룹이 바뀌는 첫 항목 앞
                  const showGroup = !!subItem.group && subItem.group !== prev?.group;
                  const groupLabel = subItem.group ? GROUP_LABELS[subItem.group] : "";
                  const groupTotal = subItem.group ? groupTotals.get(subItem.group) : undefined;
                  // 타사 내부 증권사 서브헤더 — 회사가 바뀌는 첫 항목 앞
                  const showCompany =
                    subItem.group === "ext" &&
                    !!subItem.company &&
                    (prev?.group !== "ext" || prev?.company !== subItem.company);
                  return (
                    <Fragment
                      key={`${subItem.group ?? ""}-${subItem.company ?? ""}-${subItem.name}-${i}`}
                    >
                      {showGroup && (
                        <div className="flex items-center justify-between px-1 pb-1 pt-2.5">
                          <span className="text-xs font-bold text-foreground">{groupLabel}</span>
                          <span className="font-numeric text-[11px] font-semibold text-muted-foreground">
                            {formatKRW(groupTotal?.toNumber() ?? 0)}
                          </span>
                        </div>
                      )}
                      {showCompany && (
                        <div className="flex items-center justify-between px-1.5 pb-0.5 pt-1.5">
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            <span className="size-1 rounded-full bg-muted-foreground/40" />
                            {subItem.company}
                          </span>
                          <span className="font-numeric text-[10px] text-muted-foreground">
                            {formatKRW(companyTotals.get(subItem.company ?? "")?.toNumber() ?? 0)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: subColors[i] }}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                          {subItem.name}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-foreground">
                          {formatKRW(subItem.amount)}
                        </span>
                        <span className="w-9 shrink-0 text-right text-[10px] text-muted-foreground">
                          {ratio.toFixed(1)}%
                        </span>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
