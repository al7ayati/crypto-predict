import React, { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import {
  LayoutDashboard, History, FlaskConical, TrendingUp, ShieldCheck,
  Search, ChevronDown, CircleUserRound, ArrowUpRight, ArrowDownRight,
  Hexagon, Radio, Gauge, Target, Percent
} from "lucide-react";

import cryptoData from "./data/cryptoData.json";

const COLORS = {
  canvas: "#FBFCFF",
  panel: "#FFFFFF",
  ink: "#0B1526",
  inkSoft: "#4A5670",
  slate: "#8592A6",
  hairline: "#E6ECF7",
  tint: "#EFF4FF",
  primary: "#155EEF",
  primaryDeep: "#0B3B8C",
  sidebar: "#0A1A3B",
  sidebarSoft: "#13275A",
  positive: "#0FA968",
  negative: "#E14C4C",
};

const ASSETS = [
  { symbol: "BTC", name: "BITCOIN" },
  { symbol: "ETH", name: "ETHEREUM" },
  { symbol: "ADA", name: "CARDANO" },
];

const NAV_ITEMS = [
  { key: "dashboard", label: "HOME / DASHBOARD", icon: LayoutDashboard },
  { key: "historical", label: "HISTORICAL DATA", icon: History },
  { key: "backtest", label: "BACKTESTING & EVALUATION", icon: FlaskConical },
  { key: "prediction", label: "PRICE PREDICTION", icon: TrendingUp },
  { key: "admin", label: "ADMIN MANAGEMENT", icon: ShieldCheck },
];

function fmtUSD(val) {
  if (val < 1) {
    return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 3 });
  }
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [assetOpen, setAssetOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("prediction");

  // ดึงข้อมูลตามเหรียญที่เลือกจาก JSON
  const currentAssetData = cryptoData[selectedSymbol];

  const upside = useMemo(() => {
    const { forecastPrice, currentPrice } = currentAssetData;
    return (((forecastPrice - currentPrice) / currentPrice) * 100).toFixed(2);
  }, [currentAssetData]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.canvas, fontFamily: "Inter, sans-serif" }}>
      {/* SIDEBAR */}
      <aside style={{
        width: 264, background: `linear-gradient(185deg, ${COLORS.sidebar}, ${COLORS.sidebarSoft})`,
        color: "#fff", display: "flex", flexDirection: "column", padding: "26px 18px", position: "sticky", top: 0, height: "100vh"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 34 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Hexagon size={19} color="#fff" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16.5 }}>CRYPTO PREDICT</div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveNav(item.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12,
                  border: "none", cursor: "pointer", background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  color: isActive ? "#fff" : "#B9C6E6", fontWeight: isActive ? 600 : 500
                }}
              >
                <Icon size={17.5} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", background: "rgba(255,255,255,0.05)", padding: 14, borderRadius: 14 }}>
          <div style={{ fontSize: 10.5, color: "#7C90BE", fontWeight: 600 }}>PROJECT</div>
          <div style={{ fontSize: 12.5, color: "#EAF0FF", marginTop: 4 }}>นายซัยยิด อับบาส ซามีร ฮายัด</div>
          <div style={{ fontSize: 11.5, color: "#93A6CC" }}>สาขาวิชา วิทยาการคอมพิวเตอร์</div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: "26px 36px" }}>
        {/* HEADER */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12.5, color: COLORS.slate }}>Price Prediction</div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{selectedSymbol} Forecast Overview</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Dropdown 3 สกุลเงินหลัก */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setAssetOpen(!assetOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, background: COLORS.panel,
                  border: `1px solid ${COLORS.hairline}`, borderRadius: 13, padding: "9px 14px", cursor: "pointer"
                }}
              >
                <span style={{ fontWeight: 600 }}>{selectedSymbol} ({currentAssetData.name})</span>
                <ChevronDown size={15} color={COLORS.slate} />
              </button>

              {assetOpen && (
                <div style={{
                  position: "absolute", top: "110%", right: 0, minWidth: 200, background: COLORS.panel,
                  border: `1px solid ${COLORS.hairline}`, borderRadius: 14, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", padding: 6, zIndex: 10
                }}>
                  {ASSETS.map((a) => (
                    <div
                      key={a.symbol}
                      onClick={() => { setSelectedSymbol(a.symbol); setAssetOpen(false); }}
                      style={{
                        padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                        display: "flex", justifyContent: "space-between",
                        background: a.symbol === selectedSymbol ? COLORS.tint : "transparent"
                      }}
                    >
                      <b>{a.symbol}</b>
                      <span style={{ color: COLORS.slate }}>{a.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* METRIC CARDS */}
        <div style={{ display: "flex", gap: 18, marginBottom: 22 }}>
          <div style={{ flex: 1, background: COLORS.panel, padding: 20, borderRadius: 20, border: `1px solid ${COLORS.hairline}` }}>
            <div style={{ fontSize: 12, color: COLORS.slate, fontWeight: 600 }}>CURRENT PRICE (USD)</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>{fmtUSD(currentAssetData.currentPrice)}</div>
          </div>
          <div style={{ flex: 1, background: COLORS.panel, padding: 20, borderRadius: 20, border: `1px solid ${COLORS.hairline}` }}>
            <div style={{ fontSize: 12, color: COLORS.slate, fontWeight: 600 }}>30-DAY FORECAST PRICE</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, color: COLORS.primaryDeep }}>
              {fmtUSD(currentAssetData.forecastPrice)}
              <span style={{ fontSize: 13, color: Number(upside) >= 0 ? COLORS.positive : COLORS.negative, marginLeft: 8 }}>
                {upside}%
              </span>
            </div>
          </div>
          <div style={{ flex: 1, background: COLORS.panel, padding: 20, borderRadius: 20, border: `1px solid ${COLORS.hairline}` }}>
            <div style={{ fontSize: 12, color: COLORS.slate, fontWeight: 600 }}>MODEL MAPE ERROR RATE</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>{currentAssetData.mape}%</div>
            <div style={{ fontSize: 11, color: COLORS.slate }}>{currentAssetData.modelVersion}</div>
          </div>
        </div>

        {/* CHART & TABLE GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
          {/* Chart Panel */}
          <div style={{ background: COLORS.panel, padding: 20, borderRadius: 22, border: `1px solid ${COLORS.hairline}` }}>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>Historical & Forecasted Price</div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentAssetData.series}>
                  <CartesianGrid vertical={false} stroke={COLORS.hairline} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="actual" stroke={COLORS.primaryDeep} fill={COLORS.tint} strokeWidth={2} />
                  <Area type="monotone" dataKey="forecast" stroke={COLORS.primary} strokeDasharray="5 5" fill="none" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table Panel */}
          <div style={{ background: COLORS.panel, padding: 20, borderRadius: 22, border: `1px solid ${COLORS.hairline}` }}>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>30-Day Forecast Data</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.hairline}`, color: COLORS.slate, textAlign: "left" }}>
                  <th style={{ paddingBottom: 8 }}>Day</th>
                  <th style={{ paddingBottom: 8 }}>Predicted</th>
                  <th style={{ paddingBottom: 8, textAlign: "right" }}>Δ%</th>
                </tr>
              </thead>
              <tbody>
                {currentAssetData.forecastRows.map((row) => (
                  <tr key={row.day} style={{ borderBottom: `1px solid ${COLORS.hairline}` }}>
                    <td style={{ padding: "10px 0" }}>Day {row.day}</td>
                    <td style={{ padding: "10px 0", fontWeight: 600 }}>{fmtUSD(row.price)}</td>
                    <td style={{ padding: "10px 0", textAlign: "right", color: row.change >= 0 ? COLORS.positive : COLORS.negative }}>
                      +{row.change}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}