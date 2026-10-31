import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MARKET_ASSETS } from "../config/marketData.js";
import { hasPriceAlertCrossed, hasSignalAlertTransition } from "../services/alertRules.js";
import { fetchPriceHistory, toDailyPrices } from "../services/marketData.js";
import {
  calculateDailyTrendSignal,
  calculateTechnicalIndicators,
  calculateTrendBaseline,
} from "../services/technicalIndicators.js";

const STORAGE_KEY = "crypto-predict-market-alerts";
const SIGNAL_LOOKBACK_DAYS = 90;
const MAX_ALERTS = 50;

function isValidAlert(alert) {
  return alert &&
    typeof alert.id === "string" &&
    MARKET_ASSETS.some((asset) => asset.symbol === alert.symbol) &&
    ["price_above", "price_below", "signal"].includes(alert.type) &&
    (alert.type === "signal"
      ? ["strong_buy", "buy", "neutral", "sell", "strong_sell"].includes(alert.targetSignal)
      : Number.isFinite(alert.targetPrice) && alert.targetPrice > 0) &&
    typeof alert.notifyBrowser === "boolean";
}

function readAlerts() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { alerts: [], error: "" };
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Saved market alerts are not a list.");
    const alerts = parsed.filter(isValidAlert).slice(0, MAX_ALERTS);
    if (alerts.length !== parsed.length) {
      return { alerts, error: "Some saved alerts were invalid and have been skipped." };
    }
    return { alerts, error: "" };
  } catch (error) {
    console.error("Unable to read saved market alerts:", error);
    return { alerts: [], error: "Saved alerts could not be read from this browser." };
  }
}

function getSignalHistoryRange() {
  const now = Date.now();
  return {
    fromDate: new Date(now - (SIGNAL_LOOKBACK_DAYS - 1) * 86_400_000).toISOString().slice(0, 10),
    toDate: new Date(now).toISOString().slice(0, 10),
  };
}

function getSignalSnapshot(candles) {
  if (!candles?.length) return null;
  const rows = candles.map((candle) => ({
    actual: candle.close,
    price: candle.close,
    timestamp: candle.timestamp,
  }));
  const indicators = calculateTechnicalIndicators(rows);
  const recent = rows.slice(-8);
  if (recent.length < 8) return null;
  const baseline = calculateTrendBaseline(recent, 1);
  return calculateDailyTrendSignal(indicators.at(-1), baseline.meanDailyLogReturn);
}

export default function usePriceSignalAlerts({ liveTradePrices, tradeStreamStatus, enabled }) {
  const [alertState, setAlertState] = useState(readAlerts);
  const [notificationError, setNotificationError] = useState("");
  const [recentlyTriggered, setRecentlyTriggered] = useState(null);
  const { alerts, error: storageError } = alertState;
  const previousValues = useRef(new Map());
  const alertSymbols = useMemo(() => [
    ...new Set(alerts.filter((alert) => alert.type === "signal" && !alert.triggeredAt).map((alert) => alert.symbol)),
  ], [alerts]);
  const range = getSignalHistoryRange();
  const signalQueries = useQueries({
    queries: alertSymbols.map((symbol) => ({
      queryKey: ["market-alert-signal", symbol, range.fromDate, range.toDate],
      enabled,
      queryFn: async ({ signal }) => {
        const rows = await fetchPriceHistory(symbol, range.fromDate, range.toDate, signal);
        const candles = toDailyPrices(rows).filter((candle) => candle.candleCloseTime < Date.now());
        if (candles.length < 50) throw new Error(`At least 50 completed daily candles are required for the ${symbol} trend signal.`);
        const signalCandles = candles.slice(-50);
        const isContiguous = signalCandles.every((candle, index) =>
          index === 0 || candle.timestamp - signalCandles[index - 1].timestamp === 86_400_000
        );
        if (!isContiguous) throw new Error(`The ${symbol} daily trend signal is unavailable because the latest 50 UTC candles contain missing dates.`);
        return signalCandles;
      },
      staleTime: 5 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
    })),
  });
  const signals = useMemo(() => new Map(alertSymbols.map((symbol, index) => {
    const query = signalQueries[index];
    return [symbol, {
      value: getSignalSnapshot(query.data),
      error: query.error?.message || "",
      isLoading: query.isPending,
    }];
  })), [alertSymbols, signalQueries]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
      setAlertState((current) => current.error ? { ...current, error: "" } : current);
    } catch (error) {
      console.error("Unable to save market alerts:", error);
      setAlertState((current) => ({ ...current, error: "Alerts cannot be saved in this browser session." }));
    }
  }, [alerts]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      setAlertState(readAlerts());
      previousValues.current.clear();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const matchedAlerts = [];
    for (const alert of alerts) {
      if (alert.triggeredAt) continue;
      if (alert.type === "signal") {
        const currentSignal = signals.get(alert.symbol)?.value;
        if (!currentSignal) continue;
        const key = `${alert.id}:signal`;
        const previousSignal = previousValues.current.has(key)
          ? previousValues.current.get(key)
          : alert.lastSignal;
        previousValues.current.set(key, currentSignal);
        if (hasSignalAlertTransition(previousSignal, currentSignal, alert.targetSignal)) {
          matchedAlerts.push(alert);
        }
        continue;
      }

      const quote = liveTradePrices[alert.symbol];
      const currentPrice = tradeStreamStatus === "live" && quote && Date.now() - quote.timestamp < 60_000
        ? quote.price
        : null;
      if (!Number.isFinite(currentPrice)) continue;
      const key = `${alert.id}:price`;
      const previousPrice = previousValues.current.has(key)
        ? previousValues.current.get(key)
        : alert.lastObservedPrice;
      previousValues.current.set(key, currentPrice);
      if (!Number.isFinite(previousPrice)) continue;
      if (hasPriceAlertCrossed(alert.type, previousPrice, currentPrice, alert.targetPrice)) matchedAlerts.push(alert);
    }

    if (!matchedAlerts.length) return;
    const matchedIds = new Set(matchedAlerts.map((alert) => alert.id));
    setAlertState((current) => ({
      ...current,
      alerts: current.alerts.map((alert) => matchedIds.has(alert.id)
        ? { ...alert, triggeredAt: new Date().toISOString() }
        : alert),
    }));
    for (const alert of matchedAlerts) {
      setRecentlyTriggered(alert);
      if (!alert.notifyBrowser || !("Notification" in window) || Notification.permission !== "granted") continue;
      const body = alert.type === "signal"
        ? `${alert.symbol} daily trend signal is now ${alert.targetSignal.replace("_", " ")}.`
        : `${alert.symbol}/USDT crossed ${alert.type === "price_above" ? "above" : "below"} ${alert.targetPrice} USDT.`;
      try {
        const notification = new Notification("Crypto Predict alert", { body });
        notification.onclick = () => window.focus();
      } catch (error) {
        console.error("Unable to show a browser notification for a market alert:", error);
        setNotificationError("A browser alert triggered, but this browser could not display its notification.");
      }
    }
  }, [alerts, enabled, liveTradePrices, signals, tradeStreamStatus]);

  const addAlert = (draft) => {
    if (alerts.length >= MAX_ALERTS) {
      setAlertState((current) => ({ ...current, error: `You can save up to ${MAX_ALERTS} alerts in this browser.` }));
      return false;
    }
    const candidate = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      triggeredAt: null,
      lastSignal: draft.type === "signal" ? signals.get(draft.symbol)?.value ?? null : null,
      lastObservedPrice: draft.type === "signal" ||
        tradeStreamStatus !== "live" ||
        Date.now() - (liveTradePrices[draft.symbol]?.timestamp || 0) >= 60_000
        ? null
        : liveTradePrices[draft.symbol]?.price ?? null,
    };
    if (!isValidAlert(candidate)) {
      setAlertState((current) => ({ ...current, error: "Enter a valid alert condition and value." }));
      return false;
    }
    setAlertState((current) => ({ ...current, alerts: [candidate, ...current.alerts] }));
    setNotificationError("");
    return true;
  };

  const removeAlert = (alertId) => {
    previousValues.current.delete(`${alertId}:price`);
    previousValues.current.delete(`${alertId}:signal`);
    setAlertState((current) => ({ ...current, alerts: current.alerts.filter((alert) => alert.id !== alertId) }));
  };

  return {
    alerts,
    error: storageError,
    notificationError,
    recentlyTriggered,
    signals,
    addAlert,
    removeAlert,
  };
}
