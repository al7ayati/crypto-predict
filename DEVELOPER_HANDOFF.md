# Developer handoff

## Product and deployment shape

- Frontend: React 18, Vite 5, React Router-like pathname switching in `src/App.jsx`, Tailwind utilities plus `src/index.css`.
- Hosting: Firebase Hosting static SPA. Firebase Authentication provides email/password and optional Google sign-in. The only Firebase service used by the app is Auth.
- Market providers: keyless CoinGecko Public API for aggregated market metadata, plus Binance public Spot REST/WebSocket feeds for exchange-specific prices and candles. No market-data backend, API secret, scheduled task, Cloud Function, or Realtime Database is needed.
- Default project alias in `.firebaserc`: `crypto-predict-app`. Verify the account/project before any production deploy.

## Source and data contracts

Provider settings and supported assets live in `src/config/marketData.js`. Keep provider URLs, public request limits, candle interval/page size, and asset-to-market-pair mappings there. `src/services/marketData.js` owns request handling, response validation, and normalization:

- `MARKET_ASSETS`: `bitcoin/BTC`, `ethereum/ETH`, `solana/SOL`, `ripple/XRP`, `cardano/ADA`.
- `fetchMarketSnapshot(signal)` batches CoinGecko `/coins/markets` and returns `{ source, sourceUrl, fetchedAt, assets }`. Each normalized asset includes `{ id, symbol, name, priceUsd, change24hPct, volume24hUsd, marketCapUsd, imageUrl, providerUpdatedAt, sparkline7d }`.
- `fetchedAt` is the browser's request completion time. `providerUpdatedAt` comes from CoinGecko where present. They mean different things; UI labels them separately.
- `useBinanceTradeStream(enabled)` subscribes to public Binance trade streams for each configured `SYMBOLUSDT` pair. It reports the last trade price in USDT with the exchange event timestamp and reconnects with capped exponential backoff. Dashboard falls back to the CoinGecko USD quote when the stream is unavailable or stale.
- `fetchPriceHistory(symbol, fromDate, toDate, signal)` reads Binance Spot `/api/v3/klines` daily candles, returning `{ timestamp, date, open, high, low, close, price, volume, quoteVolume, trades, candleCloseTime }`. It paginates at 1,000 candles/request and validates all market fields.
- `toDailyPrices(observations)` retains the latest timestamp for each UTC date. Historical Data displays the returned OHLCV candles. Backtest filters out the still-forming current candle.
- CoinGecko and Binance public URLs require no key. Attribution and units are displayed alongside values; CoinGecko market cap/volume are USD aggregates, while Binance prices/candles are specific to Binance Spot USDT pairs.

The keyless CoinGecko Public API rate limit varies with conditions (CoinGecko documents 5–15 calls/minute for its keyless public endpoint). `requestJson()` serializes dashboard metadata calls with a 13-second minimum gap. This reduces, but cannot eliminate, 429s caused by shared IP traffic or requests from other tabs/devices. Binance daily history uses its public market-data endpoint instead of the slow CoinGecko history queue. The app reports failures and does not substitute invented data.

## Page behavior

### Dashboard

`src/App.jsx` owns one CoinGecko metadata snapshot and requests it after sign-in, then every 60 seconds while the tab is visible. The same app owns the Binance trade stream lifecycle. `DashboardPage` renders CoinGecko market metadata and uses fresh Binance last-trade prices where available, with an explicit CoinGecko fallback. Refresh frequency is not equivalent to provider update frequency. Tracked market cap is the sum of the five tracked CoinGecko market-cap fields; BTC share is explicitly **not** global BTC dominance. Missing provider fields render as an em dash.

### Historical Data

`src/pages/HistoricalPages.jsx` defaults to the latest 30 days and uses the dual-calendar range picker in `src/components/DateRangePicker.jsx`. It queries real Binance daily OHLCV candles and supports search, sort, pagination, date filtering, and CSV export. It displays the current candle as potentially incomplete and identifies the `SYMBOL/USDT` pair, UTC timezone, provider, and data timestamps. TanStack Query caches matching asset/date-range keys and refreshes the active selection every five minutes.

### Predictions

`src/pages/PredictionPage.jsx` loads the latest 30 days of completed Binance Spot daily closes through the shared TanStack Query key used by Historical Data. It shows the actual daily series and a baseline endpoint calculated from the mean of the last seven daily log returns: `target = lastHistoricalPrice × exp(meanDailyLogReturn × horizonDays)`. Horizon controls are 1, 7, and 30 days. EMA, Bollinger bands, and RSI are calculated from the displayed daily prices. The baseline is not a trained/validated forecasting model and must not be called an AI prediction or used as a trade signal.

### Backtest

`src/services/backtest.js` contains the strategy and summary math; `src/pages/BacktestPage.jsx` owns the request and UI. The app requests up to five completed Binance daily candle series, including a seven-observation warm-up, and replays a long-only 7-observation SMA rule. The first seven observations warm up the SMA and do not count toward the selected 30/60-day return. At each close, price above the trailing average opens/holds a position; price below closes it. The next daily close change is attributed to the prior position. A modeled 0.1% fee applies on each entry/exit. Assets are equal-weighted across available daily observations; filters recompute the displayed portfolio. Results are hypothetical and price-based, not actual orders or evidence of future results. `ROUND_TRIP_FEE_PCT` is the central fee assumption.

### Auth and navigation

`src/pages/AuthPage.jsx` and `src/firebase.js` handle Firebase email/Google authentication. `src/App.jsx` maps `/dashboard`, `/historical`, `/prediction`, and `/backtest` routes. The asset picker is shared by Historical Data and Predictions. CSV export is local browser-generated output.

## Change points

Search code for the marker comments `ARCHITECTURE:` and `CHANGEPOINT:`. The principal seams are:

1. `src/config/marketData.js`: provider endpoints/limits and the supported asset/pair list.
2. `src/services/marketData.js`: request pacing, normalization, and historical candle contract.
3. `src/App.jsx` and `src/hooks/useBinanceTradeStream.js`: shared CoinGecko polling and Binance live trade stream lifecycle.
4. `src/services/backtest.js`: strategy signal timing, fees, portfolio aggregation.
5. Page files: display and attribution only; do not add another per-page current-quote poll.

If the market stream provider changes, retain the normalized `{ price, timestamp }` quote shape and keep reconnect/fallback behavior in the shared hook. The current public Binance stream needs no key; CoinGecko remains the REST source for aggregated market metadata. Keep provider secrets out of all `VITE_` variables if a paid provider/backend is added later.

## Verification and release

- Install with `npm ci`, run the service tests with `npm test`, and build with `npm run build`.
- Unit tests cover Binance OHLCV parsing, 1,000-candle pagination, UTC daily collapsing, and invalid input handling. For signed-in browser smoke checks, inspect Dashboard, all five Historical Data assets, Predictions, Backtest filters/periods, and CSV output. Check provider timestamps and the reported source when the Binance stream is unavailable.
- Deploy only after `.env.local` contains the Firebase Web App config for the target project: `firebase use crypto-predict-app`, `npm run build`, `firebase deploy --only hosting`.
- Firebase Hosting deploy does not configure Authentication providers or authorized domains; those settings stay in Firebase Console.

## Known limits

- Keyless public rates and cache/update cadence are controlled by CoinGecko and may change. Expect occasional 429/network errors; the UI preserves only previously received real data and marks it stale.
- Binance current quotes and historical candles are specific to Binance Spot `USDT` pairs, not a global index or another exchange's fill price. CoinGecko fallback is an aggregated USD quote and is labeled separately.
- Historical Data uses daily OHLCV candles. The latest candle may still be forming; Backtest excludes that incomplete candle. Exchange outages, provider delays, and exchange-specific price differences are possible.
- The app has no real model training, news/sentiment feeds, trade execution, portfolio ledger, or validated trading strategy. Keep these features absent or clearly marked until genuine data/models and evaluation are integrated.
- Firebase Auth is configured from client-side web config in `.env.local`. Do not commit `.env.local`, Firebase service account credentials, or future provider secrets.
