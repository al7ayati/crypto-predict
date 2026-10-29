# Developer handoff

## Product and deployment shape

- Frontend: React 18, Vite 5, React Router-like pathname switching in `src/App.jsx`, Tailwind utilities plus `src/index.css`.
- Hosting: Firebase Hosting static SPA. Firebase Authentication provides email/password and optional Google sign-in. The only Firebase service used by the app is Auth.
- Market provider: keyless CoinGecko Public API; no market-data backend, API secret, scheduled task, Cloud Function, or Realtime Database is needed for this release.
- Default project alias in `.firebaserc`: `crypto-predict-app`. Verify the account/project before any production deploy.

## Source and data contracts

Provider IDs and transport are centralized in `src/services/marketData.js`:

- `MARKET_ASSETS`: `bitcoin/BTC`, `ethereum/ETH`, `solana/SOL`, `ripple/XRP`, `cardano/ADA`.
- `fetchMarketSnapshot(signal)` batches the current market request and returns `{ source, sourceUrl, fetchedAt, assets }`. Each normalized asset is `{ id, symbol, name, priceUsd, change24hPct, volume24hUsd, marketCapUsd, providerUpdatedAt, sparkline7d }`.
- `fetchedAt` is the browser's request completion time. `providerUpdatedAt` comes from CoinGecko where present. They mean different things; UI labels them separately.
- `fetchPriceHistory(symbol, fromDate, toDate, signal)` returns timestamped `{ timestamp, price, date }` price observations. It rejects invalid date ranges and does not label observations OHLC.
- `toDailyPrices(observations)` retains the final provider observation for each UTC date. Historical pages and the backtest consume this helper.
- All REST URLs use `https://api.coingecko.com/api/v3`; no API key is attached or expected. Provider attribution links to CoinGecko on market/data pages.

The keyless Public API rate limit varies with conditions (CoinGecko currently documents 5–15 calls/minute for its keyless public endpoint). `requestJson()` serializes tab-originated calls with a 13-second minimum gap. This reduces, but cannot eliminate, 429s caused by shared IP traffic or requests from other tabs/devices. The app reports API failures and does not swap in invented data. CoinGecko's keyless public historical endpoint currently supports at most one year; historical ranges longer than one year are rejected by the page.

## Page behavior

### Dashboard

`src/App.jsx` owns one current-market snapshot and requests it after sign-in, then every 60 seconds while the tab is visible. `DashboardPage` renders that snapshot and provides a manual refresh control. Refresh frequency is not equivalent to provider update frequency. The four summary values are computed only from the five tracked assets; the BTC share shown is explicitly **not** global BTC dominance. Missing provider fields render as an em dash.

### Historical Data

`src/pages/HistoricalPages.jsx` defaults to the latest 30 days and allows up to one year. It groups provider observations into one daily price per UTC date, then supports search, sort, pagination, date filtering, and CSV export. The API endpoint does not provide OHLC candles in this response, so the UI and CSV contain only date and observed price. A failed request leaves no fabricated rows.

### Predictions

`src/pages/PredictionPage.jsx` loads the latest 30 days of historical prices. It shows the actual daily series and a baseline endpoint calculated from the mean of the last seven daily log returns: `target = lastHistoricalPrice × exp(meanDailyLogReturn × horizonDays)`. Horizon controls are 1, 7, and 30 days. EMA, Bollinger bands, and RSI are calculated from the displayed daily prices. The baseline is not a trained/validated forecasting model and must not be called an AI prediction or used as a trade signal.

### Backtest

`src/services/backtest.js` contains the strategy and summary math; `src/pages/BacktestPage.jsx` owns the request and UI. The app requests up to five 60-day price histories, downsamples to daily observations, and replays a long-only 7-observation SMA rule. The first seven observations warm up the SMA and do not count toward the period's return. At each close, price above the trailing average opens/holds a position; price below closes it. The next observed daily price change is attributed to the prior position. A modeled 0.1% fee applies on each entry/exit. Assets are equal-weighted across available daily observations; filters recompute the displayed portfolio. Results are hypothetical and price-based, not actual orders, OHLC backtests, or evidence of future results. `ROUND_TRIP_FEE_PCT` is the central fee assumption.

### Auth and navigation

`src/pages/AuthPage.jsx` and `src/firebase.js` handle Firebase email/Google authentication. `src/App.jsx` maps `/dashboard`, `/historical`, `/prediction`, and `/backtest` routes. The asset picker is shared by Historical Data and Predictions. CSV export is local browser-generated output.

## Change points

Search code for the marker comments `ARCHITECTURE:` and `CHANGEPOINT:`. The principal seams are:

1. `src/services/marketData.js`: provider IDs, provider URL, request pacing, normalization, historical data contract.
2. `src/App.jsx`: one shared polling lifecycle and market state consumed by pages.
3. `src/services/backtest.js`: strategy signal timing, fees, portfolio aggregation.
4. Page files: display and attribution only; do not add another per-page current-quote poll.

For a future WebSocket provider, replace transport in the shared market data service (or add one adapter there), retain the normalized quote shape, and fan updates through the app-level market state. CoinGecko WebSocket access is plan-gated; the current zero-subscription version intentionally uses REST snapshots. Keep provider secrets out of all `VITE_` variables if a paid provider/backend is added later.

## Verification and release

- Install with `npm ci` and build with `npm run build`.
- There is currently no configured automated unit or browser-test script. For live smoke checks, use a signed-in browser and inspect Dashboard, all five Historical Data assets, Predictions, Backtest filters/periods, and CSV output. Check browser network requests for CoinGecko status codes and provider timestamps.
- Deploy only after `.env.local` contains the Firebase Web App config for the target project: `firebase use crypto-predict-app`, `npm run build`, `firebase deploy --only hosting`.
- Firebase Hosting deploy does not configure Authentication providers or authorized domains; those settings stay in Firebase Console.

## Known limits

- Keyless public rates and cache/update cadence are controlled by CoinGecko and may change. Expect occasional 429/network errors; the UI preserves only previously received real data and marks it stale.
- Current quote data is aggregated market data, not a fill price from a particular exchange.
- Historical charts/backtests use the granularity CoinGecko returns for the selected time range. Aggregated daily values cannot represent an intraday candle's exact OHLC.
- The app has no real model training, news/sentiment feeds, trade execution, portfolio ledger, or validated trading strategy. Keep these features absent or clearly marked until genuine data/models and evaluation are integrated.
- Firebase Auth is configured from client-side web config in `.env.local`. Do not commit `.env.local`, Firebase service account credentials, or future provider secrets.
