import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BINANCE_MARKET_DATA_URL, fetchPriceHistory, toDailyPrices } from "../services/marketData";
import { formatUtcTimestamp } from "../utils/formatting";

const HORIZONS = [{ label: "24H", days: 1 }, { label: "7D", days: 7 }, { label: "30D", days: 30 }];
const formatPrice = (value) => new Intl.NumberFormat("en-US", {
  minimumFractionDigits: value < 1 ? 4 : 2,
  maximumFractionDigits: value < 1 ? 8 : 2,
}).format(value) + " USDT";
const formatUsdPrice = (value) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: value < 1 ? 4 : 2,
  maximumFractionDigits: value < 1 ? 8 : 2,
}).format(value);

function calculateIndicators(rows) {
  return rows.map((point, index) => {
    const history20 = rows.slice(Math.max(0, index - 19), index + 1).map((row) => row.actual);
    const mean20 = history20.reduce((sum, value) => sum + value, 0) / history20.length;
    const std20 = Math.sqrt(history20.reduce((sum, value) => sum + (value - mean20) ** 2, 0) / history20.length);
    const changes = rows.slice(Math.max(1, index - 13), index + 1).map((row, offset) => row.actual - rows[Math.max(1, index - 13) + offset - 1].actual);
    const gains = changes.reduce((sum, change) => sum + Math.max(change, 0), 0);
    const losses = changes.reduce((sum, change) => sum + Math.max(-change, 0), 0);
    const rsi = changes.length ? losses === 0 ? 100 : 100 - 100 / (1 + gains / losses) : null;
    const ema = (period) => {
      const multiplier = 2 / (period + 1);
      return rows.slice(0, index + 1).reduce((value, row, rowIndex) => rowIndex === 0 ? row.actual : row.actual * multiplier + value * (1 - multiplier), 0);
    };
    return { ...point, ema20: ema(20), ema50: ema(50), bollingerUpper: mean20 + 2 * std20, bollingerLower: mean20 - 2 * std20, rsi };
  });
}

function formatHistoryLabel(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export default function PredictionPage({ assetData }) {
  const [horizon, setHorizon] = useState(HORIZONS[1]);
  const [visibleIndicators, setVisibleIndicators] = useState([]);
  const [range] = useState(() => ({
    from: new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  }));
  const historyQuery = useQuery({
    queryKey: ["market-history", assetData.symbol, range.from, range.to],
    queryFn: async ({ signal }) => {
      const rows = await fetchPriceHistory(assetData.symbol, range.from, range.to, signal);
      const daily = toDailyPrices(rows).filter((candle) => candle.candleCloseTime < Date.now());
      if (daily.length < 8) throw new Error("At least eight completed daily candles are required for the baseline calculation.");
      return daily;
    },
    refetchInterval: 5 * 60 * 1000,
  });
  const observations = historyQuery.data || [];
  const state = historyQuery.isPending && !historyQuery.data ? "loading" : historyQuery.isError && !historyQuery.data ? "error" : "ready";
  const error = historyQuery.error?.message || "";
  const fetchedAt = historyQuery.dataUpdatedAt ? new Date(historyQuery.dataUpdatedAt).toISOString() : null;

  const analysis = useMemo(() => {
    if (!observations.length) return null;
    const actualRows = observations.map((point, index) => ({
      label: formatHistoryLabel(point.date), timestamp: point.timestamp, date: point.date, actual: point.price,
      forecast: null,
    }));
    const last = observations.at(-1);
    const dailyLogReturns = observations.slice(-8).slice(1).map((point, index) => Math.log(point.price / observations.slice(-8)[index].price));
    const meanDailyLogReturn = dailyLogReturns.reduce((sum, value) => sum + value, 0) / dailyLogReturns.length;
    const futureRows = Array.from({ length: horizon.days }, (_, index) => {
      const day = index + 1;
      return { label: `+${day}d`, timestamp: last.timestamp + day * 86_400_000, actual: null, forecast: last.price * Math.exp(meanDailyLogReturn * day) };
    });
    actualRows.at(-1).forecast = last.price;
    const indicators = calculateIndicators(actualRows);
    const chart = indicators.concat(futureRows.map((point) => ({ ...point, ema20: null, ema50: null, bollingerUpper: null, bollingerLower: null, rsi: null })));
    const meanReturnPct = (Math.exp(meanDailyLogReturn) - 1) * 100;
    const hasCurrentQuote = Number.isFinite(assetData.currentPrice);
    return { chart, lastPrice: hasCurrentQuote ? assetData.currentPrice : last.price, lastPriceQuote: hasCurrentQuote ? assetData.currentPriceQuote : "USDT", historyPrice: last.price, rsi: indicators.at(-1)?.rsi, meanReturnPct,
      targetPrice: last.price * Math.exp(meanDailyLogReturn * horizon.days), estimatedChangePct: (Math.exp(meanDailyLogReturn * horizon.days) - 1) * 100,
      observationDate: last.date };
  }, [assetData.currentPrice, horizon.days, observations]);

  const toggleIndicator = (indicator) => setVisibleIndicators((current) => current.includes(indicator)
    ? current.filter((value) => value !== indicator)
    : [...current, indicator]);

  const dataLine = (dataKey, name, color, dashed = false) => <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={1.5} strokeDasharray={dashed ? "5 4" : undefined} dot={false} connectNulls />;

  return <div className="space-y-6">
    <section className="rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-blue-950 p-5 text-white shadow-lg shadow-blue-950/10 sm:p-7">
      <span className="inline-flex rounded-full border border-blue-300/20 bg-white/[.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-blue-100">Historical trend baseline</span>
      <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{assetData.name} scenario</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/70">A transparent extrapolation of the mean daily log return from the latest seven daily observations. The projected line is a calculation from past data, not a fact, AI output, or trading advice.</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-100/60">Projection horizon</span>
        <div className="flex rounded-xl border border-white/15 bg-white/10 p-1" role="group" aria-label="Projection horizon">
          {HORIZONS.map((option) => <button key={option.label} type="button" onClick={() => setHorizon(option)} aria-pressed={horizon.label === option.label} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${horizon.label === option.label ? "bg-white text-navy-950" : "text-blue-100/75 hover:text-white"}`}>{option.label}</button>)}
        </div>
      </div>
    </section>

    {state === "loading" && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading Binance daily candles…</p>}
    {state === "error" && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">{error} No forecast is shown without source data.</p>}
    {state === "ready" && analysis && <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(270px,.8fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">Observed prices and baseline</h3><p className="mt-1 text-xs text-slate-500">Completed Binance Spot daily close · {assetData.symbol}/USDT · UTC</p></div><div className="flex items-center gap-4 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-600" />Observed history</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-violet-500" />Trend baseline</span></div></div>
        <div className="h-[290px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={analysis.chart} margin={{ top: 10, right: 12, left: 3, bottom: 3 }}>
          <CartesianGrid stroke="#edf1f7" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#8290a5" }} minTickGap={24} /><YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8290a5" }} tickFormatter={(value) => value < 1 ? `${Number(value).toFixed(4)}` : Number(value).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })} width={55} /><Tooltip formatter={(value) => formatPrice(value)} contentStyle={{ borderRadius: 12, borderColor: "#e5ebf4", fontSize: 12 }} /><ReferenceLine x={analysis.chart[Math.max(0, analysis.chart.length - horizon.days - 1)]?.label} stroke="#64748b" strokeDasharray="4 4" />
          {visibleIndicators.includes("bollinger") && <>{dataLine("bollingerUpper", "20-day upper band", "#c4b5fd")}{dataLine("bollingerLower", "20-day lower band", "#c4b5fd")}</>}{dataLine("actual", "Observed price", "#2563eb")}{dataLine("forecast", "Trend baseline", "#8b5cf6", true)}{visibleIndicators.includes("ema20") && dataLine("ema20", "EMA 20", "#f59e0b")}{visibleIndicators.includes("ema50") && dataLine("ema50", "EMA 50", "#10b981")}
        </LineChart></ResponsiveContainer></div>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Toggle technical indicators"><span className="mr-1 text-[10px] font-semibold text-slate-500">Indicators</span>{[["ema20", "EMA 20"], ["ema50", "EMA 50"], ["bollinger", "20-day bands"], ["rsi", "RSI"]].map(([key, label]) => <button key={key} type="button" aria-pressed={visibleIndicators.includes(key)} onClick={() => toggleIndicator(key)} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${visibleIndicators.includes(key) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{label}</button>)}</div>
        {visibleIndicators.includes("rsi") && <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs"><span className="text-slate-500">14-observation RSI</span><strong className="text-slate-800">{analysis.rsi === null ? "Insufficient history" : analysis.rsi.toFixed(1)}</strong></div>}
        <p className="mt-3 text-[10px] leading-5 text-slate-400">{error ? `Showing cached candles; refresh failed: ${error}. ` : ""}Source: Binance Spot API · latest completed daily candle {analysis.observationDate} UTC · fetched {formatUtcTimestamp(fetchedAt)}.</p>
      </section>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold text-slate-900">Trend calculation</h3><div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs">
          <div className="flex justify-between gap-3"><span className="text-slate-500">Latest market quote</span><strong>{analysis.lastPriceQuote === "USDT" ? formatPrice(analysis.lastPrice) : formatUsdPrice(analysis.lastPrice)}</strong></div>
          <p className="text-right text-[10px] text-slate-400">{assetData.currentPriceSource || "CoinGecko"} · {formatUtcTimestamp(assetData.marketUpdatedAt)}{assetData.marketStatus === "stale" ? " · quote may be stale" : ""}</p>
          <div className="flex justify-between gap-3"><span className="text-slate-500">Latest historical observation</span><strong>{formatPrice(analysis.historyPrice)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500">{horizon.label} baseline endpoint</span><strong>{formatPrice(analysis.targetPrice)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500">Implied change</span><strong className={analysis.estimatedChangePct >= 0 ? "text-emerald-700" : "text-rose-700"}>{analysis.estimatedChangePct >= 0 ? "+" : ""}{analysis.estimatedChangePct.toFixed(2)}%</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500">Mean daily log return (7D)</span><strong>{analysis.meanReturnPct >= 0 ? "+" : ""}{analysis.meanReturnPct.toFixed(3)}%</strong></div>
        </div><p className="mt-4 text-[10px] leading-5 text-slate-400">This baseline compounds the observed seven-day average return. It does not estimate probability or confidence.</p></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold text-slate-900">Data provenance</h3><p className="mt-2 text-xs leading-5 text-slate-500">Historical series and baseline use completed Binance Spot daily closes in USDT. The latest market quote is labeled with its source and quote currency. Exchange prices can differ from global aggregated USD prices. No sentiment inputs or unpublished model data are used.</p><a href={BINANCE_MARKET_DATA_URL} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[10px] font-semibold text-slate-500 underline underline-offset-2">Binance market data</a></section>
      </aside>
    </div>}
  </div>;
}
