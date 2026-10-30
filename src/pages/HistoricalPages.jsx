import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";
import { BINANCE_MARKET_DATA_URL, fetchPriceHistory, toDailyPrices } from "../services/marketData";
import { formatUtcTimestamp } from "../utils/formatting";

const PAGE_SIZE = 10;

function getPageItems(page, pageCount) {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const start = Math.max(2, Math.min(page - 1, pageCount - 3));
  const end = Math.min(pageCount - 1, Math.max(page + 1, 4));
  const items = [1];
  if (start > 2) items.push("left-ellipsis");
  for (let number = start; number <= end; number += 1) items.push(number);
  if (end < pageCount - 1) items.push("right-ellipsis");
  items.push(pageCount);
  return items;
}

function formatPrice(value) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: value < 1 ? 4 : 2, maximumFractionDigits: value < 1 ? 8 : 2 })} USDT`;
}

export default function HistoricalPage({ symbol, fromDate, toDate }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);

  const historyQuery = useQuery({
    queryKey: ["market-history", symbol, fromDate, toDate],
    queryFn: async ({ signal }) => {
      const observations = await fetchPriceHistory(symbol, fromDate, toDate, signal);
      const candles = toDailyPrices(observations);
      if (!candles.length) throw new Error("No Binance daily candles were returned for this date range.");
      return candles;
    },
    refetchInterval: 5 * 60 * 1000,
  });
  const liveLogs = historyQuery.data || [];
  const historyError = historyQuery.error?.message || "";
  const historyState = historyQuery.isPending ? "loading" : historyQuery.isError && !liveLogs.length ? "error" : "live";
  const fetchedAt = historyQuery.dataUpdatedAt ? new Date(historyQuery.dataUpdatedAt).toISOString() : null;

  useEffect(() => {
    setPage(1);
  }, [fromDate, symbol, toDate]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return liveLogs
      .filter((row) => (!fromDate || row.date >= fromDate) && (!toDate || row.date <= toDate))
      .filter((row) => !query || [row.date, row.price].some((value) => String(value).toLowerCase().includes(query)))
      .sort((left, right) => {
        const compare = sortBy === "date" ? left.date.localeCompare(right.date) : left.price - right.price;
        return sortDirection === "asc" ? compare : -compare;
      });
  }, [fromDate, liveLogs, search, sortBy, sortDirection, toDate]);
  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageItems = getPageItems(currentPage, pageCount);

  const handleSort = (field) => {
    setPage(1);
    if (sortBy === field) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDirection(field === "date" ? "desc" : "asc"); }
  };

  const exportCsv = () => {
    const rows = [
      ["date_utc", "open_usdt", "high_usdt", "low_usdt", "close_usdt", "base_volume", "quote_volume_usdt", "trade_count"],
      ...filteredLogs.map((row) => [row.date, row.open, row.high, row.low, row.close, row.volume, row.quoteVolume, row.trades]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${symbol.toLowerCase()}-binance-daily-candles.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const renderSortButton = (field, label) => {
    const active = sortBy === field;
    const Icon = active ? sortDirection === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
    return <button type="button" onClick={() => handleSort(field)} aria-label={`Sort by ${label}`} aria-pressed={active} className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-blue-700">{label}<Icon size={12} /></button>;
  };

  return <div className="history-page panel">
    <div className="historical-header">
      <div><h3 className="page-panel-title">Historical Market Data · {symbol}</h3><p className="dashboard-panel-subtitle">Binance Spot daily OHLCV candles · {symbol}/USDT · candle dates in UTC</p></div>
      <button className="history-export-button" type="button" onClick={exportCsv} disabled={!filteredLogs.length}><Download size={16} /> Export CSV</button>
    </div>
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="relative ml-auto flex min-w-[210px] flex-1 flex-col gap-1.5 text-[10px] font-semibold text-slate-500 sm:max-w-xs">Search date or price
        <span className="relative"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Date or price" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[11px] font-medium text-slate-700 placeholder:text-slate-400" /></span>
      </label>
    </div>
    <div className="wide-table-scroll"><table className="data-table history-table">
      <thead><tr><th aria-sort={sortBy === "date" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>{renderSortButton("date", "Candle date (UTC)")}</th><th>Open (USDT)</th><th>High (USDT)</th><th>Low (USDT)</th><th aria-sort={sortBy === "price" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>{renderSortButton("price", "Close (USDT)")}</th><th>Volume ({symbol})</th><th>Volume (USDT)</th><th>Trades</th></tr></thead>
      <tbody>
        {visibleLogs.map((row) => <tr key={row.date}>
          <td data-label="Candle date (UTC)"><strong>{row.date}</strong></td>
          <td data-label="Open (USDT)">{formatPrice(row.open)}</td>
          <td data-label="High (USDT)">{formatPrice(row.high)}</td>
          <td data-label="Low (USDT)">{formatPrice(row.low)}</td>
          <td data-label="Close (USDT)"><strong>{formatPrice(row.close)}</strong></td>
          <td data-label={`Volume (${symbol})`}>{row.volume.toLocaleString("en-US", { maximumFractionDigits: 4 })}</td>
          <td data-label="Volume (USDT)">{row.quoteVolume.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
          <td data-label="Trades">{row.trades.toLocaleString("en-US")}</td>
        </tr>)}
        {!visibleLogs.length && <tr><td colSpan={8} style={{ textAlign: "center" }}>{historyState === "loading" ? "Loading Binance daily candles…" : historyState === "error" ? "Historical data is unavailable." : "No records match these filters."}</td></tr>}
      </tbody>
    </table></div>
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4" aria-label="Historical data pages">
      <p className="text-[10px] text-slate-500">{filteredLogs.length ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of ${filteredLogs.length} daily observations` : "No records"}</p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40">Previous</button>
        {pageItems.map((item) => typeof item === "number" ? <button key={item} type="button" onClick={() => setPage(item)} aria-current={item === currentPage ? "page" : undefined} className={`min-w-8 rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${item === currentPage ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{item}</button> : <span key={item} className="px-1 text-[10px] text-slate-400">…</span>)}
        <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40">Next</button>
      </div>
    </nav>
    <p className="mt-3 text-[10px] text-slate-400" role={historyError ? "status" : undefined}>{historyError ? `${liveLogs.length ? "Showing cached candles; refresh failed" : "Unable to load candles"}: ${historyError}` : historyState === "loading" ? "Waiting for Binance market data…" : `Source: Binance Spot API · ${fetchedAt ? `fetched ${formatUtcTimestamp(fetchedAt)}` : "cached data"} · open, high, low, close, and volume are exchange candle fields; the latest UTC candle may still be forming.`} <a href={BINANCE_MARKET_DATA_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">Provider details</a></p>
  </div>;
}
