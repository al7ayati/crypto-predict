# Developer handoff

## Product and deployment shape

- Frontend: React 18, Vite 5, React Router-like pathname switching in `src/App.jsx`, Tailwind utilities plus `src/index.css`.
- Hosting: Firebase Hosting static SPA. Firebase Authentication provides email/password and optional Google sign-in. The only Firebase service used by the app is Auth.
- Market providers: keyless CoinGecko Public API for aggregated market metadata, plus Binance public Spot REST/WebSocket feeds for exchange-specific prices and candles. No market-data backend, API secret, scheduled task, Cloud Function, or Realtime Database is needed.
- Default project alias in `.firebaserc`: `crypto-predict-app`. Verify the account/project before any production deploy.

## Source and data contracts

Provider settings and supported assets live in `src/config/marketData.js`. Keep provider URLs, public request limits, candle interval/page size, and asset-to-market-pair mappings there. `src/config/analytics.js` centralizes chart horizons, indicator periods/thresholds, and backtest lookbacks/fees. `src/services/marketData.js` owns request handling, response validation, and normalization:

- `MARKET_ASSETS`: `bitcoin/BTC`, `ethereum/ETH`, `solana/SOL`, `ripple/XRP`, `cardano/ADA`.
- `fetchMarketSnapshot(signal)` batches CoinGecko `/coins/markets` and returns `{ source, sourceUrl, fetchedAt, assets }`. Each normalized asset includes `{ id, symbol, name, priceUsd, change24hPct, volume24hUsd, marketCapUsd, imageUrl, providerUpdatedAt }`. CoinGecko sparklines are not used for Dashboard daily trends.
- `fetchedAt` is the browser's request completion time. `providerUpdatedAt` comes from CoinGecko where present. They mean different things; UI labels them separately.
- `useBinanceTradeStream(enabled)` subscribes to public Binance trade streams for each configured `SYMBOLUSDT` pair. It reports the last trade price in USDT with the exchange event timestamp and reconnects with capped exponential backoff. Dashboard falls back to the CoinGecko USD quote when the stream is unavailable or stale.
- `fetchPriceHistory(symbol, fromDate, toDate, signal)` reads Binance Spot `/api/v3/klines` daily candles, returning `{ timestamp, date, open, high, low, close, price, volume, quoteVolume, trades, candleCloseTime }`. It paginates at 1,000 candles/request and validates all market fields.
- `fetchSevenDayCandles(symbol, now, signal)` requests the exact UTC window needed for eight closes across seven elapsed days and removes any candle whose close time has not passed. `calculateDailyPerformance(candles)` calculates a one-day close-to-close return only for adjacent UTC dates, and a seven-day return only for eight consecutive daily closes. It never fills missing observations.
- `toDailyPrices(observations)` retains the latest timestamp for each UTC date. Historical Data displays the returned OHLCV candles. Backtest filters out the still-forming current candle.
- CoinGecko and Binance public URLs require no key. Attribution and units are displayed alongside values; CoinGecko market cap/volume and 24-hour change are aggregated USD values, while Binance live trades and daily candles are specific to Binance Spot USDT pairs. USDT is not treated as USD.

The keyless CoinGecko Public API rate limit varies with conditions (CoinGecko documents 5–15 calls/minute for its keyless public endpoint). `requestJson()` serializes dashboard metadata calls with a 13-second minimum gap. This reduces, but cannot eliminate, 429s caused by shared IP traffic or requests from other tabs/devices. Binance daily history uses its public market-data endpoint instead of the slow CoinGecko history queue. The app reports failures and does not substitute invented data.

## Page behavior

### Dashboard

`src/App.jsx` owns one CoinGecko metadata snapshot and requests it after sign-in, then every 60 seconds while the tab is visible. The same app owns the Binance trade stream lifecycle. `DashboardPage` renders CoinGecko market metadata and uses fresh Binance last-trade prices where available, with an explicit CoinGecko fallback. TanStack Query fetches daily Binance candles for the five tracked pairs and refreshes the active Dashboard data every five minutes. Its 1D comparison is the latest completed close against the prior completed UTC daily close; 7D uses eight consecutive completed daily closes across seven elapsed UTC days. The chart only renders a complete interval and never interpolates gaps. Refresh frequency is not equivalent to provider update frequency. Tracked market cap is the sum of the five tracked CoinGecko market-cap fields; BTC share is explicitly **not** global BTC dominance. Missing provider fields render as an em dash.

The Dashboard also adds Market Pulse/top movers, daily-close performance comparison, and concise definitions of the selected asset universe, quote units, and return intervals. These indicators describe observed historical data and are not forecasts or trading recommendations.

### Historical Data

`src/pages/HistoricalPages.jsx` defaults to the latest 30 days and uses the dual-calendar range picker in `src/components/DateRangePicker.jsx`. It queries real Binance daily OHLCV candles and supports search, sort, pagination, date filtering, and CSV export. It displays the current candle as potentially incomplete and identifies the `SYMBOL/USDT` pair, UTC timezone, provider, and data timestamps. TanStack Query caches matching asset/date-range keys and refreshes the active selection every five minutes.

### Predictions

`src/pages/PredictionPage.jsx` requests 251 calendar dates of Binance Spot daily closes (refreshed every five minutes and rolled forward hourly), filters out the forming candle, then charts the latest 90 completed closes. The longer series warms up EMA 20/50; each EMA is seeded with its initial period SMA. The 20-period Bollinger bands use the population standard deviation and are hidden until 20 observations exist. RSI uses Wilder's 14-period smoothing, starts after 14 price changes, maps a flat period to 50, and is displayed in a separate 0–100 chart with conventional 30/70 reference lines. TanStack Query uses the same symbol/date-range key format as Historical Data; only an exact range match reuses the same cache entry.

The baseline uses the latest seven observed log-return intervals and divides their summed log return by elapsed UTC calendar days before compounding over 1/7/30 calendar days: `target = lastHistoricalPrice × exp(sum(log(Pt/Pt-1)) / elapsedDays × horizonDays)`. It is a transparent scenario, not a trained/validated forecast, confidence interval, or trade signal. If provider candles are missing, the denominator reflects elapsed calendar days rather than assuming observations are evenly spaced.

The risk card uses sample standard deviation of the latest 20 contiguous daily log returns. It annualizes with `sqrt(365)`; its heuristic low/medium/high bands are `<50%`, `50–100%`, and `>=100%` annualized volatility. The scenario stop distance is `reference close × daily volatility × sqrt(horizon days) × 1.5`; the displayed target/take-profit is the baseline endpoint and R:R is target distance divided by stop distance. The reference entry is the latest completed Binance close in USDT, not a potentially differently denominated live quote. These levels are illustrative, not trade instructions.

The "Model Weighting & Feature Importance" panel explains the actual baseline: each of the latest seven observed log-return intervals contributes equally to cumulative log return, which is divided by elapsed calendar days. RSI, EMA20/EMA50, and Bollinger bands are not inputs to the target. On-chain and sentiment feeds are not integrated. Never assign them fabricated weights.

The Prediction page's daily context labels use a fixed rule, not a learned model: Strong Buy requires close > EMA20 > EMA50, positive baseline direction, and RSI 50–<70; Strong Sell is the inverse stack with negative baseline direction and RSI >30–50. Buy/Sell require price relative to EMA20 and RSI above/below 50; all other complete states are Neutral. Signal alerts only use the latest 50 contiguous completed UTC daily candles and are polled every five minutes.

`LiveDataStatus` separates the Binance stream state/recent-trade age from CoinGecko snapshot status and the local 60-second polling countdown. The timestamp is the successful browser query time; it does not promise provider latency or a fresh trade for every asset.

Price and signal alerts live in browser local storage (up to 50). Price triggers fire once on a threshold crossing using fresh Binance Spot trades in USDT; they pause when the stream is offline or stale. Daily rule alerts trigger when the selected rule state changes, based on completed candles. Optional Web Notifications require permission and the app to remain open; the UI also shows an in-app alert while open. Alerts are not synced, server-backed, or delivered after closing the browser.

### Backtest

`src/services/backtest.js` contains the strategy and summary math; `src/pages/BacktestPage.jsx` owns the request and UI. The app requests up to five completed Binance daily candle series, including a seven-observation warm-up, and replays a long-only 7-observation SMA rule. The first seven observations warm up the SMA and do not count toward the selected 30/60-day return. At each close, price above the trailing average opens/holds a position; price below closes it. Close-price fills are idealized; the next daily close change is attributed to the prior position. Any open position is liquidated at the final close. A modeled 0.1% fee applies on each entry/exit. Assets are equal-weighted across available daily observations; filters recompute the displayed portfolio. Results do not include benchmark or risk-adjusted comparisons and are hypothetical—not actual orders or evidence of future results. `ROUND_TRIP_FEE_PCT` is the central fee assumption.

### Auth and navigation

`src/pages/AuthPage.jsx` and `src/firebase.js` handle Firebase email/Google authentication. `src/App.jsx` maps `/dashboard`, `/historical`, `/prediction`, and `/backtest` routes. The asset picker is shared by Historical Data and Predictions. CSV export is local browser-generated output.

## Change points

Search code for the marker comments `ARCHITECTURE:` and `CHANGEPOINT:`. The principal seams are:

1. `src/config/marketData.js`: provider endpoints/limits and the supported asset/pair list.
2. `src/config/analytics.js`: forecast horizons, indicator periods/thresholds, and backtest assumptions.
3. `src/services/marketData.js`: request pacing, normalization, and historical candle contract.
4. `src/App.jsx` and `src/hooks/useBinanceTradeStream.js`: shared CoinGecko polling and Binance live trade stream lifecycle.
5. `src/services/technicalIndicators.js` and `src/services/backtest.js`: testable indicator, signal timing, fee, and portfolio math.
6. Page files: display and attribution only; do not add another per-page current-quote poll.

If the market stream provider changes, retain the normalized `{ price, timestamp }` quote shape and keep reconnect/fallback behavior in the shared hook. The current public Binance stream needs no key; CoinGecko remains the REST source for aggregated market metadata. Keep provider secrets out of all `VITE_` variables if a paid provider/backend is added later.

## Verification and release

- Install with `npm ci`, run the service tests with `npm test`, and build with `npm run build`.
- Unit tests cover Binance OHLCV parsing/pagination, UTC daily collapsing, config contracts, indicator lookbacks and edge cases, log-return horizon math, and backtest fee/portfolio calculations. For signed-in browser smoke checks, inspect Dashboard, all five Historical Data assets, Predictions, Backtest filters/periods, and CSV output. Check provider timestamps and the reported source when the Binance stream is unavailable.
- Deploy only after `.env.local` contains the Firebase Web App config for the target project: `firebase use crypto-predict-app`, `npm run build`, `firebase deploy --only hosting`.
- Firebase Hosting deploy does not configure Authentication providers or authorized domains; those settings stay in Firebase Console.

## Known limits

- Keyless public rates and cache/update cadence are controlled by CoinGecko and may change. Expect occasional 429/network errors; the UI preserves only previously received real data and marks it stale.
- Binance current quotes and historical candles are specific to Binance Spot `USDT` pairs, not a global index or another exchange's fill price. CoinGecko fallback is an aggregated USD quote and is labeled separately.
- Historical Data uses daily OHLCV candles. The latest candle may still be forming; Backtest excludes that incomplete candle. Exchange outages, provider delays, and exchange-specific price differences are possible.
- The app has no real model training, news/sentiment feeds, trade execution, portfolio ledger, or validated trading strategy. Keep these features absent or clearly marked until genuine data/models and evaluation are integrated.
- Firebase Auth is configured from client-side web config in `.env.local`. Do not commit `.env.local`, Firebase service account credentials, or future provider secrets.
