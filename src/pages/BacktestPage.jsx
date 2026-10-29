import React, { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined, CircleHelp } from "lucide-react";
import { fetchPriceHistory, MARKET_ASSETS, toDailyPrices } from "../services/marketData";
import { backtestMovingAverage, ROUND_TRIP_FEE_PCT, summarizeBacktest } from "../services/backtest";

const startDate = () => new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
const endDate = () => new Date().toISOString().slice(0, 10);

export default function BacktestPage() {
  const [period, setPeriod] = useState(60);
  const [assetFilter, setAssetFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [state, setState] = useState("loading");
  const [loaded, setLoaded] = useState([]);
  const [error, setError] = useState("");
  const [fetchedAt, setFetchedAt] = useState(null);

  // CHANGEPOINT: Results use real historical prices, while strategy and fee assumptions stay explicit below.
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setError("");
    setLoaded([]);
    const from = startDate();
    const to = endDate();
    Promise.allSettled(MARKET_ASSETS.map(async (asset) => {
      const observations = await fetchPriceHistory(asset.symbol, from, to, controller.signal);
      const daily = toDailyPrices(observations);
      const result = backtestMovingAverage(asset.symbol, daily, 60);
      return { asset, daily, result };
    })).then((settled) => {
      if (controller.signal.aborted) return;
      const successful = settled.filter((item) => item.status === "fulfilled").map((item) => item.value);
      const failures = settled.filter((item) => item.status === "rejected");
      if (!successful.length) throw failures[0]?.reason || new Error("No asset history was available.");
      setLoaded(successful);
      setFetchedAt(new Date().toISOString());
      setState(failures.length ? "partial" : "ready");
      if (failures.length) setError(`History could not be loaded for ${failures.length} asset${failures.length === 1 ? "" : "s"}; results include only successfully loaded assets.`);
    }).catch((loadError) => {
      if (loadError.name === "AbortError") return;
      setState("error");
      setError(loadError.message || "Unable to load historical prices from CoinGecko.");
    });
    return () => controller.abort();
  }, []);

  const selectedResults = useMemo(() => loaded
    .filter(({ asset }) => assetFilter === "All" || asset.symbol === assetFilter)
    .map(({ asset, daily }) => ({ asset, daily, result: backtestMovingAverage(asset.symbol, daily, period) })), [assetFilter, loaded, period]);
  const summary = useMemo(() => summarizeBacktest(selectedResults.map(({ result }) => result)), [selectedResults]);
  const filteredTrades = summary.trades.filter((trade) => outcomeFilter === "All" || (trade.pnlPct >= 0 ? "Profit" : "Loss") === outcomeFilter);
  const metrics = [
    { label: `Net strategy return · ${period}D`, value: `${summary.totalReturnPct >= 0 ? "+" : ""}${summary.totalReturnPct.toFixed(2)}%`, note: "Equal-weight portfolio · after modeled fees" },
    { label: "Closed hypothetical trades", value: String(summary.tradeCount), note: "7-day simple moving-average strategy" },
    { label: "Winning trades", value: `${summary.winRatePct.toFixed(1)}%`, note: "Share of closed hypothetical trades" },
  ];

  return <div className="space-y-6">
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ChartNoAxesCombined size={21} /></span><div><h2 className="text-lg font-bold text-slate-900">Historical strategy replay</h2><p className="mt-1 text-xs text-slate-500">Hypothetical long-only 7-day moving-average rule using CoinGecko daily prices</p></div></div>
      <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500"><span>Period</span><select value={period} onChange={(event) => setPeriod(Number(event.target.value))} aria-label="Backtest period" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700"><option value={30}>30D</option><option value={60}>60D</option></select></label><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100"><CircleHelp size={13} />Price-based simulation</span></div>
    </section>

    {state === "loading" && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading up to five CoinGecko history series…</p>}
    {state === "error" && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">{error} No simulated results are shown without historical prices.</p>}
    {state !== "loading" && state !== "error" && <>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">{metrics.map((metric, index) => <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-slate-500">{metric.label}</p><p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{metric.value}</p><p className="mt-1.5 text-[11px] text-slate-400">{metric.note}</p></article>)}</section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4"><h3 className="text-base font-bold text-slate-900">Weekly portfolio return</h3><p className="mt-1 text-xs text-slate-500">Compounded equal-weight strategy return for each UTC week · percent</p></div>
        <div className="h-[260px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.weeklyReturns} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke="#edf1f7" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#8290a5" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8290a5" }} tickFormatter={(value) => `${value}%`} width={45} /><ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.25} /><Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, "Weekly return"]} contentStyle={{ borderRadius: 12, borderColor: "#e5ebf4", fontSize: 12 }} /><Bar dataKey="returnPct" name="Weekly return" radius={[5, 5, 0, 0]} maxBarSize={38}>{summary.weeklyReturns.map((entry) => <Cell key={entry.week} fill={entry.returnPct >= 0 ? "#2563eb" : "#df5365"} />)}</Bar></BarChart></ResponsiveContainer></div>
        <p className="mt-3 text-[10px] leading-5 text-slate-400">A buy signal occurs when the daily observed price closes above its trailing 7-observation simple moving average; a sell signal occurs below it. Signals take effect after the observed close. A {(ROUND_TRIP_FEE_PCT / 2).toFixed(1)}% fee per fill is modeled ({ROUND_TRIP_FEE_PCT.toFixed(1)}% round trip). No slippage, exchange execution, spreads, taxes, or OHLC data are modeled.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6"><div><h3 className="text-base font-bold text-slate-900">Closed hypothetical trades</h3><p className="mt-1 text-xs text-slate-500">Trades calculated from observed daily prices; not actual exchange orders.</p></div><div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="trade-asset-filter">Filter assets</label><select id="trade-asset-filter" value={assetFilter} onChange={(event) => setAssetFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600"><option value="All">All loaded assets</option>{loaded.map(({ asset }) => <option key={asset.symbol} value={asset.symbol}>{asset.symbol}</option>)}</select><label className="sr-only" htmlFor="trade-outcome-filter">Filter outcome</label><select id="trade-outcome-filter" value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600"><option value="All">All outcomes</option><option value="Profit">Profit</option><option value="Loss">Loss</option></select></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left"><thead><tr className="bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-6 py-3.5">Exit date (UTC)</th><th className="px-4 py-3.5">Asset</th><th className="px-4 py-3.5">Entry date (UTC)</th><th className="px-4 py-3.5">Entry → exit</th><th className="px-6 py-3.5 text-right">Net simulated P&amp;L</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredTrades.map((trade) => { const profitable = trade.pnlPct >= 0; return <tr key={`${trade.asset}-${trade.entryDate}-${trade.date}`} className={profitable ? "bg-emerald-50/30" : "bg-rose-50/30"}><td className="px-6 py-4 text-xs text-slate-600">{trade.date}</td><td className="px-4 py-4 text-xs font-bold text-slate-800">{trade.asset}</td><td className="px-4 py-4 text-xs text-slate-600">{trade.entryDate}</td><td className="px-4 py-4 text-xs tabular-nums text-slate-600">{trade.entryPrice.toLocaleString("en-US", { maximumFractionDigits: 8 })} → {trade.exitPrice.toLocaleString("en-US", { maximumFractionDigits: 8 })}</td><td className={`px-6 py-4 text-right text-xs font-bold tabular-nums ${profitable ? "text-emerald-700" : "text-rose-700"}`}><span className="inline-flex items-center gap-1">{profitable ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{profitable ? "+" : ""}{trade.pnlPct.toFixed(2)}%</span></td></tr>; })}{!filteredTrades.length && <tr><td colSpan={5} className="px-6 py-10 text-center text-xs text-slate-500">No closed trades match these filters.</td></tr>}</tbody></table></div>
        <p className="border-t border-slate-100 px-5 py-3 text-[10px] leading-5 text-slate-400 sm:px-6" role={error ? "status" : undefined}>{error || `Source: CoinGecko · fetched ${fetchedAt ? new Date(fetchedAt).toLocaleString() : "—"} · ${loaded.length} of ${MARKET_ASSETS.length} assets loaded.`} <a href="https://www.coingecko.com/en/api" target="_blank" rel="noreferrer" className="underline underline-offset-2">Data provider</a></p>
      </section>
    </>}
  </div>;
}
