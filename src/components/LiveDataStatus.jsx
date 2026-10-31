import React, { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";

function formatAge(timestamp, now) {
  if (!timestamp) return "No successful fetch yet";
  const ageSeconds = Math.max(0, Math.floor((now - Date.parse(timestamp)) / 1000));
  if (!Number.isFinite(ageSeconds)) return "Fetch time unavailable";
  if (ageSeconds < 60) return `Updated ${ageSeconds}s ago`;
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  return `Updated ${Math.floor(minutes / 60)}h ago`;
}

export default function LiveDataStatus({
  marketData,
  tradeStreamStatus,
  liveTradePrices,
  refreshing,
  onRefresh,
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const fetchedAt = marketData.snapshot?.fetchedAt;
  const secondsUntilRefresh = fetchedAt
    ? Math.max(0, 60 - Math.floor((now - Date.parse(fetchedAt)) / 1000))
    : null;
  const latestTradeTimestamp = Object.values(liveTradePrices)
    .map((quote) => quote?.timestamp)
    .filter(Number.isFinite)
    .reduce((latest, timestamp) => Math.max(latest, timestamp), 0);
  const tradeAgeSeconds = latestTradeTimestamp
    ? Math.max(0, Math.floor((now - latestTradeTimestamp) / 1000))
    : null;
  const streamIsFresh = tradeStreamStatus === "live" && tradeAgeSeconds !== null && tradeAgeSeconds < 60;
  const statusText = marketData.status === "error"
    ? "Market data unavailable"
    : marketData.status === "stale"
      ? "Showing last successful fetch"
      : marketData.status === "loading"
        ? "Loading market data"
        : refreshing
          ? "Refreshing market data"
          : "Market data connected";
  const statusClass = marketData.status === "error" || marketData.status === "stale"
    ? "is-warning"
    : marketData.status === "loading" || refreshing || !streamIsFresh
      ? "is-pending"
      : "is-live";

  return <section className={`live-data-status ${statusClass}`} aria-label="Live data status">
    <span className="live-data-orb" aria-hidden="true"><Activity size={14} /></span>
    <span className="live-data-copy">
      <strong><i aria-hidden="true" />{statusText}</strong>
      <small title={fetchedAt ? new Date(fetchedAt).toISOString() : undefined}>
        {streamIsFresh
          ? `Binance trade · ${tradeAgeSeconds}s ago`
          : tradeStreamStatus === "reconnecting"
            ? "Binance stream reconnecting"
            : tradeStreamStatus === "connecting"
              ? "Connecting to Binance"
              : tradeStreamStatus === "live"
                ? "No recent Binance trades"
                : "Binance stream offline"}
        {" · "}{formatAge(fetchedAt, now)}
      </small>
    </span>
    <span className={`live-data-countdown${secondsUntilRefresh === 0 ? " is-due" : ""}`}>
      {secondsUntilRefresh === null
        ? "Waiting for fetch"
        : refreshing
          ? "Refreshing…"
          : secondsUntilRefresh === 0
            ? "Refresh due"
            : `Refreshes in ${secondsUntilRefresh}s`}
    </span>
    <button
      type="button"
      className="live-data-refresh-button"
      onClick={onRefresh}
      disabled={refreshing || marketData.status === "loading"}
      aria-label="Refresh market data now"
      title="Refresh market data now"
    >
      <RefreshCw size={14} className={refreshing ? "is-spinning" : ""} />
      <span>Refresh now</span>
    </button>
  </section>;
}
