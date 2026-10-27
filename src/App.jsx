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
  { symbol: "ADA", name: "Cardano" }
];

export default function App() {
  const [user, setUser] = useState(undefined);
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [activeNav, setActiveNav] = useState("overview");
  const [assetOpen, setAssetOpen] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => setUser(currentUser)), []);

  const currentAssetData = cryptoData[selectedSymbol];

  const renderActivePage = () => {
    switch (activeNav) {
      case "overview":
        return <LandingPage assetData={currentAssetData} onNavigate={setActiveNav} />;
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
      default:
        return <LandingPage assetData={currentAssetData} onNavigate={setActiveNav} />;
    }
  };

  if (user === undefined) {
    return <div className="app-loading"><div className="loading-mark" /><span>กำลังเตรียมพื้นที่ Crypto Predict...</span></div>;
  }

  if (!user) return <AuthPage />;

  const username = user.displayName || user.email?.split("@")[0] || "User";

  return (
    <div className="app-layout">
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <span className="topbar-kicker">CRYPTOCURRENCY ANALYTICS</span>
            <h1>{activeNav === "overview" ? "Market overview" : activeNav === "dashboard" ? "Model dashboard" : activeNav === "historical" ? "Historical data" : activeNav === "backtest" ? "Backtesting & evaluation" : activeNav === "prediction" ? "Price prediction" : "Admin management"}</h1>
          </div>
          <div className="topbar-actions">
            <label className="asset-picker-label">
              <span className="sr-only">Select cryptocurrency</span>
              <select value={selectedSymbol} onChange={(event) => setSelectedSymbol(event.target.value)} aria-label="Select cryptocurrency">
                {ASSETS.map((asset) => <option value={asset.symbol} key={asset.symbol}>{asset.symbol} · {asset.name}</option>)}
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
            <div className="user-chip">
              <span className="user-avatar"><UserRound size={17} /></span>
              <span className="user-name">{username}</span>
            </div>
            <button
              className="sign-out-button"
              type="button"
              disabled={signOutBusy}
              onClick={async () => {
                setSignOutBusy(true);
                try { await signOut(auth); } finally { setSignOutBusy(false); }
              }}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} />
              <span>{signOutBusy ? "..." : "ออกจากระบบ"}</span>
            </button>
          </div>
        </header>
        <div className="page-content" key={activeNav}>{renderActivePage()}</div>
        <footer className="app-footer">
          <span>Crypto Predict · Analytics workspace</span>
          <span>ข้อมูลโมเดลมีไว้เพื่อการศึกษาเท่านั้น</span>
        </footer>
      </main>
    </div>
  );
}
