import { MARKET_ASSETS, MARKET_DATA_CONFIG } from "../config/marketData.js";

export { MARKET_ASSETS };

export const COINGECKO_ATTRIBUTION_URL = MARKET_DATA_CONFIG.coinGecko.attributionUrl;
export const BINANCE_MARKET_DATA_URL = MARKET_DATA_CONFIG.binance.marketDataUrl;
export const BINANCE_KLINES_DOCUMENTATION_URL = MARKET_DATA_CONFIG.binance.klinesDocumentationUrl;
let requestQueue = Promise.resolve();
let lastRequestStartedAt = 0;

function waitForRequestSlot(signal) {
  const waitMs = Math.max(
    0,
    MARKET_DATA_CONFIG.coinGecko.minimumRequestGapMs - (Date.now() - lastRequestStartedAt)
  );
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

function getUtcDateTimestamp(value, endOfDay = false) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const timestamp = new Date(`${value}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) return NaN;
  return timestamp + (endOfDay ? 86_399_999 : 0);
}

// CHANGEPOINT: One batched request supplies current market metadata for every tracked asset.
export async function fetchMarketSnapshot(signal) {
  const params = new URLSearchParams({
    vs_currency: "usd",
    ids: MARKET_ASSETS.map(({ id }) => id).join(","),
    price_change_percentage: "24h",
  });
  const rows = await requestJson(
    `${MARKET_DATA_CONFIG.coinGecko.apiBaseUrl}${MARKET_DATA_CONFIG.coinGecko.marketsPath}?${params}`,
    signal
  );
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
      imageUrl: typeof row.image === "string" ? row.image : null,
      providerUpdatedAt: row.last_updated || null,
    };
  });
  return { source: "CoinGecko", sourceUrl: COINGECKO_ATTRIBUTION_URL, fetchedAt: new Date().toISOString(), assets };
}

// Binance daily klines provide exchange-specific OHLCV and avoid CoinGecko's public-history request queue.
export async function fetchPriceHistory(symbol, fromDate, toDate, signal) {
  const asset = MARKET_ASSETS.find((item) => item.symbol === symbol);
  if (!asset) throw new Error(`Unsupported asset: ${symbol}`);
  const from = getUtcDateTimestamp(fromDate);
  const to = getUtcDateTimestamp(toDate, true);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) throw new Error("Choose a valid date range.");
  const candles = [];
  let startTime = from;
  while (startTime <= to) {
    const params = new URLSearchParams({
      symbol: asset.binancePair,
      interval: MARKET_DATA_CONFIG.binance.candleInterval,
      startTime: String(startTime),
      endTime: String(to),
      limit: String(MARKET_DATA_CONFIG.binance.candlesPerRequest),
    });
    const response = await fetch(
      `${MARKET_DATA_CONFIG.binance.apiBaseUrl}${MARKET_DATA_CONFIG.binance.klinesPath}?${params}`,
      {
        signal,
        headers: { accept: "application/json" },
      }
    );
    if (!response.ok) {
      const error = new Error(`Binance returned HTTP ${response.status} for ${symbol} daily candles.`);
      error.status = response.status;
      throw error;
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error(`Binance returned invalid historical data for ${symbol}.`);
    const validRows = rows.filter((row) =>
      Array.isArray(row) &&
      Number.isFinite(Number(row[0])) &&
      [1, 2, 3, 4, 5, 7, 8, 6].every((index) => Number.isFinite(Number(row[index]))) &&
      Number(row[1]) > 0 &&
      Number(row[2]) > 0 &&
      Number(row[3]) > 0 &&
      Number(row[4]) > 0 &&
      Number(row[5]) >= 0
    );
    candles.push(...validRows.map((row) => {
      const timestamp = Number(row[0]);
      return {
        timestamp,
        date: new Date(timestamp).toISOString().slice(0, 10),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        price: Number(row[4]),
        volume: Number(row[5]),
        quoteVolume: Number(row[7]),
        trades: Number(row[8]),
        candleCloseTime: Number(row[6]),
      };
    }));
    const lastTimestamp = validRows.length ? Number(validRows.at(-1)[0]) : null;
    if (
      validRows.length < MARKET_DATA_CONFIG.binance.candlesPerRequest ||
      lastTimestamp === null ||
      lastTimestamp >= to
    ) break;
    startTime = lastTimestamp + MARKET_DATA_CONFIG.binance.candleDurationMs;
  }
  return candles.sort((left, right) => left.timestamp - right.timestamp);
}

export async function fetchSevenDayCandles(symbol, now = Date.now(), signal) {
  if (!Number.isFinite(now)) throw new Error("Choose a valid market-data timestamp.");
  const currentUtcDate = new Date(now);
  const toDate = currentUtcDate.toISOString().slice(0, 10);
  const fromUtcDate = new Date(Date.UTC(
    currentUtcDate.getUTCFullYear(),
    currentUtcDate.getUTCMonth(),
    currentUtcDate.getUTCDate() - 8
  ));
  const fromDate = fromUtcDate.toISOString().slice(0, 10);
  const candles = await fetchPriceHistory(symbol, fromDate, toDate, signal);
  return candles
    .filter((candle) => candle.candleCloseTime < now)
    .slice(-8);
}

export function calculateDailyPerformance(candles) {
  if (!Array.isArray(candles)) {
    return { candles: [], dailyChangePct: null, sevenDayChangePct: null };
  }
  const dailyCandles = candles.slice(-8);
  const isOneDayInterval = dailyCandles.length >= 2 &&
    dailyCandles.at(-1).timestamp - dailyCandles.at(-2).timestamp === MARKET_DATA_CONFIG.binance.candleDurationMs;
  const isSevenDayInterval = dailyCandles.length === 8 &&
    dailyCandles.every((candle, index) =>
      index === 0 ||
      candle.timestamp - dailyCandles[index - 1].timestamp === MARKET_DATA_CONFIG.binance.candleDurationMs
    );
  const dailyChangePct = isOneDayInterval
    ? ((dailyCandles.at(-1).close / dailyCandles.at(-2).close) - 1) * 100
    : null;
  const sevenDayChangePct = isSevenDayInterval
    ? ((dailyCandles.at(-1).close / dailyCandles[0].close) - 1) * 100
    : null;
  return { candles: dailyCandles, dailyChangePct, sevenDayChangePct };
}

// Keep the newest observation per UTC date if a provider returns more than one point per day.
export function toDailyPrices(observations) {
  const byDate = new Map();
  observations.forEach((point) => {
    const previous = byDate.get(point.date);
    if (!previous || point.timestamp > previous.timestamp) byDate.set(point.date, point);
  });
  return [...byDate.values()].sort((left, right) => left.timestamp - right.timestamp);
}
