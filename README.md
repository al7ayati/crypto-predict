# Crypto Predict

Crypto Predict is a React and Vite cryptocurrency analytics demo. It includes Firebase email/password and Google authentication, a live market dashboard, stored historical samples, forecast visualizations, a backtesting summary, and CSV export.

> **Data and feature notice:** The dashboard requests market prices and aggregate market statistics from CoinGecko and refreshes them every 60 seconds when the public API is available. If a request fails, it clearly falls back to sample data. Historical series, forecast values, AI signals, and backtest metrics are demonstration samples—not a live model pipeline or independently verified performance.

## Requirements

- Node.js 22 LTS or a compatible supported Node.js version
- npm
- A Firebase project with a Web app registered

## Local setup

1. Clone the repository and open its root folder.
2. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```
3. Open `.env.local` and replace the placeholder values with the configuration from **Firebase Console → Project settings → General → Your apps → Web app**.
4. Install the locked dependencies and run the development server:
   ```bash
   npm ci
   npm run dev
   ```
5. Open the local URL printed by Vite, usually `http://localhost:5173`.

Vite reads `.env.local` from the repository root. Restart the development server after changing environment variables. Never commit `.env.local`, service-account JSON, or Firebase Admin credentials.

## Configure Firebase Authentication

1. Open the [Firebase Console](https://console.firebase.google.com/) and select `crypto-predict-app`, or update `.firebaserc` if using another project.
2. Open **Build → Authentication → Sign-in method** and enable **Email/Password**.
3. Enable **Google** as a sign-in provider if you want to use Google authentication.
4. Under **Authentication → Settings → Authorized domains**, add the local and production hostnames that you use. Do not include a path or protocol.
5. Confirm the environment values match the registered Firebase Web app.
6. Start the app and test email sign-up with an email address you can access, sign out, sign in again, and request a password reset. Check the inbox and spam folder for the password reset email. Test Google sign-in from an authorized domain.

The username is saved in the Firebase Authentication profile as `displayName`. Passwords are handled by Firebase Authentication and are not saved by this frontend to a custom database.

## Build and preview

Run the same build used for deployment:

```bash
npm ci
npm run build
npm run preview
```

Resolve every build error before deploying. The repository's GitHub Actions workflow also runs `npm ci` and `npm run build` for pushes and pull requests.

## Deploy to Firebase Hosting

Install the Firebase CLI and authenticate with the account that has access to the target Firebase project:

```bash
npm install -g firebase-tools
firebase login
firebase projects:list
firebase use crypto-predict-app
npm ci
npm run build
firebase deploy --only hosting
```

Run these commands from the repository root. Ensure `.env.local` is populated **before** `npm run build`; the compiled `dist` folder contains the client-side Firebase configuration. After deployment, open the Hosting URL and repeat the authentication and page smoke tests. Firebase Hosting is configured to rewrite routes to `index.html` for this single-page application.

## Security notes

- Firebase Web app configuration is client-side configuration, not a service-account secret. Protect the project with the correct Authentication settings, API restrictions where appropriate, and Firebase Security Rules for any Firebase data services.
- Never put Firebase Admin SDK credentials, service-account private keys, or other server secrets in Vite variables prefixed with `VITE_`; those values are bundled into browser code.
- If adding protected admin actions or a real model-training pipeline, implement them in a secured backend, verify Firebase ID tokens on the server, and enforce admin privileges with server-side authorization. A hidden button in a React app is not an access-control boundary.

## Current feature boundaries

- **Dashboard:** fetches live prices, 24-hour changes, volume, sparklines, and global market statistics for BTC, ETH, SOL, XRP, and ADA from the CoinGecko public API. The AI signals and sentiment remain labeled demonstration values.
- **Historical data:** uses stored sample OHLC data with date-range filtering, text search, sortable date/price/volume columns, pagination, and CSV export. The controls apply to the available sample records; data is not a live historical feed.
- **Predictions:** forecast prices and signals are stored demonstration samples. The chart supports EMA 20/50, RSI, and Bollinger Band overlays, and the signal card displays an illustrative stop-loss. These are not generated from the live market feed and are not financial advice.
- **Backtesting:** metrics, cumulative-return samples, and trades are demonstration data. The chart derives weekly P&L changes from cumulative samples; period and trade filters only operate over the data currently available. Results are not verified historical performance.
- **Settings and administration:** not included until there are real user settings or secured backend operations to manage.

All forecasts are for educational purposes only and do not constitute financial advice.
