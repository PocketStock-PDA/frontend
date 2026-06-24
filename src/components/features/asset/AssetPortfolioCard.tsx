"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Decimal from "decimal.js";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { DonutChart } from "@/components/common/DonutChart";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { AssetPortfolioItem } from "@/types/domain/asset";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useExternalHoldings } from "@/hooks/queries/useExternalHoldings";

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
const S = 108;
const ST = 16;
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

const RP1 = {
  x: LCX + LR * Math.sin(-Math.PI / 3),
  y: LCY - LR * Math.cos(-Math.PI / 3),
};
const RP2 = {
  x: LCX + LR * Math.sin((4 * Math.PI) / 3),
  y: LCY - LR * Math.cos((4 * Math.PI) / 3),
};

function calcConnectPoints(data: { value: number }[], idx: number) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const C = 2 * Math.PI * ((S - ST) / 2);
  const len = (data[idx]!.value / total) * C;
  const half = (len / C) * Math.PI;
  const r = S / 2;
  const t1 = Math.PI / 2 - half;
  const t2 = Math.PI / 2 + half;
  return {
    p1: { x: SCX + r * Math.sin(t1), y: SCY - r * Math.cos(t1) },
    p2: { x: SCX + r * Math.sin(t2), y: SCY - r * Math.cos(t2) },
  };
}

function calcRotation(data: { value: number }[], idx: number): number {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return 0;
  const C = 2 * Math.PI * ((S - ST) / 2);
  let off = 0;
  for (let i = 0; i < idx; i++) off += (data[i]!.value / total) * C;
  const len = (data[idx]!.value / total) * C;
  const θCenter = ((off + len / 2) / C) * 2 * Math.PI;
  return (Math.PI / 2 - θCenter) * (180 / Math.PI);
}

// ── 타입 ─────────────────────────────────────────────────────────────────────
interface SubItem { name: string; amount: number }
interface AssetPortfolioCardProps { portfolio: AssetPortfolioItem[] }

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────
export function AssetPortfolioCard({ portfolio }: AssetPortfolioCardProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isDrillDown = selectedIdx !== null;
  const selectedCategory =
    selectedIdx !== null ? (portfolio[selectedIdx]?.category ?? null) : null;

  const needsBank = isDrillDown && selectedCategory !== "증권";
  const needsSec  = isDrillDown && selectedCategory === "증권";

  const { data: bankAccounts, isFetching: bankFetching } = useBankAccounts(needsBank);
  const { data: externalHoldings, isFetching: secFetching } = useExternalHoldings(needsSec);

  const subLoading = (needsBank && bankFetching) || (needsSec && secFetching);

  const subItems: SubItem[] = useMemo(() => {
    if (!selectedCategory) return [];
    if (selectedCategory === "증권" && externalHoldings) {
      return externalHoldings.flatMap((h) =>
        h.stocks.map((s) => ({ name: s.stockName, amount: s.evaluated })),
      );
    }
    if (bankAccounts) {
      if (selectedCategory === "기타") {
        const specific = new Set(Object.keys(ACCOUNT_TYPE_TO_CATEGORY));
        return bankAccounts
          .filter((a) => !specific.has(a.accountType) && a.balance > 0)
          .map((a) => ({ name: `${a.bankName} ${a.accountName}`, amount: a.balance }));
      }
      const types = Object.entries(ACCOUNT_TYPE_TO_CATEGORY)
        .filter(([, c]) => c === selectedCategory)
        .map(([t]) => t);
      return bankAccounts
        .filter((a) => types.includes(a.accountType) && a.balance > 0)
        .map((a) => ({ name: `${a.bankName} ${a.accountName}`, amount: a.balance }));
    }
    return [];
  }, [selectedCategory, bankAccounts, externalHoldings]);

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

  const subTotal = subItems.reduce((s, i) => s + i.amount, 0);
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
      className="rounded-2xl border border-border bg-card p-5"
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
                    popDistance={4}
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
                  transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.08 }}
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
                  </svg>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 카테고리 아코디언 리스트 ── */}
      <div className="mt-3 space-y-0.5">
        {portfolio.map((item, idx) => {
          const color = getCategoryColor(item.category);
          const isSelected = selectedIdx === idx;
          return (
            <div key={item.category} className="overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={(e) => handleSelect(idx, e)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200",
                  isSelected ? "bg-muted/80" : "hover:bg-muted/40",
                )}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="flex-1 text-sm font-medium text-foreground">{item.category}</span>
                <span className="text-sm font-bold text-foreground">{formatKRW(item.amount)}</span>
                <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                  {item.ratio.toFixed(1)}%
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    isSelected && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 px-3 pb-2.5 pt-1">
                      {subLoading ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">로딩 중…</p>
                      ) : subItems.length === 0 ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">내역 없음</p>
                      ) : (
                        subItems.map((subItem, i) => {
                          const ratio = subTotal > 0 ? (subItem.amount / subTotal) * 100 : 0;
                          return (
                            <div
                              key={subItem.name}
                              className="flex items-center gap-2.5 rounded-lg bg-background/60 px-2.5 py-2"
                            >
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
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
