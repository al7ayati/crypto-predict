import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, BellPlus, Check, Trash2, X } from "lucide-react";
import { MARKET_ASSETS } from "../services/marketData.js";

const SIGNAL_OPTIONS = [
  ["strong_buy", "Strong Buy"],
  ["buy", "Buy"],
  ["neutral", "Neutral"],
  ["sell", "Sell"],
  ["strong_sell", "Strong Sell"],
];

function formatPrice(value) {
  if (!Number.isFinite(value)) return "Live Binance price unavailable";
  return `${value.toLocaleString("en-US", { minimumFractionDigits: value < 1 ? 4 : 2, maximumFractionDigits: value < 1 ? 8 : 2 })} USDT`;
}

function formatSignal(value) {
  return SIGNAL_OPTIONS.find(([key]) => key === value)?.[1] || "Waiting for daily data";
}

function describeAlert(alert) {
  const asset = MARKET_ASSETS.find((item) => item.symbol === alert.symbol);
  if (alert.type === "signal") return `${asset?.symbol} daily technical signal → ${formatSignal(alert.targetSignal)}`;
  const direction = alert.type === "price_above" ? "rises above" : "falls below";
  return `${asset?.symbol}/USDT ${direction} ${formatPrice(alert.targetPrice)}`;
}

export default function CreateAlertModal({
  open,
  onClose,
  defaultSymbol,
  currentPrices,
  signals,
  alerts,
  error,
  notificationError,
  onCreate,
  onRemove,
}) {
  const [symbol, setSymbol] = useState(defaultSymbol || "BTC");
  const [triggerType, setTriggerType] = useState("price_above");
  const [targetPrice, setTargetPrice] = useState("");
  const [targetSignal, setTargetSignal] = useState("strong_buy");
  const [notifyBrowser, setNotifyBrowser] = useState(false);
  const [permission, setPermission] = useState(() => "Notification" in window ? Notification.permission : "unsupported");
  const [permissionMessage, setPermissionMessage] = useState("");
  const [formError, setFormError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    setSymbol(MARKET_ASSETS.some((asset) => asset.symbol === defaultSymbol) ? defaultSymbol : "BTC");
    setTargetPrice("");
    setTriggerType("price_above");
    setNotifyBrowser(false);
    setPermissionMessage("");
    setFormError("");
    dialogRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [defaultSymbol, onClose, open]);

  if (!open) return null;

  const currentPrice = currentPrices[symbol]?.price;
  const currentSignal = signals.get(symbol);
  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      setPermissionMessage("This browser does not support desktop notifications. In-app alerts still work while the app is open.");
      return;
    }
    if (Notification.permission === "granted") {
      setPermission("granted");
      setNotifyBrowser(true);
      setPermissionMessage("Browser notifications are enabled for alerts created on this device.");
      return;
    }
    if (Notification.permission === "denied") {
      setPermission("denied");
      setNotifyBrowser(false);
      setPermissionMessage("Notifications are blocked by your browser. Change this site's notification permission in browser settings.");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setNotifyBrowser(result === "granted");
      setPermissionMessage(result === "granted"
        ? "Browser notifications are enabled for alerts created on this device."
        : "Permission was not granted. In-app alerts still work while the app is open.");
    } catch (error) {
      console.error("Unable to request browser notification permission:", error);
      setNotifyBrowser(false);
      setPermissionMessage("The browser could not request notification permission. You can still use in-app alerts.");
    }
  };

  const toggleNotifications = () => {
    if (notifyBrowser) {
      setNotifyBrowser(false);
      setPermissionMessage("Browser notifications are off for this alert.");
      return;
    }
    void enableNotifications();
  };

  const submitAlert = (event) => {
    event.preventDefault();
    setFormError("");
    if (triggerType !== "signal") {
      const parsedPrice = Number(targetPrice);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        setFormError("Enter a target price greater than zero.");
        return;
      }
      if (onCreate({ symbol, type: triggerType, targetPrice: parsedPrice, notifyBrowser })) onClose();
      return;
    }
    if (currentSignal?.error) {
      setFormError(`Daily signal data is unavailable: ${currentSignal.error}`);
      return;
    }
    if (onCreate({ symbol, type: "signal", targetSignal, notifyBrowser })) onClose();
  };

  return createPortal(<div className="alert-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section
      ref={dialogRef}
      className="alert-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-alert-title"
      tabIndex={-1}
    >
      <header className="alert-modal-header">
        <div className="alert-modal-heading-icon"><BellPlus size={19} aria-hidden="true" /></div>
        <div><p className="alert-modal-eyebrow">On-device alerts</p><h2 id="create-alert-title">Create an alert</h2></div>
        <button type="button" className="alert-modal-close" onClick={onClose} aria-label="Close alert dialog"><X size={18} /></button>
      </header>

      <form className="alert-modal-form" onSubmit={submitAlert}>
        <label className="alert-form-field">Asset
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)}>
            {MARKET_ASSETS.map((asset) => <option value={asset.symbol} key={asset.symbol}>{asset.symbol} · {asset.name}</option>)}
          </select>
        </label>

        <div className="alert-live-context">
          <span><i className={`alert-live-dot${Number.isFinite(currentPrice) ? " is-live" : ""}`} />Live Binance Spot price</span>
          <strong>{formatPrice(currentPrice)}</strong>
        </div>

        <label className="alert-form-field">Trigger condition
          <select value={triggerType} onChange={(event) => setTriggerType(event.target.value)}>
            <option value="price_above">Price crosses above</option>
            <option value="price_below">Price crosses below</option>
            <option value="signal">Daily technical signal becomes</option>
          </select>
        </label>

        {triggerType === "signal" ? (
          <>
            <label className="alert-form-field">Signal
              <select value={targetSignal} onChange={(event) => setTargetSignal(event.target.value)}>
                {SIGNAL_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <p className="alert-method-note">
              Current daily rule: <strong>{currentSignal?.isLoading ? "Loading" : formatSignal(currentSignal?.value)}</strong>.
              Uses completed Binance candles and EMA20/EMA50, RSI14, and the 7-interval trend baseline. Evaluated when daily data refreshes; not a forecast or recommendation.
            </p>
          </>
        ) : (
          <>
            <label className="alert-form-field">Target price (USDT)
              <input
                type="number"
                min="0"
                step="any"
                required
                inputMode="decimal"
                value={targetPrice}
                onChange={(event) => setTargetPrice(event.target.value)}
                placeholder={Number.isFinite(currentPrice) ? currentPrice.toString() : "e.g. 90000"}
              />
            </label>
            <p className="alert-method-note">Triggers once when a fresh Binance Spot {symbol}/USDT trade crosses your target. Price alerts pause while the trade stream is disconnected or stale; you can create the alert before a fresh quote arrives.</p>
          </>
        )}

        <div className="notification-preference">
          <span className="notification-preference-icon">{notifyBrowser ? <Bell size={16} /> : <BellOff size={16} />}</span>
          <span><strong>Browser notification</strong><small>Optional · permission is requested only after you enable it</small></span>
          <button type="button" className={`notification-switch${notifyBrowser ? " is-enabled" : ""}`} role="switch" aria-checked={notifyBrowser} onClick={toggleNotifications} aria-label="Enable browser notifications">
            <span />
          </button>
        </div>
        {(permissionMessage || permission === "unsupported" || permission === "denied") && (
          <p className="notification-permission-note" role="status">{permissionMessage || (permission === "unsupported" ? "This browser does not support notifications." : "Notifications are blocked in browser settings.")}</p>
        )}
        {formError && <p className="alert-form-error" role="alert">{formError}</p>}
        {error && <p className="alert-form-error" role="alert">{error}</p>}
        {notificationError && <p className="alert-form-error" role="alert">{notificationError}</p>}

        <footer className="alert-modal-actions">
          <button type="button" className="alert-cancel-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="alert-submit-button"><BellPlus size={15} /> Create alert</button>
        </footer>
      </form>

      <section className="saved-alerts-section" aria-labelledby="saved-alerts-heading">
        <div className="saved-alerts-heading"><h3 id="saved-alerts-heading">Saved on this device</h3><span>{alerts.length}/50</span></div>
        {alerts.length ? <ul className="saved-alerts-list">
          {alerts.map((alert) => <li key={alert.id} className={alert.triggeredAt ? "is-triggered" : ""}>
            <span><strong>{describeAlert(alert)}</strong><small>{alert.triggeredAt ? `Triggered ${new Date(alert.triggeredAt).toLocaleString()}` : "Waiting for condition"}{alert.notifyBrowser ? " · Browser notification on" : ""}</small></span>
            {alert.triggeredAt ? <Check size={16} aria-label="Triggered" /> : <span className="saved-alert-pending" aria-label="Waiting" />}
            <button type="button" onClick={() => onRemove(alert.id)} aria-label={`Delete alert: ${describeAlert(alert)}`}><Trash2 size={14} /></button>
          </li>)}
        </ul> : <p className="saved-alerts-empty">No alerts yet. Your alerts are stored only in this browser.</p>}
        <p className="saved-alerts-disclaimer">This browser-only alert list is not synchronized across devices. Keep this app open for price alerts; daily signal alerts refresh every five minutes. Browser notifications depend on your browser settings.</p>
      </section>
    </section>
  </div>, document.body);
}
