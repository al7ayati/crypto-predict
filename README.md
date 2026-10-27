# Crypto Predict

Crypto Predict is a React and Vite cryptocurrency analytics demo. It includes Firebase email/password authentication, a market overview, stored historical samples, forecast visualizations, a backtesting summary, and CSV export.

> **Data and feature notice:** Live market quotes are requested from CoinGecko when the public endpoint is available. Historical series, forecast values, and MAPE values are stored project samples—not a live model pipeline or independently verified performance. The admin page is a placeholder until a secured backend and training service are connected.

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
3. Under **Authentication → Settings → Authorized domains**, add the local and production hostnames that you use. Do not include a path or protocol.
4. Confirm the environment values match the registered Firebase Web app.
5. Start the app and test sign-up with an email address you can access, sign out, sign in again, and request a password reset. Check the inbox and spam folder for the password reset email.

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

- **Market overview:** attempts to fetch current BTC, ETH, and ADA quotes from the CoinGecko public API; if the request fails, it clearly labels the stored fallback values as sample data.
- **Model dashboard, historical data, prediction, and backtesting:** use stored sample data for demonstration and inspection. Historical data can be exported to CSV.
- **Admin management:** explicitly marked unavailable because there is no connected backend model-training endpoint or live audit-log database.

All forecasts are for educational purposes only and do not constitute financial advice.
