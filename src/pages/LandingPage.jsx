import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Clock3,
  RefreshCw, Sparkles, Target, TrendingUp
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import cryptoData from "../data/cryptoData.json";

const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", color: "#F7931A" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  { id: "cardano", symbol: "ADA", name: "Cardano", color: "#2A6DF4" }
];

const fallbackMarket = COINS.map((coin) => ({
  ...coin,
  current_price: cryptoData[coin.symbol].currentPrice,
  price_change_percentage_24h: null,
  market_cap_rank: null,
  image: null
}));

const money = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2
  }).format(value);
};

function Sparkline({ color, positive }) {
  const points = positive
    ? "0,24 13,18 25,22 37,10 49,15 61,6 74,12 87,3"
    : "0,5 13,13 25,8 37,20 49,13 61,25 74,18 87,29";
  return (
    <svg className="mini-sparkline" viewBox="0 0 87 34" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingPage({ assetData, onNavigate }) {
  const [market, setMarket] = useState(fallbackMarket);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [marketError, setMarketError] = useState(false);

  const loadMarket = useCallback(async (signal) => {
    setLoading(true);
    setMarketError(false);
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin%2Cethereum%2Ccardano&price_change_percentage=24h",
        { signal, headers: { accept: "application/json" } }
      );
      if (!response.ok) throw new Error("Market API unavailable");
      const result = await response.json();
      const liveRows = COINS.map((coin) => result.find((entry) => entry.id === coin.id));
      if (liveRows.some((item) => !item || typeof item.current_price !== "number")) {
        throw new Error("Incomplete market response");
      }
      const mapped = COINS.map((coin, index) => ({ ...coin, ...liveRows[index] }));
      setMarket(mapped);
      setIsLive(true);
      setLastUpdated(new Date());
    } catch (error) {
      if (error.name !== "AbortError") {
        setMarket(fallbackMarket);
        setIsLive(false);
        setMarketError(true);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadMarket(controller.signal);
    return () => controller.abort();
  }, [loadMarket]);

  const upside = (((assetData.forecastPrice - assetData.currentPrice) / assetData.currentPrice) * 100);
  const modelTrend = upside >= 0 ? "positive" : "negative";
  const chartData = assetData.series.map((row) => ({
    ...row,
    label: row.label,
    actual: row.actual,
    forecast: row.forecast
  }));

  return (
    <div className="landing-page">
      <section className="welcome-row">
        <div>
          <div className="eyebrow page-eyebrow"><Sparkles size={14} /> YOUR CRYPTO WORKSPACE</div>
          <h2>Market overview</h2>
          <p className="page-lede">Your cryptocurrency market overview, paired with forecasts from the project's demonstration model.</p>
        </div>
        <div className="market-status">
          <span className={isLive ? "live-indicator is-live" : "live-indicator"} />
          <div>
            <strong>{isLive ? "Market data connected" : "Model dataset snapshot"}</strong>
            <span>{lastUpdated && isLive ? "Updated " + lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Fallback values · not live"}</span>
          </div>
          <button className="icon-button refresh-button" type="button" onClick={() => loadMarket()} disabled={loading} aria-label="Refresh market prices" title="Refresh market prices">
            <RefreshCw size={16} className={loading ? "is-spinning" : ""} />
          </button>
        </div>
      </section>

      <section className="market-section">
        <div className="section-heading">
          <div><h3>Market watch</h3><p>{isLive ? "USD market prices and 24-hour changes." : "Stored project values · not live market prices."}</p></div>
          <span className="section-tag"><Clock3 size={13} /> {isLive ? "LIVE SNAPSHOT" : "DATASET"}</span>
        </div>
        <div className="market-card-grid">
          {market.map((coin) => {
            const change = coin.price_change_percentage_24h;
            const positive = typeof change === "number" && change >= 0;
            const changeClass = typeof change !== "number" ? "change-neutral" : positive ? "change-positive" : "change-negative";
            return (
              <article className="market-card" key={coin.symbol}>
                <div className="coin-card-top">
                  <div className="coin-identity">
                    {coin.image ? <img src={coin.image} alt="" className="coin-logo" /> : <span className="coin-logo coin-fallback" style={{ background: coin.color }}>{coin.symbol.slice(0, 1)}</span>}
                    <div><strong>{coin.name}</strong><span>{coin.symbol}</span></div>
                  </div>
                  <Sparkline color={typeof change !== "number" ? "#8DA0BF" : positive ? "#12A879" : "#E05B66"} positive={typeof change !== "number" || positive} />
                </div>
                <div className="coin-price">{money(coin.current_price)}</div>
                <div className="coin-card-bottom">
                  <span className={"price-change " + changeClass}>
                    {typeof change !== "number" ? "No live change data" : <>{positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(change).toFixed(2)}%</>}
                  </span>
                  <span className="rank-label">{coin.market_cap_rank ? "Rank #" + coin.market_cap_rank : "Crypto asset"}</span>
                </div>
              </article>
            );
          })}
        </div>
        {marketError && <p className="market-footnote">Live market data is currently unavailable. Showing stored project sample values instead.</p>}
      </section>

      <section className="overview-main-grid">
        <article className="panel market-chart-panel">
          <div className="section-heading chart-title-row">
            <div><h3>Model price trend</h3><p>{assetData.name} · historical sample and forecast projection</p></div>
            <span className="model-badge"><BarChart3 size={14} /> LIGHTGBM</span>
          </div>
          <div className="chart-legend"><span><i className="legend-dot actual-dot" /> Historical sample</span><span><i className="legend-dot forecast-dot" /> Forecast sample</span></div>
          <div className="overview-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 2, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#155EEF" stopOpacity={0.17} />
                    <stop offset="100%" stopColor="#155EEF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#E9EEF6" strokeDasharray="4 5" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8390A6" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8390A6" }} domain={["auto", "auto"]} axisLine={false} tickLine={false} width={62} tickFormatter={(value) => value >= 1000 ? "$" + (value / 1000).toFixed(0) + "k" : "$" + value} />
                <Tooltip formatter={(value) => money(value)} />
                <Area type="monotone" dataKey="actual" name="Historical sample" stroke="#155EEF" fill="url(#actualArea)" strokeWidth={2.5} connectNulls={false} />
                <Area type="monotone" dataKey="forecast" name="Forecast sample" stroke="#13A779" fill="none" strokeWidth={2.5} strokeDasharray="5 5" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-note">This chart uses historical and forecast samples stored in the project, not a live historical price feed.</p>
        </article>

        <article className="panel forecast-panel">
          <div className="forecast-icon"><Target size={19} /></div>
          <span className="eyebrow panel-eyebrow">MODEL FORECAST</span>
          <h3>{assetData.symbol} 30-day outlook</h3>
          <p className="forecast-price">{money(assetData.forecastPrice)}</p>
          <div className={"forecast-change " + modelTrend}>{upside >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}{upside >= 0 ? "+" : ""}{upside.toFixed(2)}% <span>vs. dataset price</span></div>
          <div className="forecast-divider" />
          <div className="model-metric"><span>Dataset price</span><strong>{money(assetData.currentPrice)}</strong></div>
          <div className="model-metric"><span>Model</span><strong>{assetData.modelVersion}</strong></div>
          <div className="model-metric"><span>Stored MAPE value</span><strong>{assetData.mape}%</strong></div>
          <button className="secondary-action" type="button" onClick={() => onNavigate("prediction")}>Explore prediction <ArrowRight size={16} /></button>
          <p className="forecast-disclaimer">Model output is for educational use only and is not a buy or sell recommendation.</p>
        </article>
      </section>

      <section className="quick-links-section">
        <div className="section-heading"><div><h3>Continue exploring</h3><p>Explore other sections of the project.</p></div></div>
        <div className="quick-links-grid">
          <button className="quick-link-card" type="button" onClick={() => onNavigate("dashboard")}><span className="quick-link-icon"><BarChart3 size={18} /></span><span><strong>Model dashboard</strong><small>Compare stored historical values and model forecasts.</small></span><ArrowRight size={17} /></button>
          <button className="quick-link-card" type="button" onClick={() => onNavigate("historical")}><span className="quick-link-icon"><Clock3 size={18} /></span><span><strong>Historical data</strong><small>Review stored historical price records.</small></span><ArrowRight size={17} /></button>
          <button className="quick-link-card" type="button" onClick={() => onNavigate("backtest")}><span className="quick-link-icon"><TrendingUp size={18} /></span><span><strong>Backtesting</strong><small>Review the sample model evaluation summary.</small></span><ArrowRight size={17} /></button>
        </div>
      </section>
    </div>
  );
}
