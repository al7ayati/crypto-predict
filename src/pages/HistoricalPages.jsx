import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";
import { COINGECKO_ATTRIBUTION_URL, fetchPriceHistory, toDailyPrices } from "../services/marketData";

const PAGE_SIZE = 10;
const today = () => new Date().toISOString().slice(0, 10);
const initialStartDate = () => new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

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
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

export default function HistoricalPage({ symbol, fromDate, toDate }) {
  const [liveLogs, setLiveLogs] = useState([]);
  const [historyState, setHistoryState] = useState("loading");
  const [historyError, setHistoryError] = useState("");
  const [fetchedAt, setFetchedAt] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);

  // CHANGEPOINT: Historical page consumes price observations only; it never manufactures OHLC values.
  useEffect(() => {
    const controller = new AbortController();
    const end = toDate || today();
    const start = fromDate || initialStartDate();
    setPage(1);
    setHistoryState("loading");
    setHistoryError("");
    setLiveLogs([]);
    if (new Date(end) - new Date(start) > 365 * 86_400_000) {
      setHistoryState("error");
      setHistoryError("The public CoinGecko endpoint supports at most one year of history.");
      return () => controller.abort();
    }
    fetchPriceHistory(symbol, start, end, controller.signal)
      .then((observations) => {
        const daily = toDailyPrices(observations).map(({ date, price }) => ({ date, price }));
        if (!daily.length) throw new Error("No price observations were returned for this date range.");
        setLiveLogs(daily);
        setFetchedAt(new Date().toISOString());
        setHistoryState("live");
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setHistoryState("error");
        setHistoryError(error.message || "Unable to load CoinGecko historical prices.");
      });
    return () => controller.abort();
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
    const rows = [["date_utc", "observed_price_usd"], ...filteredLogs.map((row) => [row.date, row.price])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${symbol.toLowerCase()}-coingecko-daily-prices.csv`;
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
      <div><h3 className="page-panel-title">Historical Price Observations · {symbol}</h3><p className="dashboard-panel-subtitle">CoinGecko observed prices, collapsed to the last observation of each UTC date · USD</p></div>
      <button className="history-export-button" type="button" onClick={exportCsv} disabled={!filteredLogs.length}><Download size={16} /> Export CSV</button>
    </div>
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="relative ml-auto flex min-w-[210px] flex-1 flex-col gap-1.5 text-[10px] font-semibold text-slate-500 sm:max-w-xs">Search date or price
        <span className="relative"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Date or price" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[11px] font-medium text-slate-700 placeholder:text-slate-400" /></span>
      </label>
    </div>
    <div className="wide-table-scroll"><table className="data-table history-table">
      <thead><tr><th aria-sort={sortBy === "date" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>{renderSortButton("date", "Record date (UTC)")}</th><th aria-sort={sortBy === "price" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>{renderSortButton("price", "Observed price (USD)")}</th></tr></thead>
      <tbody>
        {visibleLogs.map((row) => <tr key={row.date}><td><strong>{row.date}</strong></td><td><strong>{formatPrice(row.price)}</strong></td></tr>)}
        {!visibleLogs.length && <tr><td colSpan={2} style={{ textAlign: "center" }}>{historyState === "loading" ? "Loading historical price observations…" : historyState === "error" ? "Historical data is unavailable." : "No records match these filters."}</td></tr>}
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
    <p className="mt-3 text-[10px] text-slate-400" role={historyError ? "status" : undefined}>{historyError || (historyState === "loading" ? "Waiting for CoinGecko…" : `Source: CoinGecko · requested ${fetchedAt ? new Date(fetchedAt).toLocaleString() : "—"}. Values are observed prices, not OHLC candles or trading volume.`)} <a href={COINGECKO_ATTRIBUTION_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">Provider details</a></p>
  </div>;
}
