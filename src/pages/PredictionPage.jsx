import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  ComposedChart,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, BrainCircuit, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { MOCK_PREDICTION_CHARTS } from "../data/mockMarketData";

const TIMEFRAMES = ["1H", "24H", "7D"];
const FACTORS = [
  "Trading volume increased over the latest sample window",
  "Short-term momentum remains above the recent average",
  "Social sentiment is positive across tracked sources",
];
const formatPrice = (value) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: value < 1 ? 4 : 2,
  maximumFractionDigits: value < 1 ? 4 : 2,
}).format(value);

function addIndicators(points) {
  const actualPoints = points.filter((point) => point.actual !== null);
  const ema = (values, period) => {
    const multiplier = 2 / (period + 1);
    return values.reduce((result, value, index) => {
      result.push(index === 0 ? value : value * multiplier + result[index - 1] * (1 - multiplier));
      return result;
    }, []);
  };
  const values = actualPoints.map((point) => point.actual);
  const ema20 = ema(values, 20);
  const ema50 = ema(values, 50);
  const actualIndexByLabel = new Map(actualPoints.map((point, index) => [point.label, index]));

  return points.map((point) => {
    const index = actualIndexByLabel.get(point.label);
    if (index === undefined) {
      return { ...point, ema20: null, ema50: null, bollingerUpper: null, bollingerLower: null, rsi: null };
    }

    const windowValues = values.slice(Math.max(0, index - 19), index + 1);
    const average = windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length;
    const deviation = Math.sqrt(windowValues.reduce((sum, value) => sum + (value - average) ** 2, 0) / windowValues.length);
    const rsiWindow = values.slice(Math.max(0, index - 13), index + 1);
    const changes = rsiWindow.slice(1).map((value, changeIndex) => value - rsiWindow[changeIndex]);
    const gains = changes.reduce((sum, change) => sum + Math.max(change, 0), 0);
    const losses = changes.reduce((sum, change) => sum + Math.max(-change, 0), 0);
    const rsi = changes.length === 0
      ? null
      : losses === 0
        ? 100
        : 100 - 100 / (1 + gains / losses);

    return {
      ...point,
      ema20: ema20[index],
      ema50: ema50[index],
      bollingerUpper: average + deviation * 2,
      bollingerLower: average - deviation * 2,
      rsi,
    };
  });
}

export default function PredictionPage({ assetData }) {
  const [timeframe, setTimeframe] = useState("24H");
  const [visibleIndicators, setVisibleIndicators] = useState([]);
  const chartData = useMemo(() => addIndicators(MOCK_PREDICTION_CHARTS[timeframe].map((point) => ({
    label: point.label,
    actual: point.actual === null ? null : assetData.currentPrice * (1 + point.actual),
    forecast: point.forecast === null ? null : assetData.currentPrice * (1 + point.forecast),
  }))), [assetData.currentPrice, timeframe]);
  const expectedChange = ((assetData.forecastPrice - assetData.currentPrice) / assetData.currentPrice) * 100;
  const signal = expectedChange > 0.5 ? "BUY" : expectedChange < -0.5 ? "SELL" : "HOLD";
  const stopLoss = assetData.currentPrice * (signal === "SELL" ? 1.015 : 0.985);
  const confidence = assetData.forecastRows[0]?.confidence || 82;
  const signalStyle = signal === "BUY"
    ? "bg-emerald-50 text-emerald-700"
    : signal === "SELL"
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-700";
  const toggleIndicator = (indicator) => {
    setVisibleIndicators((current) => current.includes(indicator)
    ? current.filter((value) => value !== indicator)
    : [...current, indicator]);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-blue-950 p-5 text-white shadow-lg shadow-blue-950/10 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-white/[.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-blue-100">
              <Sparkles size={13} /> AI price outlook
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{assetData.name} Forecast</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100/65">
              The latest market price anchors this illustrative sample projection. Forecasts and signals are demonstration data, not a live model output.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-100/60">Timeframe</span>
              <div className="flex rounded-xl border border-white/15 bg-white/10 p-1" role="group" aria-label="Prediction timeframe">
                {TIMEFRAMES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTimeframe(option)}
                    aria-pressed={timeframe === option}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${timeframe === option ? "bg-white text-navy-950 shadow-sm" : "text-blue-100/75 hover:text-white"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(270px,.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[.025] sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Price forecast</h3>
              <p className="mt-1 text-xs text-slate-500">{assetData.isLive ? "Live price anchor with illustrative sample projection" : "Sample price anchor and illustrative projection"} · {timeframe}</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-600" />Actual</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-violet-500" />Predicted</span>
            </div>
          </div>
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 12, left: 3, bottom: 3 }}>
                <CartesianGrid stroke="#edf1f7" strokeDasharray="4 5" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8290a5" }} />
                <YAxis
                  domain={["auto", "auto"]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#8290a5" }}
                  tickFormatter={(value) => value < 1
                    ? `$${Number(value).toFixed(4)}`
                    : `$${Number(value).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })}`}
                  width={55}
                />
                <Tooltip formatter={(value) => formatPrice(value)} contentStyle={{ borderRadius: 12, borderColor: "#e5ebf4", fontSize: 12 }} />
                <ReferenceLine x="Now" stroke="#64748b" strokeDasharray="4 4" label={{ value: "NOW", position: "insideTopRight", fill: "#64748b", fontSize: 9, fontWeight: 700 }} />
                {visibleIndicators.includes("bollinger") && (
                  <>
                    <Line type="monotone" dataKey="bollingerUpper" name="Bollinger upper" stroke="#c4b5fd" strokeWidth={1.5} dot={false} connectNulls />
                    <Line type="monotone" dataKey="bollingerLower" name="Bollinger lower" stroke="#c4b5fd" strokeWidth={1.5} dot={false} connectNulls />
                  </>
                )}
                <Line type="monotone" dataKey="actual" name="Actual price" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                <Line type="monotone" dataKey="forecast" name="Predicted price" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }} connectNulls />
                {visibleIndicators.includes("ema20") && <Line type="monotone" dataKey="ema20" name="EMA 20" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls />}
                {visibleIndicators.includes("ema50") && <Line type="monotone" dataKey="ema50" name="EMA 50" stroke="#10b981" strokeWidth={1.5} dot={false} connectNulls />}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Toggle technical indicators">
            <span className="mr-1 text-[10px] font-semibold text-slate-500">Indicators</span>
            {[
              ["ema20", "EMA 20"],
              ["ema50", "EMA 50"],
              ["bollinger", "Bollinger Bands"],
              ["rsi", "RSI"],
            ].map(([key, label]) => {
              const active = visibleIndicators.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleIndicator(key)}
                  className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {visibleIndicators.includes("rsi") && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-600">Relative Strength Index (RSI)</span>
                <span className="text-[10px] text-slate-400">Sample-based · 0–100</span>
              </div>
              <div className="h-[110px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 3, bottom: 0 }}>
                    <CartesianGrid stroke="#edf1f7" strokeDasharray="4 5" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#8290a5" }} />
                    <YAxis domain={[0, 100]} ticks={[0, 30, 70, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#8290a5" }} width={30} />
                    <Tooltip formatter={(value) => [Number(value).toFixed(1), "RSI"]} contentStyle={{ borderRadius: 12, borderColor: "#e5ebf4", fontSize: 11 }} />
                    <ReferenceLine y={30} stroke="#cbd5e1" strokeDasharray="3 4" />
                    <ReferenceLine y={70} stroke="#cbd5e1" strokeDasharray="3 4" />
                    <Area type="monotone" dataKey="rsi" name="RSI" stroke="#f59e0b" fill="#fef3c7" fillOpacity={0.45} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <p className="mt-3 text-[10px] leading-5 text-slate-400">Sample model output only. Forecasts are illustrative and are not financial advice.</p>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[.025]">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400"><BrainCircuit size={14} /> AI analysis &amp; signal</span>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`rounded-lg px-3 py-1.5 text-sm font-extrabold tracking-wider ${signalStyle}`}>{signal}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${expectedChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {expectedChange >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                    {expectedChange >= 0 ? "+" : ""}{expectedChange.toFixed(2)}%
                  </span>
                </div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Sparkles size={18} /></span>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Confidence level</span>
                <strong className="text-slate-800">{confidence}%</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500" style={{ width: `${confidence}%` }} />
              </div>
              <div className="mt-4 flex justify-between text-xs">
              <span className="text-slate-500">Current price {assetData.isLive ? "· live" : "· sample"}</span>
                <strong className="text-slate-800">{formatPrice(assetData.currentPrice)}</strong>
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-slate-500">Target price</span>
                <strong className="text-slate-800">{formatPrice(assetData.forecastPrice)}</strong>
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-slate-500">Stop loss <span className="text-slate-400">(1.5% risk)</span></span>
                <strong className="text-rose-700">{formatPrice(stopLoss)}</strong>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[.025]">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><CheckCircle2 size={16} /></span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Key factors</h3>
                <p className="text-[10px] text-slate-400">Signals contributing to this outlook</p>
              </div>
            </div>
            <ul className="space-y-3">
              {FACTORS.map((factor) => (
                <li key={factor} className="flex gap-2.5 text-xs leading-5 text-slate-600">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                  {factor}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
              <Clock3 size={12} /> Generated from a stored sample · {timeframe}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
