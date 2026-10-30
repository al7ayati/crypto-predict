import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ChevronDown, Menu, X } from "lucide-react";
import { auth } from "./firebase";
import { fetchMarketSnapshot, MARKET_ASSETS } from "./services/marketData";
import useBinanceTradeStream from "./hooks/useBinanceTradeStream";

import AuthPage from "./pages/AuthPage";
import Sidebar from "./components/Sidebar";
import DateRangePicker from "./components/DateRangePicker";
import DashboardPage from "./pages/DashboardPage";
import HistoricalPage from "./pages/HistoricalPages";
const BacktestPage = lazy(() => import("./pages/BacktestPage"));
const PredictionPage = lazy(() => import("./pages/PredictionPage"));

const ASSETS = MARKET_ASSETS.map(({ symbol, name }) => ({ symbol, name }));

const ROUTES = {
  dashboard: "/dashboard",
  historical: "/historical",
  backtest: "/backtest",
  prediction: "/prediction",
};

const PAGE_TITLES = {
  dashboard: "Dashboard",
  historical: "Historical Data",
  backtest: "Backtest",
  prediction: "Predictions",
};

function getNavFromPath(pathname) {
  return Object.keys(ROUTES).find((key) => ROUTES[key] === pathname) || "dashboard";
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [marketData, setMarketData] = useState({ status: "loading", snapshot: null, error: "" });
  const [historicalFromDate, setHistoricalFromDate] = useState(() => new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10));
  const [historicalToDate, setHistoricalToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activeNav, setActiveNav] = useState(() => getNavFromPath(window.location.pathname));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [authError, setAuthError] = useState("");
  const { prices: liveTradePrices, status: tradeStreamStatus } = useBinanceTradeStream(Boolean(user));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setAuthError("");
        setUser(nextUser);
      },
      (error) => {
        console.error("Authentication state listener failed:", error);
        setAuthError("Unable to verify your sign-in status. Please refresh the page.");
        setUser(null);
      }
    );
    return unsubscribe;
  }, []);

  // ARCHITECTURE: CoinGecko supplies dashboard metadata; history pages use cached Binance candles.
  const refreshMarket = useCallback(async (signal) => {
    setMarketData((previous) => ({ ...previous, status: previous.snapshot ? "refreshing" : "loading", error: "" }));
    try {
      const snapshot = await fetchMarketSnapshot(signal);
      setMarketData({ status: "live", snapshot, error: "" });
    } catch (error) {
      if (error.name === "AbortError") return;
      setMarketData((previous) => ({
        ...previous,
        status: previous.snapshot ? "stale" : "error",
        error: error.message || "Unable to load CoinGecko market data.",
      }));
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setMarketData({ status: "loading", snapshot: null, error: "" });
      return undefined;
    }
    const controller = new AbortController();
    refreshMarket(controller.signal);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshMarket(controller.signal);
    };
    const intervalId = window.setInterval(refreshWhenVisible, 60_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshMarket, user]);

  useEffect(() => {
    const syncRoute = () => {
      if (user === undefined) return;

      const path = window.location.pathname;
      if (!user && path !== "/auth") {
        window.history.replaceState(null, "", "/auth");
        setActiveNav("dashboard");
        return;
      }
      if (user) {
        const navKey = getNavFromPath(path);
        const canonicalPath = ROUTES[navKey];
        if (path !== canonicalPath) {
          window.history.replaceState(null, "", canonicalPath);
        }
        setActiveNav(navKey);
      }
    };

    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, [user]);

  const selectedAsset = MARKET_ASSETS.find((asset) => asset.symbol === selectedSymbol);
  const liveAsset = marketData.snapshot?.assets.find((asset) => asset.symbol === selectedSymbol);
  const liveTrade = liveTradePrices[selectedSymbol];
  const hasFreshTrade = tradeStreamStatus === "live" && liveTrade && Date.now() - liveTrade.timestamp < 60_000;
  const currentAssetData = {
    ...selectedAsset,
    currentPrice: hasFreshTrade ? liveTrade.price : liveAsset?.priceUsd ?? null,
    currentPriceQuote: hasFreshTrade ? "USDT" : "USD",
    currentPriceSource: hasFreshTrade ? "Binance Spot" : "CoinGecko aggregated quote",
    marketUpdatedAt: hasFreshTrade ? new Date(liveTrade.timestamp).toISOString() : liveAsset?.providerUpdatedAt ?? marketData.snapshot?.fetchedAt ?? null,
    marketStatus: marketData.status,
  };

  const navigate = useCallback((navKey) => {
    const path = ROUTES[navKey];
    if (!path) return;
    setMobileMenuOpen(false);
    if (!user) {
      window.history.pushState(null, "", "/auth");
      setActiveNav("dashboard");
      return;
    }
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setActiveNav(navKey);
  }, [user]);

  const renderActivePage = () => {
    switch (activeNav) {
      case "dashboard":
        return <DashboardPage marketData={marketData} liveTradePrices={liveTradePrices} tradeStreamStatus={tradeStreamStatus} onRefresh={() => refreshMarket()} />;
      case "historical":
        return (
          <HistoricalPage
            symbol={selectedSymbol}
            fromDate={historicalFromDate}
            toDate={historicalToDate}
          />
        );
      case "backtest":
        return <BacktestPage />;
      case "prediction":
        return <PredictionPage assetData={currentAssetData} />;
      default:
        return <DashboardPage />;
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

  if (!user) {
    return (
      <>
        {authError && <div className="fixed inset-x-4 top-4 z-50 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg sm:inset-x-auto sm:right-4 sm:w-auto">{authError}</div>}
        <AuthPage />
      </>
    );
  }

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
      {mobileMenuOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={navigate}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        onSignOut={handleSignOut}
        signOutBusy={signOutBusy}
        signOutError={signOutError}
      />
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <button type="button" className="mobile-menu-toggle" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenuOpen}>
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            <span className="topbar-kicker">CRYPTOCURRENCY ANALYTICS</span>
            <h1>{PAGE_TITLES[activeNav] || "Dashboard"}</h1>
          </div>

          <div className="topbar-actions">
            {(activeNav === "historical" || activeNav === "prediction") && (
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
            )}
            {activeNav === "historical" && (
              <DateRangePicker
                fromDate={historicalFromDate}
                toDate={historicalToDate}
                onApply={(from, to) => {
                  setHistoricalFromDate(from);
                  setHistoricalToDate(to);
                }}
              />
            )}
          </div>
        </header>

        <div className="page-content" key={activeNav}>
          <Suspense fallback={<div className="panel text-sm text-slate-500" role="status">Loading analytics…</div>}>
            {renderActivePage()}
          </Suspense>
        </div>

        <footer className="app-footer">
          <span>Crypto Predict · Analytics workspace</span>
          <span>Forecasts are for educational purposes only.</span>
        </footer>
      </main>
    </div>
  );
}
