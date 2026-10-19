import React, { useState } from "react";
import { ChevronDown, Search, CircleUserRound } from "lucide-react";
import cryptoData from "./data/cryptoData.json";

import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import HistoricalPage from "./pages/HistoricalPages";
import BacktestPage from "./pages/BacktestPage";
import PredictionPage from "./pages/PredictionPage";
import AdminPage from "./pages/AdminPage";

const ASSETS = [
  { symbol: "BTC", name: "BITCOIN" },
  { symbol: "ETH", name: "ETHEREUM" },
  { symbol: "ADA", name: "CARDANO" },
];

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [assetOpen, setAssetOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");

  const currentAssetData = cryptoData[selectedSymbol];

  // ฟังก์ชันสลับแสดงผลหน้าตาม Nav Item ที่คลิก
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
      default:
        return <DashboardPage assetData={currentAssetData} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#FBFCFF", fontFamily: "Inter, sans-serif" }}>
      {/* ไซด์บาร์หลัก */}
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />

      {/* พื้นที่แสดงผลเนื้อหาหลัก */}
      <main style={{ flex: 1, minWidth: 0, padding: "26px 36px 48px" }}>
        {/* Header Bar */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12.5, color: "#8592A6", fontWeight: 500 }}>Cryptocurrency Analytics</div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: "2px 0 0", color: "#0B1526" }}>
              {selectedSymbol} - {activeNav.toUpperCase()}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Dropdown สลับเหรียญ */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setAssetOpen(!assetOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF",
                  border: "1px solid #E6ECF7", borderRadius: 13, padding: "9px 14px", cursor: "pointer"
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{selectedSymbol} ({currentAssetData.name})</span>
                <ChevronDown size={15} color="#8592A6" />
              </button>

              {assetOpen && (
                <div style={{
                  position: "absolute", top: "110%", right: 0, minWidth: 190, background: "#FFFFFF",
                  border: "1px solid #E6ECF7", borderRadius: 14, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", padding: 6, zIndex: 10
                }}>
                  {ASSETS.map((a) => (
                    <div
                      key={a.symbol}
                      onClick={() => { setSelectedSymbol(a.symbol); setAssetOpen(false); }}
                      style={{
                        padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                        display: "flex", justifyContent: "space-between",
                        background: a.symbol === selectedSymbol ? "#EFF4FF" : "transparent"
                      }}
                    >
                      <b>{a.symbol}</b>
                      <span style={{ color: "#8592A6" }}>{a.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: 38, height: 38, borderRadius: 12, background: "#155EEF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CircleUserRound size={20} color="#fff" />
            </div>
          </div>
        </header>

        {/* Dynamic Render Page Component */}
        {renderActivePage()}
      </main>
    </div>
  );
}