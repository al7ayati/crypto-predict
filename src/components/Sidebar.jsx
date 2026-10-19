import React from "react";
import {
  LayoutDashboard, History, FlaskConical, TrendingUp, ShieldCheck,
  Hexagon, Radio
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", label: "HOME / DASHBOARD", icon: LayoutDashboard },
  { key: "historical", label: "HISTORICAL DATA", icon: History },
  { key: "backtest", label: "BACKTESTING & EVALUATION", icon: FlaskConical },
  { key: "prediction", label: "PRICE PREDICTION", icon: TrendingUp },
  { key: "admin", label: "ADMIN MANAGEMENT", icon: ShieldCheck },
];

export default function Sidebar({ activeNav, setActiveNav }) {
  return (
    <aside style={{
      width: 264,
      flexShrink: 0,
      background: "linear-gradient(185deg, #0A1A3B 0%, #13275A 100%)",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      padding: "26px 18px",
      position: "sticky",
      top: 0,
      height: "100vh",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 34 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 11,
          background: "linear-gradient(135deg, #155EEF, #8FB6FF)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 20px -6px rgba(21, 94, 239, 0.5)",
        }}>
          <Hexagon size={19} color="#fff" strokeWidth={2.4} />
        </div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 16.5 }}>
          CRYPTO PREDICT
        </div>
      </div>

      <div style={{ fontSize: 11, letterSpacing: "0.09em", color: "#7C90BE", fontWeight: 600, padding: "0 8px", marginBottom: 10 }}>
        NAVIGATION
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
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 12px", borderRadius: 12,
                border: "none", cursor: "pointer", textAlign: "left",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                boxShadow: isActive ? "inset 3px 0 0 #8FB6FF" : "none",
                transition: "all 0.2s ease"
              }}
            >
              <Icon size={17.5} color={isActive ? "#fff" : "#9FB0D6"} strokeWidth={2} />
              <span style={{
                fontSize: 12.2, letterSpacing: "0.04em", fontWeight: isActive ? 600 : 500,
                color: isActive ? "#fff" : "#B9C6E6",
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "#8FB6FF", marginBottom: 14, padding: "0 8px" }}>
          <Radio size={13} />
          <span>Model engine online</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: "0.08em", color: "#7C90BE", fontWeight: 600, marginBottom: 4 }}>PROJECT</div>
          <div style={{ fontSize: 12.5, color: "#EAF0FF" }}>นายซัยยิด อับบาส ซามีร ฮายัด</div>
          <div style={{ fontSize: 11.5, color: "#93A6CC", marginTop: 2 }}>สาขาวิชา วิทยาการคอมพิวเตอร์</div>
        </div>
      </div>
    </aside>
  );
}