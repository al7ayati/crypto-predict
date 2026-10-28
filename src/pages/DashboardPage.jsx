import React, { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, BrainCircuit, Coins, Gauge, RefreshCw } from "lucide-react";
import { MOCK_MARKET_ASSETS, MOCK_MARKET_STATS } from "../data/mockMarketData";

const STAT_ICONS = [Coins, BarChart3, Gauge, BrainCircuit];
const COINGECKO_IDS = ["bitcoin", "ethereum", "solana", "ripple", "cardano"];

function compactCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function Sparkline({ values, positive, symbol }) {
  const width = 112;
  const height = 34;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * (height - 5) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-24" role="img" aria-label={`${symbol} 7-day price trend`}>
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#0ba77b" : "#df5365"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 4 : 2,
  }).format(price);
}

export default function DashboardPage({ marketStats = MOCK_MARKET_STATS, marketAssets = MOCK_MARKET_ASSETS }) {
  const [assets, setAssets] = useState(marketAssets);
  const [stats, setStats] = useState(marketStats);
  const [dataState, setDataState] = useState("loading");
  const [dataError, setDataError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadMarketData = useCallback(async (signal) => {
    setRefreshing(true);
    setDataError("");

    try {
      const marketUrl = new URL("https://api.coingecko.com/api/v3/coins/markets");
      marketUrl.search = new URLSearchParams({
        vs_currency: "usd",
        ids: COINGECKO_IDS.join(","),
        price_change_percentage: "24h",
        sparkline: "true",
      }).toString();
      const globalUrl = "https://api.coingecko.com/api/v3/global";

      const [marketResponse, globalResponse] = await Promise.all([
        fetch(marketUrl, { signal, headers: { accept: "application/json" } }),
        fetch(globalUrl, { signal, headers: { accept: "application/json" } }),
      ]);
      if (!marketResponse.ok || !globalResponse.ok) {
        throw new Error(`Market provider returned HTTP ${!marketResponse.ok ? marketResponse.status : globalResponse.status}`);
      }

      const [liveRows, globalResult] = await Promise.all([
        marketResponse.json(),
        globalResponse.json(),
      ]);
      if (!Array.isArray(liveRows)) throw new Error("Market provider returned an invalid asset list");
      const liveBySymbol = new Map(liveRows.map((row) => [row.symbol?.toUpperCase(), row]));
      const mappedAssets = marketAssets.map((asset) => {
        const row = liveBySymbol.get(asset.symbol);
        if (!row || typeof row.current_price !== "number" || typeof row.total_volume !== "number") {
          throw new Error(`Market provider did not return valid ${asset.symbol} data`);
        }
        const trend = row.sparkline_in_7d?.price;
        return {
          ...asset,
          price: row.current_price,
          change: row.price_change_percentage_24h ?? asset.change,
          volume: compactCurrency(row.total_volume),
          trend: Array.isArray(trend) && trend.length > 1
            ? trend.filter((_, index) => index % Math.ceil(trend.length / 12) === 0)
            : asset.trend,
        };
      });

      const globalData = globalResult?.data;
      const marketCap = globalData?.total_market_cap?.usd;
      const totalVolume = globalData?.total_volume?.usd;
      const btcDominance = globalData?.market_cap_percentage?.btc;
      if (![marketCap, totalVolume, btcDominance, globalData?.market_cap_change_percentage_24h_usd]
        .every((value) => typeof value === "number" && Number.isFinite(value))) {
        throw new Error("Market provider returned incomplete global market data");
      }

      const marketCapChange = globalData.market_cap_change_percentage_24h_usd;
      setAssets(mappedAssets);
      setStats([
        {
          label: "Total Market Cap",
          value: compactCurrency(marketCap),
          change: `${marketCapChange >= 0 ? "+" : ""}${marketCapChange.toFixed(2)}%`,
          positive: marketCapChange >= 0,
          context: "24h change · live",
        },
        { label: "24h Volume", value: compactCurrency(totalVolume), change: "Live", positive: null, context: "Global trading volume" },
        { label: "BTC Dominance", value: `${btcDominance.toFixed(1)}%`, change: "Live", positive: null, context: "Share of global market" },
        marketStats[3],
      ]);
      setDataState("live");
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Live market data request failed:", error);
        setAssets(marketAssets);
        setStats(marketStats);
        setDataState("sample");
        setDataError("Live market data is unavailable. Showing clearly labeled sample values instead.");
      }
    } finally {
      if (!signal?.aborted) setRefreshing(false);
    }
  }, [marketAssets, marketStats]);

  useEffect(() => {
    const controller = new AbortController();
    loadMarketData(controller.signal);
    const intervalId = window.setInterval(() => loadMarketData(controller.signal), 60_000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [loadMarketData]);

  return (
    <div className="space-y-7">
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-blue-600">Market snapshot</p>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">The market at a glance</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${dataState === "live" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
              <span className={`h-2 w-2 rounded-full ${dataState === "live" ? "bg-emerald-500" : "bg-amber-500"}`} />
              {dataState === "loading" ? "Connecting to market data" : dataState === "live" ? "Live market data" : "Sample market data"}
            </span>
            <button
              type="button"
              onClick={() => loadMarketData()}
              disabled={refreshing}
              aria-label="Refresh market data"
              title="Refresh market data"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = STAT_ICONS[index] || BarChart3;
            return (
              <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[.025]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${stat.positive === null ? "text-slate-500" : stat.positive ? "text-emerald-600" : "text-rose-600"}`}>
                  {stat.positive === null ? null : stat.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.change}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">{stat.context}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[.025]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Market overview</h2>
            <p className="mt-1 text-xs text-slate-500">Live prices and volume with clearly labeled demonstration AI signals</p>
          </div>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500">5 assets</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[790px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Asset</th>
                <th className="px-4 py-3.5">Price</th>
                <th className="px-4 py-3.5">24h Change</th>
                <th className="px-4 py-3.5">24h Volume</th>
                <th className="px-4 py-3.5">7D Trend</th>
                <th className="px-6 py-3.5 text-right">AI Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map((asset) => {
                const positive = asset.change >= 0;
                const signalStyles = {
                  Buy: "bg-emerald-50 text-emerald-700 ring-emerald-100",
                  Hold: "bg-amber-50 text-amber-700 ring-amber-100",
                  Sell: "bg-rose-50 text-rose-700 ring-rose-100",
                };
                return (
                  <tr key={asset.symbol} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-[10px] font-bold text-white">{asset.symbol.slice(0, 3)}</span>
                        <span>
                          <strong className="block text-sm font-semibold text-slate-800">{asset.name}</strong>
                          <span className="mt-0.5 block text-[11px] text-slate-400">{asset.symbol}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-800">{formatPrice(asset.price)}</td>
                    <td className={`px-4 py-4 text-sm font-semibold tabular-nums ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                      {positive ? "+" : ""}{asset.change.toFixed(2)}%
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{asset.volume}</td>
                    <td className="px-4 py-4"><Sparkline values={asset.trend} positive={positive} symbol={asset.symbol} /></td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${signalStyles[asset.signal] || signalStyles.Hold}`}>
                        {asset.signal}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-[10px] leading-5 text-slate-400 sm:px-6" role={dataError ? "status" : undefined}>
          {dataError || (dataState === "live"
            ? "Market data refreshes every 60 seconds from CoinGecko. AI signals remain illustrative mock data and are not trade recommendations."
            : "Market values and AI signals shown are sample data. Live values are fetched from CoinGecko when available. AI signals remain illustrative mock data.")}
        </p>
      </section>
    </div>
  );
}
