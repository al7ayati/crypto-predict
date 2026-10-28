import React, { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

export default function PredictionPage({ assetData }) {
  const [timeframe, setTimeframe] = useState("24H");
  const chartData = MOCK_PREDICTION_CHARTS[timeframe].map((point) => ({
    label: point.label,
    actual: point.actual === null ? null : assetData.currentPrice * (1 + point.actual),
    forecast: point.forecast === null ? null : assetData.currentPrice * (1 + point.forecast),
  }));
  const expectedChange = ((assetData.forecastPrice - assetData.currentPrice) / assetData.currentPrice) * 100;
  const signal = expectedChange > 0.5 ? "BUY" : expectedChange < -0.5 ? "SELL" : "HOLD";
  const confidence = assetData.forecastRows[0]?.confidence || 82;
  const signalStyle = signal === "BUY"
    ? "bg-emerald-50 text-emerald-700"
    : signal === "SELL"
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-700";

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
              A model-generated outlook based on the stored demonstration sample. Use the controls to explore the forecast view.
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
              <p className="mt-1 text-xs text-slate-500">Historical sample and model projection · {timeframe}</p>
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
                <ReferenceLine x={chartData[3]?.label} stroke="#cbd5e1" strokeDasharray="3 4" />
                <Line type="monotone" dataKey="actual" name="Actual price" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                <Line type="monotone" dataKey="forecast" name="Predicted price" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
                <span className="text-slate-500">Current price</span>
                <strong className="text-slate-800">{formatPrice(assetData.currentPrice)}</strong>
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-slate-500">Target price</span>
                <strong className="text-slate-800">{formatPrice(assetData.forecastPrice)}</strong>
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
