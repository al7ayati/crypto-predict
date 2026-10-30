import React from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Coins, Gauge, RefreshCw } from "lucide-react";
import { BINANCE_MARKET_DATA_URL, COINGECKO_ATTRIBUTION_URL, MARKET_ASSETS } from "../services/marketData";
import { formatUtcTimestamp } from "../utils/formatting";

const STAT_ICONS = [Coins, BarChart3, Gauge, RefreshCw];

function compactCurrency(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2,
  }).format(value);
}

function formatPrice(price) {
  if (!Number.isFinite(price)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 4 : 2,
  }).format(price);
}

function formatTime(timestamp) {
  if (!timestamp) return "Waiting for data";
  return formatUtcTimestamp(timestamp);
}

function Sparkline({ values, symbol }) {
  if (values.length < 2) return <span className="text-xs text-slate-400">—</span>;
  const width = 112;
  const height = 34;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / (max - min || 1)) * (height - 5) - 2;
    return `${x},${y}`;
  }).join(" ");
  const rising = values.at(-1) >= values[0];
  return <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-24" role="img" aria-label={`${symbol} observed 7-day price trend`}>
    <polyline points={points} fill="none" stroke={rising ? "#176b44" : "#b42335"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function StatCard({ stat, index }) {
  const Icon = STAT_ICONS[index] || BarChart3;
  const IconChange = stat.changePct === null ? null : stat.changePct >= 0 ? ArrowUpRight : ArrowDownRight;
  return <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[.025]">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-500">{stat.label}</span>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={17} aria-hidden="true" /></span>
    </div>
    <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{stat.value}</p>
    <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500">
      {IconChange && <IconChange size={14} className={stat.changePct >= 0 ? "text-emerald-600" : "text-rose-600"} />}
      {stat.changeLabel}
    </p>
    <p className="mt-1 text-[10px] text-slate-400">{stat.context}</p>
  </article>;
}

export default function DashboardPage({ marketData, liveTradePrices = {}, tradeStreamStatus = "offline", onRefresh }) {
  const snapshot = marketData.snapshot;
  const bySymbol = new Map((snapshot?.assets || []).map((asset) => [asset.symbol, asset]));
  const assets = MARKET_ASSETS.map((asset) => ({ ...asset, ...bySymbol.get(asset.symbol) }));
  const allMarketCapsAvailable = snapshot?.assets.every((asset) => Number.isFinite(asset.marketCapUsd));
  const allVolumesAvailable = snapshot?.assets.every((asset) => Number.isFinite(asset.volume24hUsd));
  const trackedCap = allMarketCapsAvailable ? snapshot.assets.reduce((sum, asset) => sum + asset.marketCapUsd, 0) : null;
  const trackedVolume = allVolumesAvailable ? snapshot.assets.reduce((sum, asset) => sum + asset.volume24hUsd, 0) : null;
  const bitcoinCap = bySymbol.get("BTC")?.marketCapUsd;
  const bitcoinChange = bySymbol.get("BTC")?.change24hPct;
  const stats = snapshot ? [
    { label: "Tracked market cap", value: compactCurrency(trackedCap), changePct: null, changeLabel: "BTC, ETH, SOL, XRP, ADA", context: "Sum of CoinGecko reported market caps" },
    { label: "Tracked 24h volume", value: compactCurrency(trackedVolume), changePct: null, changeLabel: "BTC, ETH, SOL, XRP, ADA", context: "Sum of reported 24-hour volumes" },
    { label: "BTC share of tracked cap", value: trackedCap > 0 && Number.isFinite(bitcoinCap) ? `${((bitcoinCap / trackedCap) * 100).toFixed(1)}%` : "—", changePct: null, changeLabel: "BTC market cap ÷ tracked cap", context: "Not global BTC dominance" },
    { label: "Bitcoin 24h change", value: Number.isFinite(bitcoinChange) ? `${bitcoinChange >= 0 ? "+" : ""}${bitcoinChange.toFixed(2)}%` : "—", changePct: bitcoinChange ?? null, changeLabel: "Since previous 24 hours", context: "CoinGecko reported percentage" },
  ] : [];
  const status = marketData.status;
  const statusLabel = status === "live" ? "Market data loaded" : status === "refreshing" ? "Updating market data" : status === "stale" ? "Showing last successful data" : status === "error" ? "Market data unavailable" : "Loading market data";
  const providerTimes = (snapshot?.assets || []).map((asset) => Date.parse(asset.providerUpdatedAt)).filter(Number.isFinite);
  const newestProviderUpdate = providerTimes.length ? new Date(Math.max(...providerTimes)).toISOString() : null;
  const streamLabel = tradeStreamStatus === "live" ? "Binance trade stream connected" : tradeStreamStatus === "reconnecting" ? "Binance trade stream reconnecting; using CoinGecko prices" : tradeStreamStatus === "connecting" ? "Connecting to Binance; using CoinGecko prices" : "Binance stream offline; using CoinGecko prices";
  const sourceNote = `${marketData.error ? `${marketData.error} · ` : ""}CoinGecko market metadata queried ${formatTime(snapshot?.fetchedAt)}${newestProviderUpdate ? ` · provider timestamp ${formatTime(newestProviderUpdate)}` : ""} · ${streamLabel}.`;

  const freshTrade = (symbol) => {
    const quote = liveTradePrices[symbol];
    return tradeStreamStatus === "live" && quote && Date.now() - quote.timestamp < 60_000 ? quote : null;
  };
  const formatQuote = (asset, quote) => {
    if (quote) {
      return `${quote.price.toLocaleString("en-US", { minimumFractionDigits: quote.price < 1 ? 4 : 2, maximumFractionDigits: quote.price < 1 ? 8 : 2 })} USDT`;
    }
    return formatPrice(asset.priceUsd);
  };

  return <div className="space-y-7">
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-blue-600">Market snapshot</p>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">The market at a glance</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${status === "live" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
            <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-emerald-500" : "bg-amber-500"}`} />{statusLabel}
          </span>
          <button type="button" onClick={onRefresh} disabled={status === "loading" || status === "refreshing"} aria-label="Refresh market data" title="Refresh market data" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw size={15} className={status === "loading" || status === "refreshing" ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      {snapshot && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat, index) => <StatCard key={stat.label} stat={stat} index={index} />)}</div>}
      {!snapshot && status === "loading" && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading live quotes from CoinGecko…</p>}
      {!snapshot && status === "error" && <p className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">{marketData.error} No sample prices are shown as market data.</p>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[.025]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div><h2 className="text-base font-bold text-slate-900">Market overview</h2><p className="mt-1 text-xs text-slate-500">Binance Spot last trades (USDT) with CoinGecko aggregated USD fallback</p></div>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500">{assets.length} assets</span>
      </div>
      <div className="market-table-wrap">
        <table className="market-overview-table w-full min-w-[780px] border-collapse text-left">
          <thead><tr className="bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-6 py-3.5">Asset</th><th className="px-4 py-3.5">Last trade (USDT)*</th><th className="px-4 py-3.5">24h Change</th><th className="px-4 py-3.5">24h Volume (USD)</th><th className="px-4 py-3.5">Market cap (USD)</th><th className="px-6 py-3.5">Observed 7D trend</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">{assets.map((asset) => <tr key={asset.symbol} className="transition hover:bg-slate-50/70">
            <td data-label="Asset" className="px-6 py-4"><div className="flex items-center gap-3"><span className="market-asset-icon">{asset.imageUrl && <img src={asset.imageUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}<span>{asset.symbol}</span></span><span><strong className="block text-sm font-semibold text-slate-800">{asset.name}</strong><span className="mt-0.5 block text-[11px] text-slate-400">{asset.symbol}</span></span></div></td>
            <td data-label="Last trade (USDT)" className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-800">{formatQuote(asset, freshTrade(asset.symbol))}<span className="block text-[9px] font-normal text-slate-400">{freshTrade(asset.symbol) ? `Binance Spot · ${formatTime(new Date(liveTradePrices[asset.symbol].timestamp).toISOString())}` : "CoinGecko aggregated USD"}</span></td>
            <td data-label="24h Change" className="px-4 py-4 text-sm font-semibold tabular-nums"><span className={`market-change-badge ${!Number.isFinite(asset.change24hPct) ? "is-neutral" : asset.change24hPct >= 0 ? "is-positive" : "is-negative"}`} aria-label={Number.isFinite(asset.change24hPct) ? `24-hour change ${asset.change24hPct >= 0 ? "up" : "down"} ${Math.abs(asset.change24hPct).toFixed(2)} percent` : "24-hour change unavailable"}>{Number.isFinite(asset.change24hPct) ? `${asset.change24hPct >= 0 ? "+" : ""}${asset.change24hPct.toFixed(2)}%` : "—"}</span></td>
            <td data-label="24h Volume (USD)" className="px-4 py-4 text-sm text-slate-600">{compactCurrency(asset.volume24hUsd)}</td>
            <td data-label="Market cap (USD)" className="px-4 py-4 text-sm text-slate-600">{compactCurrency(asset.marketCapUsd)}</td>
            <td data-label="7-day trend" className="px-6 py-4"><Sparkline values={asset.sparkline7d || []} symbol={asset.symbol} /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] leading-5 text-slate-400 sm:px-6">
        <span>{sourceNote} *A Binance trade is priced in USDT; CoinGecko fallback is an aggregated USD quote. Tracked cap and volume use CoinGecko's reported per-asset fields.</span>
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          <a href={BINANCE_MARKET_DATA_URL} target="_blank" rel="noreferrer" className="font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2">Binance Spot trades</a>
          <a href={COINGECKO_ATTRIBUTION_URL} target="_blank" rel="noreferrer" className="font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2">CoinGecko market data</a>
        </span>
      </div>
    </section>
  </div>;
}
