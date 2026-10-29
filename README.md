# Crypto Predict

Crypto Predict is a React/Vite cryptocurrency analytics app hosted as a static single-page app on Firebase Hosting. It uses Firebase Authentication and the keyless CoinGecko Public API for market and historical price data. It does not require a CoinGecko account, API key, subscription, Cloud Run relay, or Firebase Realtime Database.

## Data integrity

- The Dashboard gets current quotes, 24-hour change/volume, market caps, provider timestamps, and 7-day sparklines for BTC, ETH, SOL, XRP, and ADA in one batched CoinGecko `/coins/markets` request.
- Quotes are polled once per minute while the user is signed in and the app tab is visible. A manual refresh is available. CoinGecko controls the underlying data freshness; polling does not make it a second-by-second feed.
- The public API rate limit varies by conditions. The client queues its API requests at least 13 seconds apart, but other users sharing an IP can still affect the available quota. A 429 is shown to the user and the app waits for the next scheduled poll or manual refresh.
- The Dashboard labels the five-asset aggregate separately from global-market totals and shows CoinGecko attribution, local query time, and the newest provider timestamp when returned.
- Historical Data uses CoinGecko `/coins/{id}/market_chart/range`. It displays observed prices by UTC date, collapsed to the final returned observation for that date. This endpoint's price series is not OHLC, and the app does not invent open/high/low/volume values.
- Predictions shows the actual price series plus a clearly labeled baseline that compounds the mean daily log return from the latest seven daily observations. This is a mathematical scenario, not a factual future price, learned model, confidence score, AI signal, or trading recommendation.
- Backtest fetches actual CoinGecko price observations for each supported asset and replays a long-only 7-observation SMA rule. It reports hypothetical portfolio results with an explicit modeled 0.1% fee per fill. It does not model exchange execution, spreads, slippage, taxes, or intraday OHLC candles, and results are not actual trading performance.
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

See [DEVELOPER_HANDOFF.md](./DEVELOPER_HANDOFF.md) for page behavior, data contracts, rate-limit behavior, source links, forecast/backtest assumptions, and change points. The core provider adapter lives in `src/services/marketData.js`; search for `ARCHITECTURE:` and `CHANGEPOINT:` comments before replacing the transport with a future WebSocket/backend adapter.

## Upstream references

- [CoinGecko API and attribution](https://www.coingecko.com/en/api)
- [CoinGecko Public API rate limits](https://support.coingecko.com/articles/5125303456-what-is-the-rate-limit-for-coingecko-api-public-plan)
- [CoinGecko data delivery options](https://www.coingecko.com/en/api/data-delivery)
- [CoinGecko historical market chart range](https://docs.coingecko.com/reference/coins-id-market-chart-range)

Forecast scenarios and hypothetical backtest results are for educational analysis only and are not financial advice.
