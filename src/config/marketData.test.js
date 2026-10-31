import assert from "node:assert/strict";
import test from "node:test";
import { MARKET_ASSETS, MARKET_DATA_CONFIG } from "./marketData.js";

test("market data configuration defines supported assets and provider endpoints", () => {
  const symbols = MARKET_ASSETS.map(({ symbol }) => symbol);
  const ids = MARKET_ASSETS.map(({ id }) => id);
  const pairs = MARKET_ASSETS.map(({ binancePair }) => binancePair);

  assert.deepEqual(symbols, ["BTC", "ETH", "SOL", "XRP", "ADA"]);
  assert.equal(new Set(symbols).size, symbols.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(pairs).size, pairs.length);
  assert.ok(pairs.every((pair) => pair.endsWith("USDT")));

  assert.equal(new URL(MARKET_DATA_CONFIG.coinGecko.apiBaseUrl).hostname, "api.coingecko.com");
  assert.equal(MARKET_DATA_CONFIG.coinGecko.marketsPath, "/coins/markets");
  assert.ok(MARKET_DATA_CONFIG.coinGecko.minimumRequestGapMs >= 12_000);
  assert.equal(new URL(MARKET_DATA_CONFIG.binance.apiBaseUrl).hostname, "api.binance.com");
  assert.equal(new URL(MARKET_DATA_CONFIG.binance.streamBaseUrl).protocol, "wss:");
  assert.equal(MARKET_DATA_CONFIG.binance.candleInterval, "1d");
  assert.equal(MARKET_DATA_CONFIG.binance.candlesPerRequest, 1_000);
  assert.match(MARKET_DATA_CONFIG.binance.klinesDocumentationUrl, /developers\.binance\.com/);
});
