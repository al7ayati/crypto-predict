import React, { useEffect, useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BellPlus, Info } from "lucide-react";
import { ANALYTICS_CONFIG } from "../config/analytics.js";
import { BINANCE_MARKET_DATA_URL, fetchPriceHistory, toDailyPrices } from "../services/marketData";
import {
  calculateDailyTrendSignal,
  calculateRiskMetrics,
  calculateTechnicalIndicators,
  calculateTrendBaseline,
} from "../services/technicalIndicators";
import { formatUtcTimestamp } from "../utils/formatting";

const { prediction, indicators: indicatorConfig } = ANALYTICS_CONFIG;
const { horizons: HORIZONS } = prediction;
const INDICATOR_OPTIONS = [
  { key: "ema20", label: `EMA ${indicatorConfig.emaPeriods[0]}`, color: "#f59e0b" },
  { key: "ema50", label: `EMA ${indicatorConfig.emaPeriods[1]}`, color: "#10b981" },
  { key: "bollinger", label: `${indicatorConfig.bollingerPeriod}-day bands`, color: "#c4b5fd" },
  { key: "rsi", label: `RSI (${indicatorConfig.rsiPeriod})`, color: "#7c3aed" },
];
const formatPrice = (value) => new Intl.NumberFormat("en-US", {
  minimumFractionDigits: value < 1 ? 4 : 2,
  maximumFractionDigits: value < 1 ? 8 : 2,
}).format(value) + " USDT";
const formatUsdPrice = (value) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: value < 1 ? 4 : 2,
  maximumFractionDigits: value < 1 ? 8 : 2,
}).format(value);
const signalLabels = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  neutral: "Neutral",
  sell: "Sell",
  strong_sell: "Strong Sell",
};

function formatHistoryLabel(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "2-digit", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function getHistoryRange() {
  const now = Date.now();
  return {
    from: new Date(now - (prediction.historyCalendarDays - 1) * 86_400_000).toISOString().slice(0, 10),
    to: new Date(now).toISOString().slice(0, 10),
  };
}

function FeatureTooltip({ label, children }) {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);
  return <span className="feature-tooltip-wrap">
    <button type="button" className="feature-tooltip-trigger" aria-label={`About ${label}`} aria-describedby={tooltipId} aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
      <Info size={13} aria-hidden="true" />
    </button>
    <span className={`feature-tooltip${isOpen ? " is-open" : ""}`} id={tooltipId} role="tooltip">{children}</span>
  </span>;
}

function formatRiskLevel(level) {
  return level ? `${level[0].toUpperCase()}${level.slice(1)} risk` : "Unavailable";
}

export default function PredictionPage({ assetData, onCreateAlert }) {
  const [horizon, setHorizon] = useState(HORIZONS[1]);
  const [visibleIndicators, setVisibleIndicators] = useState([]);
  const [range, setRange] = useState(getHistoryRange);
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const next = getHistoryRange();
      setRange((current) => current.from === next.from && current.to === next.to ? current : next);
    }, prediction.rangeRefreshIntervalMs);
    return () => window.clearInterval(intervalId);
  }, []);
  const historyQuery = useQuery({
    queryKey: ["market-history", assetData.symbol, range.from, range.to],
    queryFn: async ({ signal }) => {
      const rows = await fetchPriceHistory(assetData.symbol, range.from, range.to, signal);
      const daily = toDailyPrices(rows).filter((candle) => candle.candleCloseTime < Date.now());
      if (daily.length < indicatorConfig.emaPeriods[1]) {
        throw new Error(`At least ${indicatorConfig.emaPeriods[1]} completed daily candles are required to calculate the EMA.`);
      }
      return daily;
    },
    refetchInterval: prediction.refreshIntervalMs,
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
    const baseline = calculateTrendBaseline(observations, horizon.days);
    const futureRows = Array.from({ length: horizon.days }, (_, index) => {
      const day = index + 1;
      return { label: `+${day}d`, timestamp: last.timestamp + day * 86_400_000, actual: null, forecast: last.price * Math.exp(baseline.meanDailyLogReturn * day) };
    });
    actualRows.at(-1).forecast = last.price;
    const indicators = calculateTechnicalIndicators(actualRows);
    const visibleHistory = indicators.slice(-prediction.chartHistoryDays);
    const chart = visibleHistory.concat(futureRows.map((point) => ({ ...point, ema20: null, ema50: null, bollingerUpper: null, bollingerLower: null, rsi: null })));
    const hasCurrentQuote = Number.isFinite(assetData.currentPrice);
    const riskMetrics = calculateRiskMetrics(observations, last.price, horizon.days, baseline.targetPrice);
    const trendSignal = calculateDailyTrendSignal(indicators.at(-1), baseline.meanDailyLogReturn);
    const recentObservations = observations.slice(-prediction.baselineObservationIntervals - 1);
    const weightedIntervals = recentObservations.slice(1).map((current, index) => {
      const previous = recentObservations[index];
      const elapsedDays = (current.timestamp - previous.timestamp) / 86_400_000;
      const logReturnPct = Math.log(current.price / previous.price) * 100;
      return {
        startDate: previous.date,
        endDate: current.date,
        elapsedDays,
        logReturnPct,
        weightPct: 100 / prediction.baselineObservationIntervals,
      };
    });
    return { chart, lastPrice: hasCurrentQuote ? assetData.currentPrice : last.price, lastPriceQuote: hasCurrentQuote ? assetData.currentPriceQuote : "USDT", historyPrice: last.price, rsi: indicators.at(-1)?.rsi, meanReturnPct: baseline.meanDailyLogReturnPct,
      targetPrice: baseline.targetPrice, estimatedChangePct: baseline.estimatedChangePct,
      riskMetrics, trendSignal, weightedIntervals, observationDate: last.date };
  }, [assetData.currentPrice, assetData.currentPriceQuote, horizon.days, observations]);

  const toggleIndicator = (indicator) => setVisibleIndicators((current) => current.includes(indicator)
    ? current.filter((value) => value !== indicator)
    : [...current, indicator]);
  const activeChartIndicators = INDICATOR_OPTIONS.filter(
    ({ key }) => visibleIndicators.includes(key) && key !== "rsi"
  );

  const dataLine = (dataKey, name, color, dashed = false) => <Line type="linear" dataKey={dataKey} name={name} stroke={color} strokeWidth={1.5} strokeDasharray={dashed ? "5 4" : undefined} dot={false} connectNulls />;
  const formatTooltipPrice = (value) => Number.isFinite(value) ? formatPrice(value) : "—";

  return <div className="space-y-6">
    <section className="rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-blue-950 p-5 text-white shadow-lg shadow-blue-950/10 sm:p-7">
      <span className="inline-flex rounded-full border border-blue-300/20 bg-white/[.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-blue-100">Historical trend baseline</span>
      <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{assetData.name} scenario</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/70">A transparent extrapolation of the mean daily log return across the latest {prediction.baselineObservationIntervals} observed intervals. The projected line is a calculation from past data, not a fact, AI output, or trading advice.</p>
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
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">Observed prices and baseline</h3><p className="mt-1 text-xs text-slate-500">Last {prediction.chartHistoryDays} completed Binance Spot daily closes · {assetData.symbol}/USDT · UTC. Indicators use up to {prediction.historyCalendarDays - 1} candles for warm-up.</p></div><div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-600" />Observed history</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-violet-500" />Trend baseline</span>{activeChartIndicators.map(({ key, label, color }) => <span key={key} className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}</div></div>
        <div className="h-[290px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={analysis.chart} margin={{ top: 10, right: 12, left: 3, bottom: 3 }}>
          <CartesianGrid stroke="#edf1f7" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#8290a5" }} minTickGap={24} /><YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8290a5" }} tickFormatter={(value) => value < 1 ? `${Number(value).toFixed(4)}` : Number(value).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })} width={55} /><Tooltip formatter={formatTooltipPrice} contentStyle={{ borderRadius: 12, borderColor: "#e5ebf4", fontSize: 12 }} /><ReferenceLine x={analysis.chart[Math.max(0, analysis.chart.length - horizon.days - 1)]?.label} stroke="#64748b" strokeDasharray="4 4" />
          {visibleIndicators.includes("bollinger") && <>{dataLine("bollingerUpper", `${indicatorConfig.bollingerPeriod}-period upper band`, "#c4b5fd")}{dataLine("bollingerLower", `${indicatorConfig.bollingerPeriod}-period lower band`, "#c4b5fd")}</>}{dataLine("actual", "Observed price", "#2563eb")}{dataLine("forecast", "Trend baseline", "#8b5cf6", true)}{visibleIndicators.includes("ema20") && dataLine("ema20", `EMA ${indicatorConfig.emaPeriods[0]}`, "#f59e0b")}{visibleIndicators.includes("ema50") && dataLine("ema50", `EMA ${indicatorConfig.emaPeriods[1]}`, "#10b981")}
        </LineChart></ResponsiveContainer></div>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Toggle technical indicators"><span className="mr-1 text-[10px] font-semibold text-slate-500">Indicators</span>{INDICATOR_OPTIONS.map(({ key, label }) => <button key={key} type="button" aria-pressed={visibleIndicators.includes(key)} onClick={() => toggleIndicator(key)} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${visibleIndicators.includes(key) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{label}</button>)}</div>
        {visibleIndicators.includes("rsi") && <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-xs font-bold text-slate-700">{indicatorConfig.rsiPeriod}-period RSI</h4><p className="mt-1 text-[10px] text-slate-400">Wilder smoothing · {indicatorConfig.rsiOversold}/{indicatorConfig.rsiOverbought} reference levels</p></div><strong className="text-sm text-slate-800">{analysis.rsi === null ? "Insufficient history" : analysis.rsi.toFixed(1)}</strong></div>
          <div className="h-[150px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={analysis.chart} margin={{ top: 5, right: 12, left: 3, bottom: 3 }}>
            <CartesianGrid stroke="#edf1f7" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: "#8290a5" }} minTickGap={24} /><YAxis domain={[0, 100]} ticks={[0, indicatorConfig.rsiOversold, 50, indicatorConfig.rsiOverbought, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: "#8290a5" }} width={30} /><Tooltip formatter={(value) => Number.isFinite(value) ? [Number(value).toFixed(1), `RSI (${indicatorConfig.rsiPeriod})`] : ["—", `RSI (${indicatorConfig.rsiPeriod})`]} contentStyle={{ borderRadius: 10, borderColor: "#e5ebf4", fontSize: 11 }} /><ReferenceLine y={indicatorConfig.rsiOversold} stroke="#94a3b8" strokeDasharray="4 4" /><ReferenceLine y={indicatorConfig.rsiOverbought} stroke="#94a3b8" strokeDasharray="4 4" />{dataLine("rsi", `RSI (${indicatorConfig.rsiPeriod})`, "#7c3aed")}
          </LineChart></ResponsiveContainer></div>
          <p className="mt-1 text-[9px] leading-4 text-slate-400">Above {indicatorConfig.rsiOverbought} and below {indicatorConfig.rsiOversold} are conventional reference zones, not standalone buy or sell signals.</p>
        </div>}
        <p className="mt-3 text-[10px] leading-5 text-slate-400">{error ? `Showing cached candles; refresh failed: ${error}. ` : ""}Source: Binance Spot API · latest completed daily candle {analysis.observationDate} UTC · fetched {formatUtcTimestamp(fetchedAt)}.</p>
      </section>
      <aside className="prediction-insights-column">
        <section className="prediction-risk-card" aria-labelledby="risk-scenario-heading">
          <div className="prediction-risk-heading">
            <span className="prediction-risk-icon"><AlertTriangle size={17} aria-hidden="true" /></span>
            <div><p className="prediction-risk-kicker">Scenario risk framework</p><h3 id="risk-scenario-heading">Risk-managed levels</h3></div>
          </div>
          <div className="risk-level-row">
            <span>Realized volatility risk</span>
            <strong className={`risk-level-badge is-${analysis.riskMetrics?.riskLevel || "unavailable"}`}>
              {formatRiskLevel(analysis.riskMetrics?.riskLevel)}
            </strong>
          </div>
          {analysis.riskMetrics ? (
            <>
              <div className="risk-meter" role="meter" aria-label="Annualized realized volatility risk" aria-valuemin={0} aria-valuemax={150} aria-valuenow={Math.min(150, analysis.riskMetrics.annualizedVolatilityPct)} aria-valuetext={`${formatRiskLevel(analysis.riskMetrics.riskLevel)}, annualized realized volatility ${analysis.riskMetrics.annualizedVolatilityPct.toFixed(1)} percent`}>
                <span className="risk-meter-fill" style={{ left: `${Math.min(96, analysis.riskMetrics.annualizedVolatilityPct / 150 * 100)}%` }} />
              </div>
              <div className="risk-meter-legend"><span>Low · &lt;50%</span><span>Medium · 50–100%</span><span>High · ≥100%</span></div>
              <p className="risk-volatility-note">{analysis.riskMetrics.annualizedVolatilityPct.toFixed(1)}% annualized historical volatility · {analysis.riskMetrics.horizonVolatilityPct.toFixed(2)}% estimated range over {horizon.label}</p>
            </>
          ) : <p className="risk-volatility-note">Requires 21 consecutive completed daily closes to estimate volatility risk.</p>}

          <div className="risk-levels-list">
            <div><span>Reference entry · latest daily close</span><strong>{formatPrice(analysis.historyPrice)}</strong></div>
            <div><span>Scenario target / take profit</span><strong>{formatPrice(analysis.targetPrice)}</strong></div>
            <div><span>Volatility-based stop level</span><strong>{analysis.riskMetrics?.stopLoss ? formatPrice(analysis.riskMetrics.stopLoss) : "Unavailable"}</strong></div>
            <div><span>Scenario reward / risk</span><strong>{Number.isFinite(analysis.riskMetrics?.riskRewardRatio) ? `${analysis.riskMetrics.riskRewardRatio.toFixed(2)} : 1` : "Unavailable"}</strong></div>
            <div><span>Implied baseline change</span><strong className={analysis.estimatedChangePct >= 0 ? "is-positive" : "is-negative"}>{analysis.estimatedChangePct >= 0 ? "+" : ""}{analysis.estimatedChangePct.toFixed(2)}%</strong></div>
          </div>
          <button type="button" className="prediction-create-alert" onClick={() => onCreateAlert?.(assetData.symbol)}>
            <BellPlus size={15} aria-hidden="true" /> Create a price or signal alert
          </button>
          <p className="prediction-risk-disclaimer">Illustrative scenario levels, not trade instructions. Stop distance = 1.5 × 20-day sample volatility × √horizon; target = the historical trend baseline endpoint. Risk bands use annualized volatility thresholds (&lt;50%, 50–100%, ≥100%). Not financial advice.</p>
        </section>

        <section className="model-weighting-card" aria-labelledby="model-weighting-heading">
          <div className="model-weighting-heading">
            <div><p className="prediction-risk-kicker">Explainable calculation</p><h3 id="model-weighting-heading">Model Weighting &amp; Feature Importance</h3></div>
            <FeatureTooltip label="Model weighting">This is a deterministic historical trend baseline, not a trained or AI model. The seven observed log-return intervals are equally weighted in the cumulative return.</FeatureTooltip>
          </div>
          <p className="model-weighting-intro">Each of the latest {prediction.baselineObservationIntervals} observed log-return intervals contributes equally to the baseline trend. The sum is divided by actual elapsed UTC days before compounding.</p>
          <div className="feature-weight-list">
            {analysis.weightedIntervals.map((interval, index) => (
              <div className="feature-weight-row" key={`${interval.startDate}-${interval.endDate}`}>
                <div className="feature-weight-label">
                  <span>{interval.startDate.slice(5)} → {interval.endDate.slice(5)}</span>
                  <FeatureTooltip label={`${interval.startDate} through ${interval.endDate}`}>
                    Log return = ln({interval.endDate} close ÷ {interval.startDate} close) = {interval.logReturnPct >= 0 ? "+" : ""}{interval.logReturnPct.toFixed(3)}%. This observed return interval receives one of {prediction.baselineObservationIntervals} equal weights in the total log return; it spans {interval.elapsedDays} UTC calendar day(s).
                  </FeatureTooltip>
                  <strong>{interval.weightPct.toFixed(1)}%</strong>
                </div>
                <div className="feature-weight-track" role="progressbar" aria-label={`Historical interval ${index + 1} baseline weight`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={interval.weightPct}>
                  <span style={{ width: `${interval.weightPct}%` }} />
                </div>
                <span className={`feature-return-value ${interval.logReturnPct >= 0 ? "is-positive" : "is-negative"}`}>
                  {interval.logReturnPct >= 0 ? "+" : ""}{interval.logReturnPct.toFixed(2)}% log return
                </span>
              </div>
            ))}
          </div>
          <div className="context-only-features">
            <h4>Context only · 0% target weight</h4>
            <p><FeatureTooltip label="Technical indicator context">RSI is Wilder-smoothed over 14 price changes. EMA20 and EMA50 use their configured lookback windows. Bollinger bands use the configured 20-close population standard deviation. These are chart overlays only; they do not influence the projected target.</FeatureTooltip> RSI14, EMA20/50, and Bollinger bands are not inputs to this baseline.</p>
            <p><FeatureTooltip label="Unavailable external factors">No on-chain flow, derivatives positioning, order-book imbalance, news, or sentiment feed is connected to this app.</FeatureTooltip> On-chain flow and market sentiment are not connected; no weights are invented for unavailable data.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Trend calculation</h3>
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs">
            <div className="flex justify-between gap-3"><span className="text-slate-500">Latest market quote</span><strong>{analysis.lastPriceQuote === "USDT" ? formatPrice(analysis.lastPrice) : formatUsdPrice(analysis.lastPrice)}</strong></div>
            <p className="text-right text-[10px] text-slate-400">{assetData.currentPriceSource || "CoinGecko"} · {formatUtcTimestamp(assetData.marketUpdatedAt)}{assetData.marketStatus === "stale" ? " · quote may be stale" : ""}</p>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Latest historical observation</span><strong>{formatPrice(analysis.historyPrice)}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">{horizon.label} baseline endpoint</span><strong>{formatPrice(analysis.targetPrice)}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Mean daily log return ({prediction.baselineObservationIntervals} intervals)</span><strong>{analysis.meanReturnPct >= 0 ? "+" : ""}{analysis.meanReturnPct.toFixed(3)}%</strong></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Rule-based daily context</span><strong className={`trend-signal-label is-${analysis.trendSignal || "unavailable"}`}>{signalLabels[analysis.trendSignal] || "Unavailable"}</strong></div>
          </div>
          <p className="mt-4 text-[10px] leading-5 text-slate-400">The baseline uses the cumulative log return across the latest {prediction.baselineObservationIntervals} observed intervals, divided by elapsed calendar days, then compounds that daily rate over the selected horizon. It does not estimate probability or confidence.</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Data provenance</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">Historical series and baseline use completed Binance Spot daily closes in USDT. The latest market quote is labeled with its source and quote currency. Exchange prices can differ from global aggregated USD prices. The daily context label is a fixed technical rule using EMA20/50, RSI14, and baseline direction—not trained AI or investment advice.</p>
          <a href={BINANCE_MARKET_DATA_URL} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[10px] font-semibold text-slate-500 underline underline-offset-2">Binance market data</a>
        </section>
      </aside>
    </div>}
  </div>;
}
