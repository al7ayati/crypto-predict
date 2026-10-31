import React, { lazy, Suspense, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BellPlus,
  Coins,
  Gauge,
  Info,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  BINANCE_KLINES_DOCUMENTATION_URL,
  BINANCE_MARKET_DATA_URL,
  COINGECKO_ATTRIBUTION_URL,
  calculateDailyPerformance,
  fetchSevenDayCandles,
  MARKET_ASSETS,
} from "../services/marketData";
import LiveDataStatus from "../components/LiveDataStatus";
import { formatUtcTimestamp } from "../utils/formatting";

const STAT_ICONS = [Coins, BarChart3, Gauge, RefreshCw];
const DailyTrendChart = lazy(() => import("../components/DailyTrendChart.jsx"));

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

function formatUsdtPrice(price) {
  if (!Number.isFinite(price)) return "—";
  return `${price.toLocaleString("en-US", {
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 8 : 2,
  })} USDT`;
}

function formatTime(timestamp) {
  if (!timestamp) return "Waiting for data";
  return formatUtcTimestamp(timestamp);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function StatCard({ stat, index }) {
  const Icon = STAT_ICONS[index] || BarChart3;
  const IconChange = stat.changePct === null ? null : stat.changePct >= 0 ? ArrowUpRight : ArrowDownRight;
  return <article className="dashboard-stat-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[.025]">
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

function PulseCard({ label, asset, value, tone = "neutral", description }) {
  const Icon = tone === "positive" ? TrendingUp : tone === "negative" ? TrendingDown : Info;
  return <article className={`pulse-card is-${tone}`}>
    <span className="pulse-card-icon"><Icon size={16} aria-hidden="true" /></span>
    <span className="pulse-card-label">{label}</span>
    <strong>{asset || "—"}</strong>
    <span className="pulse-card-value">{value}</span>
    <span className="pulse-card-description">{description}</span>
  </article>;
}

export default function DashboardPage({ marketData, liveTradePrices = {}, tradeStreamStatus = "offline", onRefresh, onCreateAlert }) {
  const [selectedTrendSymbol, setSelectedTrendSymbol] = useState("BTC");
  const snapshot = marketData.snapshot;
  const bySymbol = new Map((snapshot?.assets || []).map((asset) => [asset.symbol, asset]));
  const assets = MARKET_ASSETS.map((asset) => ({ ...asset, ...bySymbol.get(asset.symbol) }));
  const todayUtc = new Date().toISOString().slice(0, 10);
  const trendQueries = useQueries({
    queries: MARKET_ASSETS.map(({ symbol }) => ({
      queryKey: ["dashboard-daily-trend", symbol, todayUtc],
      queryFn: ({ signal }) => fetchSevenDayCandles(symbol, Date.now(), signal),
      staleTime: 5 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    })),
  });
  const performanceBySymbol = new Map(MARKET_ASSETS.map((asset, index) => {
    const query = trendQueries[index];
    return [asset.symbol, {
      ...calculateDailyPerformance(query.data),
      error: query.error?.message || "",
      isLoading: query.isPending,
      isRefreshing: query.isFetching,
      updatedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toISOString() : null,
    }];
  }));
  const availableDailyPerformance = MARKET_ASSETS
    .map((asset) => ({ ...asset, ...performanceBySymbol.get(asset.symbol) }))
    .filter((asset) => Number.isFinite(asset.dailyChangePct));
  const availableWeeklyPerformance = MARKET_ASSETS
    .map((asset) => ({ ...asset, ...performanceBySymbol.get(asset.symbol) }))
    .filter((asset) => Number.isFinite(asset.sevenDayChangePct));
  const advancingCount = availableDailyPerformance.filter((asset) => asset.dailyChangePct > 0).length;
  const decliningCount = availableDailyPerformance.filter((asset) => asset.dailyChangePct < 0).length;
  const weeklyMovers = [...availableWeeklyPerformance].sort((left, right) => left.sevenDayChangePct - right.sevenDayChangePct);
  const weakestWeeklyMover = weeklyMovers[0];
  const strongestWeeklyMover = weeklyMovers.at(-1);
  const strongestTone = strongestWeeklyMover
    ? strongestWeeklyMover.sevenDayChangePct >= 0 ? "positive" : "negative"
    : "neutral";
  const weakestTone = weakestWeeklyMover
    ? weakestWeeklyMover.sevenDayChangePct >= 0 ? "positive" : "negative"
    : "neutral";
  const selectedPerformance = performanceBySymbol.get(selectedTrendSymbol);
  const chartData = selectedPerformance?.candles || [];
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
    { label: "Bitcoin 24h change", value: Number.isFinite(bitcoinChange) ? formatPercent(bitcoinChange) : "—", changePct: bitcoinChange ?? null, changeLabel: "CoinGecko rolling 24 hours", context: "Aggregated USD percentage" },
  ] : [];
  const status = marketData.status;
  const providerTimes = (snapshot?.assets || []).map((asset) => Date.parse(asset.providerUpdatedAt)).filter(Number.isFinite);
  const newestProviderUpdate = providerTimes.length ? new Date(Math.max(...providerTimes)).toISOString() : null;
  const streamLabel = tradeStreamStatus === "live" ? "Binance trade stream connected" : tradeStreamStatus === "reconnecting" ? "Binance trade stream reconnecting; using CoinGecko prices" : tradeStreamStatus === "connecting" ? "Connecting to Binance; using CoinGecko prices" : "Binance stream offline; using CoinGecko prices";
  const sourceNote = `${marketData.error ? `${marketData.error} · ` : ""}CoinGecko market metadata queried ${formatTime(snapshot?.fetchedAt)}${newestProviderUpdate ? ` · provider timestamp ${formatTime(newestProviderUpdate)}` : ""} · ${streamLabel}.`;

  const freshTrade = (symbol) => {
    const quote = liveTradePrices[symbol];
    return tradeStreamStatus === "live" && quote && Date.now() - quote.timestamp < 60_000 ? quote : null;
  };
  const formatQuote = (asset, quote) => quote ? formatUsdtPrice(quote.price) : formatPrice(asset.priceUsd);
  const refreshDashboardData = () => {
    onRefresh?.();
    trendQueries.forEach((query) => void query.refetch());
  };
  const dashboardRefreshing = status === "refreshing" || trendQueries.some((query) => query.isFetching);
  const dailyQueryFailed = trendQueries.some((query) => query.isError && !query.data);
  const dailyQueriesLoading = trendQueries.some((query) => query.isPending);

  return <div className="dashboard-page space-y-7">
    <LiveDataStatus
      marketData={marketData}
      tradeStreamStatus={tradeStreamStatus}
      liveTradePrices={liveTradePrices}
      refreshing={dashboardRefreshing}
      onRefresh={refreshDashboardData}
    />
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-blue-600">Market snapshot</p>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">The market at a glance</h2>
        </div>
      </div>
      {snapshot && <div className="dashboard-stat-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat, index) => <StatCard key={stat.label} stat={stat} index={index} />)}</div>}
      {!snapshot && status === "error" && <p className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">{marketData.error} No sample prices are shown as market data.</p>}
    </section>

    <section className="daily-insights-section" aria-labelledby="market-pulse-heading">
      <div className="daily-insights-heading">
        <div>
          <p className="dashboard-kicker">Daily market intelligence</p>
          <h2 id="market-pulse-heading">Market Pulse</h2>
          <p>Daily-close movement across the five tracked assets. No forecast or imputed values.</p>
        </div>
        <div className="daily-insights-actions">
          <span className="daily-data-badge"><span /> Binance Spot · 1D</span>
          <button type="button" className="dashboard-alert-button" onClick={() => onCreateAlert?.(selectedTrendSymbol)}><BellPlus size={14} /> Create alert</button>
        </div>
      </div>
      <div className="pulse-card-grid">
        <PulseCard
          label="Daily breadth"
          asset={availableDailyPerformance.length ? `${advancingCount} advancing · ${decliningCount} declining` : dailyQueriesLoading ? "Loading" : "Unavailable"}
          value={`${availableDailyPerformance.length}/${MARKET_ASSETS.length} assets`}
          description="Change between consecutive completed UTC daily closes"
          tone={advancingCount > decliningCount ? "positive" : decliningCount > advancingCount ? "negative" : "neutral"}
        />
        <PulseCard
          label="Strongest 7D"
          asset={strongestWeeklyMover?.symbol || (dailyQueriesLoading ? "Loading" : "Unavailable")}
          value={strongestWeeklyMover ? formatPercent(strongestWeeklyMover.sevenDayChangePct) : "—"}
          description="Return over seven elapsed UTC days"
          tone={strongestTone}
        />
        <PulseCard
          label="Weakest 7D"
          asset={weakestWeeklyMover?.symbol || (dailyQueriesLoading ? "Loading" : "Unavailable")}
          value={weakestWeeklyMover ? formatPercent(weakestWeeklyMover.sevenDayChangePct) : "—"}
          description="Return over seven elapsed UTC days"
          tone={weakestTone}
        />
      </div>

      <div className="daily-analysis-grid">
        <section className="daily-trend-panel" aria-labelledby="daily-trend-heading">
          <div className="daily-trend-heading">
            <div>
              <span className="dashboard-kicker">7-day price history</span>
              <h3 id="daily-trend-heading">Daily close trend</h3>
            </div>
            <label className="trend-symbol-picker">
              <span className="sr-only">Select asset for daily close chart</span>
              <select value={selectedTrendSymbol} onChange={(event) => setSelectedTrendSymbol(event.target.value)} aria-label="Select asset for daily close chart">
                {MARKET_ASSETS.map(({ symbol, name }) => <option value={symbol} key={symbol}>{symbol} · {name}</option>)}
              </select>
            </label>
          </div>
          <div className="daily-trend-summary">
            <strong className={selectedPerformance?.sevenDayChangePct >= 0 ? "is-positive" : "is-negative"}>
              {formatPercent(selectedPerformance?.sevenDayChangePct)}
            </strong>
            <span>{selectedPerformance?.candles.length === 8 ? `${selectedPerformance.candles[0].date} — ${selectedPerformance.candles.at(-1).date} UTC` : "Requires eight contiguous completed daily closes"}</span>
          </div>
          {selectedPerformance?.sevenDayChangePct !== null && Number.isFinite(selectedPerformance?.sevenDayChangePct) ? (
            <Suspense fallback={<div className="daily-trend-empty" role="status">Loading interactive chart…</div>}>
              <DailyTrendChart candles={chartData} symbol={selectedTrendSymbol} />
            </Suspense>
          ) : (
            <div className="daily-trend-empty" role={selectedPerformance?.error ? "alert" : "status"}>
              {selectedPerformance?.isLoading
                ? "Loading completed daily candles…"
                : selectedPerformance?.error
                  ? `Binance daily data unavailable: ${selectedPerformance.error}`
                  : "A 7-day chart needs eight consecutive completed UTC daily closes. Missing dates are not interpolated."}
            </div>
          )}
          {selectedPerformance?.sevenDayChangePct !== null && Number.isFinite(selectedPerformance?.sevenDayChangePct) && (
            <details className="daily-close-details">
              <summary>View the eight daily close values</summary>
              <div className="daily-close-list">
                {chartData.map((candle) => <span key={candle.date}><time dateTime={candle.date}>{candle.date}</time><strong>{formatUsdtPrice(candle.close)}</strong></span>)}
              </div>
            </details>
          )}
          <p className="daily-trend-footnote">Close prices use the Binance Spot {selectedTrendSymbol}/USDT pair, quoted in USDT. The 7D return compares the first and last of eight completed daily candles; it is not a rolling 168-hour USD return. Data fetched {formatTime(selectedPerformance?.updatedAt)}.</p>
        </section>

        <section className="daily-comparison-panel" aria-labelledby="daily-comparison-heading">
          <div className="daily-trend-heading">
            <div>
              <span className="dashboard-kicker">Realized daily closes</span>
              <h3 id="daily-comparison-heading">Asset comparison</h3>
            </div>
            <span className="comparison-count">{MARKET_ASSETS.length} assets</span>
          </div>
          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead><tr><th>Asset</th><th>1D close</th><th>7D return</th></tr></thead>
              <tbody>
                {MARKET_ASSETS.map((asset) => {
                  const performance = performanceBySymbol.get(asset.symbol);
                  return <tr key={asset.symbol}>
                    <th scope="row"><button type="button" className="comparison-asset-button" onClick={() => setSelectedTrendSymbol(asset.symbol)} aria-label={`Show ${asset.name} daily close chart`} aria-pressed={selectedTrendSymbol === asset.symbol}><span>{asset.symbol}</span><small>{asset.name}</small></button></th>
                    <td className={performance.dailyChangePct > 0 ? "is-positive" : performance.dailyChangePct < 0 ? "is-negative" : ""}>{performance.isLoading && !performance.candles.length ? "Loading" : formatPercent(performance.dailyChangePct)}</td>
                    <td className={performance.sevenDayChangePct > 0 ? "is-positive" : performance.sevenDayChangePct < 0 ? "is-negative" : ""} title={performance.sevenDayChangePct === null ? "Requires eight consecutive completed UTC daily closes; missing values are not estimated." : "Calculated from Binance Spot daily close prices."}>{performance.isLoading && !performance.candles.length ? "Loading" : formatPercent(performance.sevenDayChangePct)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {dailyQueryFailed && <p className="daily-query-warning" role="status">Some Binance daily data could not be loaded. Values remain unavailable rather than being estimated.</p>}
          <p className="comparison-footnote">1D = latest completed daily close versus the prior UTC daily close. 7D = first versus last close across seven complete UTC calendar-day intervals.</p>
        </section>
      </div>
      <details className="metric-guide">
        <summary><Info size={15} aria-hidden="true" /> How to read these numbers</summary>
        <div className="metric-guide-content">
          <p><strong>1D / 7D:</strong> Binance Spot daily-close returns for the named {`SYMBOL/USDT`} pair. 1D is not a rolling 24-hour change. 7D requires eight consecutive completed UTC daily closes.</p>
          <p><strong>USDT vs USD:</strong> USDT is the Binance pair quote asset and is not assumed to equal USD. CoinGecko price, market cap, and volume are separately identified as aggregated USD data.</p>
          <p><strong>Market cap / volume:</strong> These dashboard totals cover only BTC, ETH, SOL, XRP, and ADA. They are not total crypto market capitalization or global BTC dominance.</p>
        </div>
      </details>
      <div className="daily-source-links">
        <span>Daily market history is sourced from completed Binance Spot candles.</span>
        <a href={BINANCE_KLINES_DOCUMENTATION_URL} target="_blank" rel="noreferrer">Binance daily kline API documentation</a>
        <a href={BINANCE_MARKET_DATA_URL} target="_blank" rel="noreferrer">Binance markets</a>
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[.025]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div><h2 className="text-base font-bold text-slate-900">Market overview</h2><p className="mt-1 text-xs text-slate-500">Live Binance Spot last trades (USDT) with CoinGecko aggregated USD fallback</p></div>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500">{assets.length} assets</span>
      </div>
      <div className="market-table-wrap">
        <table className="market-overview-table w-full min-w-[780px] border-collapse text-left">
          <thead><tr className="bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-6 py-3.5">Asset</th><th className="px-4 py-3.5">Last trade*</th><th className="px-4 py-3.5">24h change · USD</th><th className="px-4 py-3.5">1D close · USDT</th><th className="px-4 py-3.5">7D return · USDT</th><th className="px-4 py-3.5">24h volume · USD</th><th className="px-6 py-3.5">Market cap · USD</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">{assets.map((asset) => {
            const performance = performanceBySymbol.get(asset.symbol);
            return <tr key={asset.symbol} className="transition hover:bg-slate-50/70">
              <td data-label="Asset" className="px-6 py-4"><div className="flex items-center gap-3"><span className="market-asset-icon">{asset.imageUrl && <img src={asset.imageUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}<span>{asset.symbol}</span></span><span><strong className="block text-sm font-semibold text-slate-800">{asset.name}</strong><span className="mt-0.5 block text-[11px] text-slate-400">{asset.symbol}</span></span></div></td>
              <td data-label="Last trade" className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-800">{formatQuote(asset, freshTrade(asset.symbol))}<span className="block text-[9px] font-normal text-slate-400">{freshTrade(asset.symbol) ? `Binance Spot · ${formatTime(new Date(liveTradePrices[asset.symbol].timestamp).toISOString())}` : "CoinGecko aggregated USD"}</span></td>
              <td data-label="24h change · USD" className="px-4 py-4 text-sm font-semibold tabular-nums"><span className={`market-change-badge ${!Number.isFinite(asset.change24hPct) ? "is-neutral" : asset.change24hPct >= 0 ? "is-positive" : "is-negative"}`} aria-label={Number.isFinite(asset.change24hPct) ? `CoinGecko aggregated 24-hour change ${asset.change24hPct >= 0 ? "up" : "down"} ${Math.abs(asset.change24hPct).toFixed(2)} percent` : "24-hour change unavailable"}>{Number.isFinite(asset.change24hPct) ? formatPercent(asset.change24hPct) : "—"}</span></td>
              <td data-label="1D close · USDT" className={`px-4 py-4 text-sm font-semibold tabular-nums ${performance.dailyChangePct > 0 ? "is-positive" : performance.dailyChangePct < 0 ? "is-negative" : ""}`}>{performance.isLoading && !performance.candles.length ? "Loading" : formatPercent(performance.dailyChangePct)}</td>
              <td data-label="7D return · USDT" className={`px-4 py-4 text-sm font-semibold tabular-nums ${performance.sevenDayChangePct > 0 ? "is-positive" : performance.sevenDayChangePct < 0 ? "is-negative" : ""}`} title={performance.sevenDayChangePct === null ? "Requires eight consecutive completed UTC daily closes." : "Seven UTC calendar-day return from Binance Spot closes."}>{performance.isLoading && !performance.candles.length ? "Loading" : formatPercent(performance.sevenDayChangePct)}</td>
              <td data-label="24h volume · USD" className="px-4 py-4 text-sm text-slate-600">{compactCurrency(asset.volume24hUsd)}</td>
              <td data-label="Market cap · USD" className="px-6 py-4 text-sm text-slate-600">{compactCurrency(asset.marketCapUsd)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] leading-5 text-slate-400 sm:px-6">
        <span>{sourceNote} *A Binance trade is priced in USDT; CoinGecko fallback is an aggregated USD quote. Market cap and volume use CoinGecko-reported USD fields.</span>
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          <a href={BINANCE_MARKET_DATA_URL} target="_blank" rel="noreferrer" className="font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2">Binance Spot trades</a>
          <a href={COINGECKO_ATTRIBUTION_URL} target="_blank" rel="noreferrer" className="font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2">CoinGecko market data</a>
        </span>
      </div>
    </section>
  </div>;
}
