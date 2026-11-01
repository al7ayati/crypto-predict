import React, { useEffect, useRef } from "react";
import {
  LayoutDashboard, History, FlaskConical, TrendingUp, LogOut, X
} from "lucide-react";
import BrandMark from "./BrandMark";
import PwaInstallButton from "./PwaInstallButton";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "prediction", label: "Predictions", icon: TrendingUp },
  { key: "backtest", label: "Backtest", icon: FlaskConical },
  { key: "historical", label: "Historical Data", icon: History }
];

export default function Sidebar({ activeNav, setActiveNav, isOpen, onClose, user, onSignOut, signOutBusy, signOutError }) {
  const sidebarRef = useRef(null);
  const mobileHidden = !isOpen && window.matchMedia("(max-width: 930px)").matches;
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement;
    const firstControl = sidebarRef.current?.querySelector("button:not([disabled])");
    firstControl?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(sidebarRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || [])].filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !sidebarRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebarRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [isOpen, onClose]);
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside ref={sidebarRef} className={`sidebar${isOpen ? " is-open" : ""}`} aria-hidden={mobileHidden} inert={mobileHidden}>
      <div className="sidebar-brand">
        <BrandMark className="sidebar-brand-mark" iconSize={20} />
        <span className="sidebar-brand-text">CRYPTO<span>PREDICT</span></span>
        <button type="button" className="sidebar-close-button" aria-label="Close navigation" onClick={onClose}><X size={19} /></button>
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
      <div className="mt-2 border-t border-white/10 pt-4">
        <div className="flex min-w-0 items-center gap-3 px-1">
          {user?.photoURL ? (
            <img className="h-10 w-10 rounded-xl object-cover" src={user.photoURL} alt="" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-400/20 text-xs font-bold text-blue-100">
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-xs font-semibold text-white">{displayName}</strong>
            <span className="block truncate text-[10px] text-blue-100/60">{user?.email || "Signed-in account"}</span>
          </div>
        </div>
        <PwaInstallButton />
        {signOutError && <p className="mt-3 text-xs leading-5 text-rose-200" role="alert">{signOutError}</p>}
        <button
          type="button"
          className="mt-4 flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold text-blue-100/75 transition hover:bg-white/10 hover:text-white"
          onClick={onSignOut}
          disabled={signOutBusy}
        >
          <LogOut size={16} aria-hidden="true" />
          <span>{signOutBusy ? "Signing out..." : "Log Out"}</span>
        </button>
      </div>
    </aside>
  );
}
