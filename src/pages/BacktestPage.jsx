import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
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
  const [timeframe, setTimeframe] = useState("60D");
  const [assetFilter, setAssetFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const chartData = useMemo(() => {
    const weeklyReturns = cumulativePnl.map((entry, index) => ({
      ...entry,
      pnl: entry.pnl - (index === 0 ? 0 : cumulativePnl[index - 1].pnl),
    }));
    return timeframe === "30D" ? weeklyReturns.slice(-4) : weeklyReturns;
  }, [cumulativePnl, timeframe]);
  const assets = useMemo(
    () => [...new Set(trades.map((trade) => trade.asset))].sort(),
    [trades]
  );
  const filteredTrades = useMemo(
    () => trades.filter((trade) =>
      (assetFilter === "All" || trade.asset === assetFilter)
      && (outcomeFilter === "All" || (trade.pnl >= 0 ? "Profit" : "Loss") === outcomeFilter)
    ),
    [assetFilter, outcomeFilter, trades]
  );

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
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
            <span>Period</span>
            <select
              value={timeframe}
              onChange={(event) => setTimeframe(event.target.value)}
              aria-label="Model performance timeframe"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700"
            >
              <option value="30D">30D</option>
              <option value="60D">60D</option>
            </select>
          </label>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
            <CircleHelp size={13} /> Demonstration data
          </span>
        </div>
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
          <h3 className="text-base font-bold text-slate-900">Weekly simulated P&amp;L</h3>
          <p className="mt-1 text-xs text-slate-500">Change in cumulative return each week · percent</p>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#edf1f7" strokeDasharray="4 5" vertical={false} />
              <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8290a5" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8290a5" }} tickFormatter={(value) => `${value}%`} width={42} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.25} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, "Weekly P&L"]} contentStyle={{ borderRadius: 12, borderColor: "#e5ebf4", fontSize: 12 }} />
              <Bar dataKey="pnl" name="Weekly P&L" radius={[6, 6, 0, 0]} maxBarSize={38}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.period}
                    fill={entry.pnl >= 0 ? "#2563eb" : "#df5365"}
                    radius={entry.pnl >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[10px] text-slate-400">
          {timeframe === "30D"
            ? "Showing the four latest available weekly samples; longer periods show all eight sample weeks."
            : "Showing all eight available weekly samples (56 days); longer periods are not available in this demonstration dataset."}
        </p>
        <p className="mt-2 text-[10px] leading-5 text-slate-400">Simulated results do not guarantee future performance. Fees, slippage, and execution conditions may differ in live trading.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[.025]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Historical trades</h3>
            <p className="mt-1 text-xs text-slate-500">Past sample signals with simulated outcomes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="trade-asset-filter">Filter trades by asset</label>
            <select
              id="trade-asset-filter"
              value={assetFilter}
              onChange={(event) => setAssetFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600"
            >
              <option value="All">All assets</option>
              {assets.map((asset) => <option key={asset} value={asset}>{asset}</option>)}
            </select>
            <label className="sr-only" htmlFor="trade-outcome-filter">Filter trades by outcome</label>
            <select
              id="trade-outcome-filter"
              value={outcomeFilter}
              onChange={(event) => setOutcomeFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600"
            >
              <option value="All">All outcomes</option>
              <option value="Profit">Profit</option>
              <option value="Loss">Loss</option>
            </select>
          </div>
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
              {filteredTrades.map((trade) => {
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
              {filteredTrades.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-xs text-slate-500">No trades match the selected filters.</td>
                </tr>
              )}
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
