export const MARKET_ASSETS = Object.freeze([
  Object.freeze({ id: "bitcoin", symbol: "BTC", name: "Bitcoin", binancePair: "BTCUSDT" }),
  Object.freeze({ id: "ethereum", symbol: "ETH", name: "Ethereum", binancePair: "ETHUSDT" }),
  Object.freeze({ id: "solana", symbol: "SOL", name: "Solana", binancePair: "SOLUSDT" }),
  Object.freeze({ id: "ripple", symbol: "XRP", name: "XRP", binancePair: "XRPUSDT" }),
  Object.freeze({ id: "cardano", symbol: "ADA", name: "Cardano", binancePair: "ADAUSDT" }),
]);

export const MARKET_DATA_CONFIG = Object.freeze({
  coinGecko: Object.freeze({
    apiBaseUrl: "https://api.coingecko.com/api/v3",
    attributionUrl: "https://www.coingecko.com/en/api",
    marketsPath: "/coins/markets",
    minimumRequestGapMs: 13_000,
  }),
  binance: Object.freeze({
    apiBaseUrl: "https://api.binance.com/api/v3",
    streamBaseUrl: "wss://data-stream.binance.vision/stream",
    marketDataUrl: "https://www.binance.com/en/markets",
    klinesPath: "/klines",
    candleInterval: "1d",
    candlesPerRequest: 1_000,
    candleDurationMs: 86_400_000,
  }),
});
