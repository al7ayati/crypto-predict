import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined, CircleHelp } from "lucide-react";
import { ANALYTICS_CONFIG } from "../config/analytics.js";
import { BINANCE_MARKET_DATA_URL, fetchPriceHistory, MARKET_ASSETS, toDailyPrices } from "../services/marketData";
import { backtestMovingAverage, ROUND_TRIP_FEE_PCT, summarizeBacktest } from "../services/backtest";
import { formatUtcTimestamp } from "../utils/formatting";

const { backtest } = ANALYTICS_CONFIG;
const startDate = () => new Date(Date.now() - backtest.historyLookbackCalendarDays * 86_400_000).toISOString().slice(0, 10);
const endDate = () => new Date().toISOString().slice(0, 10);

function EquityCurveTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="backtest-equity-tooltip">
    <strong>{label} UTC</strong>
    {payload.map((entry) => <span key={entry.dataKey} style={{ color: entry.color }}>
      <i style={{ backgroundColor: entry.color }} />
      {entry.name}: {Number.isFinite(entry.value) ? `${Number(entry.value).toFixed(2)}%` : "Unavailable"}
    </span>)}
  </div>;
}

export default function BacktestPage() {
  const [period, setPeriod] = useState(backtest.periodsDays.at(-1));
  const [assetFilter, setAssetFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [showBuyAndHold, setShowBuyAndHold] = useState(false);
  const [dateRange, setDateRange] = useState(() => ({ from: startDate(), to: endDate() }));
  const { from, to } = dateRange;
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const next = { from: startDate(), to: endDate() };
      setDateRange((current) => current.from === next.from && current.to === next.to ? current : next);
    }, backtest.refreshIntervalMs);
    return () => window.clearInterval(intervalId);
  }, []);
  const historyQuery = useQuery({
    queryKey: ["backtest-history", from, to],
    queryFn: async ({ signal }) => {
      const settled = await Promise.allSettled(MARKET_ASSETS.map(async (asset) => {
        const observations = await fetchPriceHistory(asset.symbol, from, to, signal);
        const daily = toDailyPrices(observations).filter((candle) => candle.candleCloseTime < Date.now());
        return { asset, daily };
      }));
      const loaded = settled.filter((item) => item.status === "fulfilled").map((item) => item.value);
      const failures = settled.filter((item) => item.status === "rejected");
      if (!loaded.length) throw failures[0]?.reason || new Error("No Binance daily candles were available.");
      return {
        loaded,
        failures: failures.length,
        fetchedAt: new Date().toISOString(),
      };
    },
    refetchInterval: backtest.refreshIntervalMs,
  });
  const loaded = historyQuery.data?.loaded || [];
  const fetchedAt = historyQuery.data?.fetchedAt || null;
  const state = historyQuery.isPending && !historyQuery.data ? "loading" : historyQuery.isError && !historyQuery.data ? "error" : historyQuery.data?.failures ? "partial" : "ready";
  const error = (historyQuery.isError ? historyQuery.error?.message : "") || (historyQuery.data?.failures
    ? `Binance candle history could not be loaded for ${historyQuery.data.failures} asset${historyQuery.data.failures === 1 ? "" : "s"}; results include only successfully loaded assets.`
    : "");

  const selectedResults = useMemo(() => loaded
    .filter(({ asset }) => assetFilter === "All" || asset.symbol === assetFilter)
    .map(({ asset, daily }) => {
      try {
        return { asset, daily, result: backtestMovingAverage(asset.symbol, daily, period), error: "" };
      } catch (calculationError) {
        return { asset, daily, result: null, error: calculationError.message };
      }
    })
    .filter(({ result }) => Boolean(result)), [assetFilter, loaded, period]);
  const skippedAssets = loaded.filter(({ asset }) => assetFilter === "All" || asset.symbol === assetFilter).length - selectedResults.length;
  const summary = useMemo(() => summarizeBacktest(selectedResults.map(({ result }) => result)), [selectedResults]);
  const filteredTrades = summary.trades.filter((trade) => outcomeFilter === "All" || (trade.pnlPct >= 0 ? "Profit" : "Loss") === outcomeFilter);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredTrades.length / pageSize));
  const page = Math.min(currentPage, pageCount);
  const paginatedTrades = filteredTrades.slice((page - 1) * pageSize, page * pageSize);
  const setTradeAssetFilter = (value) => {
    setAssetFilter(value);
    setCurrentPage(1);
  };
  const setTradeOutcomeFilter = (value) => {
    setOutcomeFilter(value);
    setCurrentPage(1);
  };
  const metrics = [
    { label: `Net strategy return · ${period}D`, value: `${summary.totalReturnPct >= 0 ? "+" : ""}${summary.totalReturnPct.toFixed(2)}%`, note: "Equal-weight portfolio · after modeled fees" },
    { label: "Buy & hold benchmark", value: `${summary.buyHoldTotalReturnPct >= 0 ? "+" : ""}${summary.buyHoldTotalReturnPct.toFixed(2)}%`, note: "Passive equal-weight return · no fees" },
    { label: "Maximum drawdown", value: `${summary.maxDrawdownPct.toFixed(2)}%`, note: "Largest peak-to-trough decline" },
    { label: "Closed hypothetical trades", value: String(summary.tradeCount), note: "Includes liquidation at the period end" },
    { label: "Winning trades", value: summary.tradeCount ? `${summary.winRatePct.toFixed(1)}%` : "—", note: "Share of closed hypothetical trades" },
  ];

  return <div className="space-y-6">
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ChartNoAxesCombined size={21} /></span><div><h2 className="text-lg font-bold text-slate-900">Historical strategy replay</h2><p className="mt-1 text-xs text-slate-500">Hypothetical long-only {backtest.movingAveragePeriod}-day moving-average rule using completed Binance Spot daily closes</p></div></div>
      <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500"><span>Period</span><select value={period} onChange={(event) => setPeriod(Number(event.target.value))} aria-label="Backtest period" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700">{backtest.periodsDays.map((days) => <option key={days} value={days}>{days}D</option>)}</select></label><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100"><CircleHelp size={13} />Price-based simulation</span></div>
    </section>

    {state === "loading" && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading up to five Binance daily candle series…</p>}
    {state === "error" && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">{error} No simulated results are shown without historical prices.</p>}
    {state !== "loading" && state !== "error" && selectedResults.length === 0 && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">There are not enough valid completed daily candles to calculate this strategy for the selected asset and period. No simulated performance is displayed.</p>}
    {state !== "loading" && state !== "error" && selectedResults.length > 0 && <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map((metric, index) => <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-slate-500">{metric.label}</p><p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{metric.value}</p><p className="mt-1.5 text-[11px] text-slate-400">{metric.note}</p></article>)}</section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4"><h3 className="text-base font-bold text-slate-900">Weekly portfolio return</h3><p className="mt-1 text-xs text-slate-500">Compounded equal-weight strategy return for each UTC week · percent</p></div>
        <div className="h-[260px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.weeklyReturns} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke="#edf1f7" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#8290a5" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8290a5" }} tickFormatter={(value) => `${value}%`} width={45} /><ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.25} /><Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, "Weekly return"]} contentStyle={{ borderRadius: 12, borderColor: "#e5ebf4", fontSize: 12 }} /><Bar dataKey="returnPct" name="Weekly return" radius={[5, 5, 0, 0]} maxBarSize={38}>{summary.weeklyReturns.map((entry) => <Cell key={entry.week} fill={entry.returnPct >= 0 ? "#176b44" : "#b42335"} />)}</Bar></BarChart></ResponsiveContainer></div>
        <p className="mt-3 text-[10px] leading-5 text-slate-400">A buy signal occurs when the daily observed price closes above its trailing {backtest.movingAveragePeriod}-observation simple moving average; a sell signal occurs below it. Signals take effect after the observed close, with an idealized close-price fill. Open positions are liquidated at the final close. A {(ROUND_TRIP_FEE_PCT / 2).toFixed(1)}% fee per fill is modeled ({ROUND_TRIP_FEE_PCT.toFixed(1)}% round trip). The Buy &amp; Hold benchmark is passive, starts at the same first date per asset, and does not include fees. No slippage, spreads, taxes, or risk-adjusted returns are modeled.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="text-base font-bold text-slate-900">Cumulative portfolio return</h3><p className="mt-1 text-xs text-slate-500">Equal-weight daily portfolio return compounded over the selected period · percent</p></div>
          <label className="backtest-benchmark-toggle"><input type="checkbox" checked={showBuyAndHold} onChange={(event) => setShowBuyAndHold(event.target.checked)} /><span>Compare Buy &amp; Hold</span></label>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={summary.equityCurve} margin={{ top: 8, right: 12, left: 2, bottom: 0 }}>
              <CartesianGrid stroke="#edf1f7" strokeDasharray="4 5" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#8290a5" }} minTickGap={28} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8290a5" }} tickFormatter={(value) => `${Number(value).toFixed(0)}%`} width={48} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.25} />
              <Tooltip content={<EquityCurveTooltip />} />
              <Line type="monotone" dataKey="modelReturnPct" name="Model Strategy" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              {showBuyAndHold && <Line type="monotone" dataKey="buyHoldReturnPct" name="Buy & Hold" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[10px] font-semibold">
          <span className="text-blue-700">Model Strategy: {summary.totalReturnPct >= 0 ? "+" : ""}{summary.totalReturnPct.toFixed(2)}%</span>
          {showBuyAndHold && <span className="text-amber-700">Buy &amp; Hold: {summary.buyHoldTotalReturnPct >= 0 ? "+" : ""}{summary.buyHoldTotalReturnPct.toFixed(2)}%</span>}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter trades by asset">
            <span className="mr-1 text-[10px] font-semibold text-slate-500">Asset</span>
            {[["All", "All Assets"], ...MARKET_ASSETS.map(({ symbol }) => [symbol, symbol])].map(([value, label]) => <button key={value} type="button" className={`backtest-filter-pill${assetFilter === value ? " is-active" : ""}`} aria-pressed={assetFilter === value} onClick={() => setTradeAssetFilter(value)}>{label}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter trades by result">
            <span className="mr-1 text-[10px] font-semibold text-slate-500">Result</span>
            {[["All", "All Results"], ["Profit", "Profitable"], ["Loss", "Losses"]].map(([value, label]) => <button key={value} type="button" className={`backtest-filter-pill${outcomeFilter === value ? " is-active" : ""}`} aria-pressed={outcomeFilter === value} onClick={() => setTradeOutcomeFilter(value)}>{label}</button>)}
          </div>
        </div>
        <div className="overflow-x-auto"><table className="backtest-trades-table w-full min-w-[680px] border-collapse text-left"><thead><tr className="bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-6 py-3.5">Exit date (UTC)</th><th className="px-4 py-3.5">Asset</th><th className="px-4 py-3.5">Entry date (UTC)</th><th className="px-4 py-3.5">Entry → exit (USDT)</th><th className="px-6 py-3.5 text-right">Net simulated P&amp;L</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedTrades.map((trade) => { const profitable = trade.pnlPct >= 0; return <tr key={`${trade.asset}-${trade.entryDate}-${trade.date}`} className={`backtest-trade-row ${profitable ? "bg-emerald-50/30" : "bg-rose-50/30"}`}><td data-label="Exit date (UTC)" className="px-6 py-4 text-xs text-slate-600">{trade.date}</td><td data-label="Asset" className="px-4 py-4 text-xs font-bold text-slate-800">{trade.asset}</td><td data-label="Entry date (UTC)" className="px-4 py-4 text-xs text-slate-600">{trade.entryDate}</td><td data-label="Entry → exit (USDT)" className="px-4 py-4 text-xs tabular-nums text-slate-600">{trade.entryPrice.toLocaleString("en-US", { maximumFractionDigits: 8 })} → {trade.exitPrice.toLocaleString("en-US", { maximumFractionDigits: 8 })}</td><td data-label="Net simulated P&amp;L" className={`px-6 py-4 text-right text-xs font-bold tabular-nums ${profitable ? "text-emerald-700" : "text-rose-700"}`}><span className="inline-flex items-center gap-1">{profitable ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{profitable ? "+" : ""}{trade.pnlPct.toFixed(2)}%</span></td></tr>; })}{!filteredTrades.length && <tr><td colSpan={5} className="px-6 py-10 text-center text-xs text-slate-500">No closed trades match these filters.</td></tr>}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:px-6">
          <span className="text-[10px] text-slate-500">{filteredTrades.length ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredTrades.length)} of ${filteredTrades.length} trades` : "No trades to display"}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="backtest-page-button" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Previous</button>
            <span className="min-w-[64px] text-center text-[10px] font-semibold text-slate-500">Page {page} of {pageCount}</span>
            <button type="button" className="backtest-page-button" onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount}>Next</button>
          </div>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-[10px] leading-5 text-slate-400 sm:px-6" role={error ? "status" : undefined}>{error ? `Showing cached results; data refresh note: ${error} ` : ""}Source: Binance Spot API · fetched {formatUtcTimestamp(fetchedAt)} · {selectedResults.length} of {assetFilter === "All" ? MARKET_ASSETS.length : 1} selected assets usable{skippedAssets ? `; ${skippedAssets} skipped for insufficient history` : ""}. Results use completed UTC daily candles and USDT prices; fees are modeled, not actual exchange fees. <a href={BINANCE_MARKET_DATA_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">Data provider</a></p>
      </section>
    </>}
  </div>;
}
