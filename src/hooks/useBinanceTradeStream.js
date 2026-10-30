import { useEffect, useState } from "react";
import { MARKET_ASSETS, MARKET_DATA_CONFIG } from "../config/marketData.js";

const PAIR_TO_SYMBOL = new Map(MARKET_ASSETS.map(({ binancePair, symbol }) => [binancePair, symbol]));
const STREAMS = MARKET_ASSETS.map(({ binancePair }) => `${binancePair.toLowerCase()}@trade`).join("/");

export default function useBinanceTradeStream(enabled) {
  const [prices, setPrices] = useState({});
  const [status, setStatus] = useState("offline");

  useEffect(() => {
    if (!enabled) {
      setPrices({});
      setStatus("offline");
      return undefined;
    }

    let disposed = false;
    let socket;
    let retryTimer;
    let retryDelay = 1000;
    let openedAt = 0;
    const scheduleReconnect = () => {
      if (disposed) return;
      setStatus("reconnecting");
      retryTimer = window.setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30_000);
    };
    const connect = () => {
      if (disposed) return;
      setStatus("connecting");
      try {
        socket = new WebSocket(`${MARKET_DATA_CONFIG.binance.streamBaseUrl}?streams=${STREAMS}`);
      } catch (error) {
        console.warn("Unable to open the Binance public trade stream:", error);
        scheduleReconnect();
        return;
      }
      socket.onopen = () => {
        openedAt = Date.now();
        setStatus("live");
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const trade = message.data;
          const symbol = PAIR_TO_SYMBOL.get(trade?.s);
          const price = Number(trade?.p);
          const timestamp = Number(trade?.T);
          if (!symbol || !Number.isFinite(price) || price <= 0 || !Number.isFinite(timestamp)) return;
          setPrices((current) => ({ ...current, [symbol]: { price, timestamp } }));
        } catch (error) {
          console.warn("Unable to parse Binance trade stream message:", error);
        }
      };
      socket.onerror = () => {
        console.warn("Binance public trade stream encountered a connection error.");
      };
      socket.onclose = () => {
        if (disposed) return;
        if (Date.now() - openedAt > 30_000) retryDelay = 1000;
        scheduleReconnect();
      };
    };

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      socket?.close(1000, "Dashboard closed");
    };
  }, [enabled]);

  return { prices, status };
}
