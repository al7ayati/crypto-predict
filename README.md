# Crypto Predict

Crypto Predict is a React/Vite cryptocurrency analytics app hosted as a static single-page app on Firebase Hosting. It uses Firebase Authentication, the keyless CoinGecko Public API for aggregated market metadata, and Binance public Spot REST/WebSocket market feeds for exchange-level prices and candles. It does not require a paid market-data account, API key, Cloud Run relay, or Firebase Realtime Database.

## Data integrity

- The Dashboard gets 24-hour change/volume, market caps, provider timestamps, icons, and 7-day sparklines for BTC, ETH, SOL, XRP, and ADA in one batched CoinGecko `/coins/markets` request. Tracked market cap is the sum of those five CoinGecko-reported asset market caps; it is not total crypto market capitalization.
- When available, the Dashboard's latest trade price is streamed from Binance Spot `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `XRPUSDT`, and `ADAUSDT` public trade streams. It falls back to the CoinGecko aggregated USD quote if the stream is unavailable or the last trade becomes stale. USDT is not assumed to be exactly USD.
- CoinGecko market metadata is refreshed once per minute while the signed-in app is open. A manual refresh is available. The providers control their own underlying data freshness; client polling is not a second-by-second feed.
- CoinGecko's public API rate limit varies by conditions. The client queues its CoinGecko requests at least 13 seconds apart, but other users sharing an IP can still affect the available quota. A 429 is shown to the user and the app waits for the next scheduled poll or manual refresh.
- The Dashboard labels the five-asset aggregate separately from global-market totals and shows CoinGecko attribution, local query time, and the newest provider timestamp when returned.
- Historical Data uses Binance Spot `/api/v3/klines` at the one-day interval and displays the actual exchange OHLCV fields in UTC for the selected `SYMBOL/USDT` pair. Requests paginate beyond Binance's 1,000-candle limit. The current day's candle may still be forming. TanStack Query caches each symbol/date-range result and refreshes the active query every five minutes.
- Predictions shows completed Binance Spot daily close prices plus a clearly labeled baseline that compounds the mean daily log return from the latest seven observations. This is a mathematical scenario, not a factual future price, learned model, confidence score, AI signal, or trading recommendation.
- Backtest fetches completed Binance Spot daily close candles for each supported asset and replays a long-only 7-observation SMA rule. It reports hypothetical portfolio results with an explicit modeled 0.1% fee per fill. Results are recomputed from cached daily history, and the active query checks hourly for new daily data. It does not model exchange execution, spreads, slippage, taxes, or intraday candles, and results are not actual trading performance.
- TanStack Query keeps successful market-history responses in an in-memory cache for reuse between pages and date-range revisits. This static app does not store a shared server-side market database or guarantee data availability; values still come from the named live providers.
- If a provider request fails, the app shows an error or the last successful quote with a stale label. It never replaces missing live prices with mock values.

## Local setup

Requirements: Node.js 22 (or compatible supported version), npm, and a Firebase project with a Web App and Authentication enabled.

1. Copy `.env.example` to `.env.local` and enter the Firebase Web App config from Firebase Console → Project settings → General → Your apps.
2. Enable Email/Password and (optionally) Google sign-in in Firebase Authentication. Add local and production hostnames under Authorized domains.
3. Install and start:

   ```bash
   npm ci
   npm run dev
   ```

Vite reads `.env.local` from the project root. These `VITE_FIREBASE_*` values are browser configuration, not server secrets. There is no CoinGecko key in the app.

## Build and deploy

```bash
npm ci
npm run build
npm run preview
```

To publish the static site to the Firebase project selected by `.firebaserc`:

```bash
firebase login
firebase use crypto-predict-app
npm run build
firebase deploy --only hosting
```

Populate the Firebase values before building. Firebase Hosting rewrites app routes to `index.html`.

## Code map and maintenance

See [DEVELOPER_HANDOFF.md](./DEVELOPER_HANDOFF.md) for page behavior, data contracts, rate-limit behavior, source links, forecast/backtest assumptions, and change points. Provider URLs, request limits, candle settings, and supported assets are grouped in `src/config/marketData.js`; request handling and response normalization remain in `src/services/marketData.js`.

## Upstream references

- [CoinGecko API and attribution](https://www.coingecko.com/en/api)
- [CoinGecko Public API rate limits](https://support.coingecko.com/articles/5125303456-what-is-the-rate-limit-for-coingecko-api-public-plan)
- [CoinGecko data delivery options](https://www.coingecko.com/en/api/data-delivery)
- [Binance Spot REST API klines](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#klinecandlestick-data)
- [Binance Spot WebSocket market streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)

Forecast scenarios and hypothetical backtest results are for educational analysis only and are not financial advice.
