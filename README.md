# Crypto Predict

A React + Vite cryptocurrency analytics project with Firebase email/password authentication, an overview page, stored historical samples, and a LightGBM forecast visualization.

## Requirements

- Node.js 18 or newer
- A Firebase project with a web app configured

## Run locally

```bash
npm install
npm run dev
```

Build for deployment:

```bash
npm run build
npm run preview
```

## Enable email/password authentication

1. Open the [Firebase Console](https://console.firebase.google.com/) and select the `crypto-predict-app` project configured in `src/firebase.js`.
2. Go to **Authentication → Sign-in method** and enable **Email/Password**.
3. Under **Authentication → Settings → Authorized domains**, make sure the domain where this app runs is listed. Add your production domain if needed.
4. Run the app and use **สมัครสมาชิก** to create an account with username, email, and password. The username is saved to the Firebase Authentication profile's display name. Password reset links are sent by Firebase Authentication.

If you move this project to another Firebase project, replace the configuration in `src/firebase.js` with that project's web-app configuration and update `.firebaserc`.

## Market data and model data

- The Market Watch section attempts to fetch current USD prices for BTC, ETH, and ADA from the CoinGecko public API.
- If the request fails or is unavailable, the interface falls back to the values already stored in `src/data/cryptoData.json` and labels them as sample data rather than live prices.
- The historical series, forecasts, and stored MAPE values are existing project samples. They should not be represented as current market prices or verified model performance without updating them from the actual data/model pipeline.

## Important

The forecast view is for educational and project demonstration purposes only; it is not investment advice.
