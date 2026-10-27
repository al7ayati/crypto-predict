import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { auth } from "./firebase";
import cryptoData from "./data/cryptoData.json";

import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import HistoricalPage from "./pages/HistoricalPages";
import BacktestPage from "./pages/BacktestPage";
import PredictionPage from "./pages/PredictionPage";
import AdminPage from "./pages/AdminPage";

const ASSETS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "ADA", name: "Cardano" },
];

const PAGE_TITLES = {
  overview: "Market overview",
  dashboard: "Model dashboard",
  historical: "Historical data",
  backtest: "Backtesting & evaluation",
  prediction: "Price prediction",
  admin: "Admin management",
};

export default function App() {
  const [user, setUser] = useState(undefined);
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [activeNav, setActiveNav] = useState("overview");
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const currentAssetData = cryptoData[selectedSymbol];

  const renderActivePage = () => {
    switch (activeNav) {
      case "dashboard":
        return <DashboardPage assetData={currentAssetData} />;
      case "historical":
        return <HistoricalPage assetData={currentAssetData} />;
      case "backtest":
        return <BacktestPage assetData={currentAssetData} />;
      case "prediction":
        return <PredictionPage assetData={currentAssetData} />;
      case "admin":
        return <AdminPage />;
      case "overview":
      default:
        return (
          <LandingPage
            assetData={currentAssetData}
            onNavigate={setActiveNav}
          />
        );
    }
  };

  if (user === undefined) {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <div className="loading-mark" />
        <span>Loading Crypto Predict...</span>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const username = user.displayName || user.email?.split("@")[0] || "User";

  const handleSignOut = async () => {
    if (signOutBusy) return;
    setSignOutBusy(true);
    setSignOutError("");

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-out failed:", error);
      setSignOutError("Unable to sign out. Please try again.");
    } finally {
      setSignOutBusy(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <span className="topbar-kicker">CRYPTOCURRENCY ANALYTICS</span>
            <h1>{PAGE_TITLES[activeNav] || PAGE_TITLES.overview}</h1>
          </div>

          <div className="topbar-actions">
            <label className="asset-picker-label">
              <span className="sr-only">Select cryptocurrency</span>
              <select
                value={selectedSymbol}
                onChange={(event) => setSelectedSymbol(event.target.value)}
                aria-label="Select cryptocurrency"
              >
                {ASSETS.map((asset) => (
                  <option value={asset.symbol} key={asset.symbol}>
                    {asset.symbol} · {asset.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>

            <div className="user-chip">
              <span className="user-avatar">
                <UserRound size={17} aria-hidden="true" />
              </span>
              <span className="user-name">{username}</span>
            </div>

            <button
              className="sign-out-button"
              type="button"
              disabled={signOutBusy}
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} aria-hidden="true" />
              <span>{signOutBusy ? "Signing out..." : "Sign out"}</span>
            </button>
          </div>
        </header>

        {signOutError && (
          <div className="form-message form-error" role="alert">
            {signOutError}
          </div>
        )}

        <div className="page-content" key={activeNav}>
          {renderActivePage()}
        </div>

        <footer className="app-footer">
          <span>Crypto Predict · Analytics workspace</span>
          <span>Forecasts are for educational purposes only.</span>
        </footer>
      </main>
    </div>
  );
}
