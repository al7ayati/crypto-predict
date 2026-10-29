// ARCHITECTURE: Keep provider IDs, quote normalization, attribution, and REST calls here.
// CHANGEPOINT: Replace this module's transport with a server relay/WebSocket later; keep its data shapes stable.
export const MARKET_ASSETS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
];

export const COINGECKO_ATTRIBUTION_URL = "https://www.coingecko.com/en/api";
const API_BASE_URL = "https://api.coingecko.com/api/v3";
// The keyless Public API has a variable IP rate limit; keep this tab below five requests/minute.
const MIN_REQUEST_GAP_MS = 13_000;
let requestQueue = Promise.resolve();
let lastRequestStartedAt = 0;

function waitForRequestSlot(signal) {
  const waitMs = Math.max(0, MIN_REQUEST_GAP_MS - (Date.now() - lastRequestStartedAt));
  if (!waitMs) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, waitMs);
    const abort = () => {
      window.clearTimeout(timer);
      reject(Object.assign(new Error("Request cancelled."), { name: "AbortError" }));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

async function requestJson(url, signal) {
  const request = requestQueue.then(async () => {
    if (signal?.aborted) throw Object.assign(new Error("Request cancelled."), { name: "AbortError" });
    await waitForRequestSlot(signal);
    if (signal?.aborted) throw Object.assign(new Error("Request cancelled."), { name: "AbortError" });
    lastRequestStartedAt = Date.now();
    return fetch(url, { signal, headers: { accept: "application/json" } });
  });
  requestQueue = request.catch(() => {});
  const response = await request;
  if (!response.ok) {
    const detail = response.status === 429
      ? "CoinGecko rate limit reached. Wait before refreshing."
      : `CoinGecko returned HTTP ${response.status}.`;
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

// CHANGEPOINT: One batched request supplies every current quote and its 7-day sparkline.
export async function fetchMarketSnapshot(signal) {
  const params = new URLSearchParams({
    vs_currency: "usd",
    ids: MARKET_ASSETS.map(({ id }) => id).join(","),
    price_change_percentage: "24h",
    sparkline: "true",
  });
  const rows = await requestJson(`${API_BASE_URL}/coins/markets?${params}`, signal);
  if (!Array.isArray(rows)) throw new Error("CoinGecko returned an invalid market response.");

  const byId = new Map(rows.map((row) => [row.id, row]));
  const assets = MARKET_ASSETS.map((asset) => {
    const row = byId.get(asset.id);
    if (!row || !Number.isFinite(row.current_price) || row.current_price <= 0) {
      throw new Error(`CoinGecko did not return a valid ${asset.symbol} price.`);
    }
    return {
      ...asset,
      priceUsd: row.current_price,
      change24hPct: Number.isFinite(row.price_change_percentage_24h) ? row.price_change_percentage_24h : null,
      volume24hUsd: Number.isFinite(row.total_volume) ? row.total_volume : null,
      marketCapUsd: Number.isFinite(row.market_cap) ? row.market_cap : null,
      providerUpdatedAt: row.last_updated || null,
      sparkline7d: Array.isArray(row.sparkline_in_7d?.price) ? row.sparkline_in_7d.price.filter(Number.isFinite) : [],
    };
  });
  return { source: "CoinGecko", sourceUrl: COINGECKO_ATTRIBUTION_URL, fetchedAt: new Date().toISOString(), assets };
}

// CoinGecko market_chart/range returns price observations, not OHLC candles.
export async function fetchPriceHistory(symbol, fromDate, toDate, signal) {
  const asset = MARKET_ASSETS.find((item) => item.symbol === symbol);
  if (!asset) throw new Error(`Unsupported asset: ${symbol}`);
  const from = Math.floor(new Date(`${fromDate}T00:00:00.000Z`).getTime() / 1000);
  const to = Math.floor(new Date(`${toDate}T23:59:59.999Z`).getTime() / 1000);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) throw new Error("Choose a valid date range.");
  const params = new URLSearchParams({ vs_currency: "usd", from: String(from), to: String(to) });
  const result = await requestJson(`${API_BASE_URL}/coins/${asset.id}/market_chart/range?${params}`, signal);
  if (!Array.isArray(result.prices)) throw new Error("CoinGecko returned invalid historical price data.");
  return result.prices
    .filter((point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]) && point[1] > 0)
    .map(([timestamp, price]) => ({ timestamp, price, date: new Date(timestamp).toISOString().slice(0, 10) }));
}

// Collapse intraday observations to the final observed price each UTC date for historical tables/backtests.
export function toDailyPrices(observations) {
  const byDate = new Map();
  observations.forEach((point) => byDate.set(point.date, point));
  return [...byDate.values()].sort((left, right) => left.timestamp - right.timestamp);
}
