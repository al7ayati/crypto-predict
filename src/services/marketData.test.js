import test from "node:test";
import assert from "node:assert/strict";
import { fetchPriceHistory, toDailyPrices } from "./marketData.js";

function candle(timestamp, close = 105) {
  return [
    timestamp,
    "100",
    "110",
    "90",
    String(close),
    "12.5",
    timestamp + 86_399_999,
    "1312.5",
    "42",
    "6.25",
    "656.25",
    "0",
  ];
}

test("fetchPriceHistory normalizes Binance UTC OHLCV candle fields", async () => {
  const originalFetch = globalThis.fetch;
  const timestamp = Date.UTC(2026, 0, 5);
  let requestUrl;
  globalThis.fetch = async (url) => {
    requestUrl = new URL(url);
    return { ok: true, json: async () => [candle(timestamp)] };
  };

  try {
    const result = await fetchPriceHistory("BTC", "2026-01-05", "2026-01-05");
    assert.equal(requestUrl.pathname, "/api/v3/klines");
    assert.equal(requestUrl.searchParams.get("symbol"), "BTCUSDT");
    assert.equal(requestUrl.searchParams.get("interval"), "1d");
    assert.deepEqual(result[0], {
      timestamp,
      date: "2026-01-05",
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      price: 105,
      volume: 12.5,
      quoteVolume: 1312.5,
      trades: 42,
      candleCloseTime: timestamp + 86_399_999,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchPriceHistory paginates ranges beyond Binance's 1,000 candle limit", async () => {
  const originalFetch = globalThis.fetch;
  const start = Date.UTC(2020, 0, 1);
  const firstPage = Array.from({ length: 1000 }, (_, index) => candle(start + index * 86_400_000, index + 1));
  const requests = [];
  globalThis.fetch = async (url) => {
    const parsedUrl = new URL(url);
    requests.push(parsedUrl);
    const page = requests.length === 1 ? firstPage : [candle(Number(parsedUrl.searchParams.get("startTime")), 1001)];
    return { ok: true, json: async () => page };
  };

  try {
    const result = await fetchPriceHistory("ETH", "2020-01-01", "2023-01-01");
    assert.equal(requests.length, 2);
    assert.equal(requests[0].searchParams.get("symbol"), "ETHUSDT");
    assert.equal(Number(requests[1].searchParams.get("startTime")), start + 1000 * 86_400_000);
    assert.equal(result.length, 1001);
    assert.equal(result.at(-1).close, 1001);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("toDailyPrices keeps the latest UTC observation for each date", () => {
  const earlier = { date: "2026-01-05", timestamp: 100, price: 10 };
  const later = { date: "2026-01-05", timestamp: 200, price: 12 };
  const nextDay = { date: "2026-01-06", timestamp: 300, price: 14 };
  assert.deepEqual(toDailyPrices([later, nextDay, earlier]), [later, nextDay]);
});

test("fetchPriceHistory rejects unsupported assets and invalid date ranges", async () => {
  await assert.rejects(fetchPriceHistory("DOGE", "2026-01-01", "2026-01-02"), /Unsupported asset/);
  await assert.rejects(fetchPriceHistory("BTC", "2026-02-02", "2026-02-01"), /valid date range/);
  await assert.rejects(fetchPriceHistory("BTC", "2026-02-30", "2026-03-01"), /valid date range/);
});
