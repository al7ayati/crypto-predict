import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ChartNoAxesCombined, CircleHelp } from "lucide-react";
import {
  MOCK_BACKTEST_METRICS,
  MOCK_CUMULATIVE_PNL,
  MOCK_HISTORICAL_TRADES,
} from "../data/mockMarketData";

export default function BacktestPage({
  metrics = MOCK_BACKTEST_METRICS,
  cumulativePnl = MOCK_CUMULATIVE_PNL,
  trades = MOCK_HISTORICAL_TRADES,
}) {
  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[.025] sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ChartNoAxesCombined size={21} /></span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Model performance</h2>
            <p className="mt-1 text-xs text-slate-500">Historical evaluation on a simulated test set</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
          <CircleHelp size={13} /> Demonstration data
        </span>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {metrics.map((metric, index) => {
          const Icon = [CheckCircle2, ChartNoAxesCombined, ArrowUpRight][index] || CheckCircle2;
          return (
            <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[.025]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={17} /></span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{metric.value}</p>
              <p className="mt-1.5 text-[11px] text-slate-400">{metric.note}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[.025] sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">Cumulative simulated P&amp;L</h3>
          <p className="mt-1 text-xs text-slate-500">Return over the sample period · percent</p>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cumulativePnl} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#edf1f7" strokeDasharray="4 5" vertical={false} />
              <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8290a5" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8290a5" }} tickFormatter={(value) => `${value}%`} width={42} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, "Cumulative P&L"]} contentStyle={{ borderRadius: 12, borderColor: "#e5ebf4", fontSize: 12 }} />
              <Bar dataKey="pnl" name="Cumulative P&L" radius={[6, 6, 0, 0]} maxBarSize={38}>
                {cumulativePnl.map((entry) => <Cell key={entry.period} fill={entry.pnl >= 0 ? "#2563eb" : "#df5365"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[10px] leading-5 text-slate-400">Simulated results do not guarantee future performance. Fees, slippage, and execution conditions may differ in live trading.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[.025]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h3 className="text-base font-bold text-slate-900">Historical trades</h3>
          <p className="mt-1 text-xs text-slate-500">Past sample signals with simulated outcomes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Date</th>
                <th className="px-4 py-3.5">Asset</th>
                <th className="px-4 py-3.5">Signal</th>
                <th className="px-4 py-3.5">Actual Outcome</th>
                <th className="px-6 py-3.5 text-right">Profit / Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trades.map((trade) => {
                const profitable = trade.pnl >= 0;
                return (
                  <tr key={`${trade.date}-${trade.asset}`} className={profitable ? "bg-emerald-50/30" : "bg-rose-50/30"}>
                    <td className="px-6 py-4 text-xs text-slate-600">{trade.date}</td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-800">{trade.asset}</td>
                    <td className="px-4 py-4 text-xs text-slate-600">{trade.signal}</td>
                    <td className={`px-4 py-4 text-xs font-semibold ${profitable ? "text-emerald-700" : "text-rose-700"}`}>{trade.outcome}</td>
                    <td className={`px-6 py-4 text-right text-xs font-bold tabular-nums ${profitable ? "text-emerald-700" : "text-rose-700"}`}>
                      <span className="inline-flex items-center gap-1">
                        {profitable ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {profitable ? "+" : ""}{trade.pnl.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:px-6">
          All trades and performance metrics are mock data for demonstration, not verified historical results.
        </p>
      </section>
    </div>
  );
}
