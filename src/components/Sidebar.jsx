import React from "react";
import {
  LayoutDashboard, History, FlaskConical, TrendingUp, ShieldCheck,
  Hexagon, Radio, PanelsTopLeft
} from "lucide-react";

const NAV_ITEMS = [
  { key: "overview", label: "MARKET OVERVIEW", icon: PanelsTopLeft },
  { key: "dashboard", label: "MODEL DASHBOARD", icon: LayoutDashboard },
  { key: "historical", label: "HISTORICAL DATA", icon: History },
  { key: "backtest", label: "BACKTESTING", icon: FlaskConical },
  { key: "prediction", label: "PRICE PREDICTION", icon: TrendingUp },
  { key: "admin", label: "ADMIN MANAGEMENT", icon: ShieldCheck }
];

export default function Sidebar({ activeNav, setActiveNav }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark"><Hexagon size={20} strokeWidth={2.4} /></span>
        <span className="sidebar-brand-text">CRYPTO<span>PREDICT</span></span>
      </div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={"sidebar-nav-item" + (active ? " is-active" : "")}
              onClick={() => setActiveNav(item.key)}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={17} strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-status"><span className="status-dot" /><span>Analytics workspace</span></div>
      <div className="sidebar-project-card">
        <span className="sidebar-project-label">PROJECT</span>
        <strong>Crypto Predict</strong>
        <span>Computer Science · 2569</span>
      </div>
    </aside>
  );
}
