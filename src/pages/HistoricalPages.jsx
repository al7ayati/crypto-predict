import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";

const PAGE_SIZE = 10;

function volumeValue(value) {
  const match = String(value).match(/^([\d.]+)\s*([KMBT])?$/i);
  if (!match) return Number(value) || 0;
  const multipliers = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
  return Number(match[1]) * (multipliers[match[2]?.toUpperCase()] || 1);
}

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

export default function HistoricalPage({
  assetData,
  fromDate,
  toDate,
}) {
  const { symbol, historicalLogs } = assetData;
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate]);

  const formatPrice = (value) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return historicalLogs
      .filter((log) => (!fromDate || log.date >= fromDate) && (!toDate || log.date <= toDate))
      .filter((log) => !query || [log.date, log.open, log.high, log.low, log.close, log.volume]
        .some((value) => String(value).toLowerCase().includes(query)))
      .sort((left, right) => {
        const leftValue = sortBy === "date"
          ? left.date
          : sortBy === "volume"
            ? volumeValue(left.volume)
            : left.close;
        const rightValue = sortBy === "date"
          ? right.date
          : sortBy === "volume"
            ? volumeValue(right.volume)
            : right.close;
        const comparison = typeof leftValue === "string"
          ? leftValue.localeCompare(rightValue)
          : leftValue - rightValue;
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [fromDate, historicalLogs, search, sortBy, sortDirection, toDate]);
  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageItems = getPageItems(currentPage, pageCount);

  const handleSort = (field) => {
    setPage(1);
    if (sortBy === field) {
      setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection(field === "date" ? "desc" : "asc");
    }
  };

  const exportCsv = () => {
    const header = ["date", "open_usd", "high_usd", "low_usd", "close_usd", "volume"];
    const rows = filteredLogs.map((log) => [log.date, log.open, log.high, log.low, log.close, log.volume]);
    const csv = [header, ...rows].map((row) => row.map((value) => '"' + String(value ?? "").replaceAll('"', '""') + '"').join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = symbol.toLowerCase() + "-historical-sample.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const renderSortButton = (field, label) => {
    const active = sortBy === field;
    const Icon = active ? sortDirection === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        aria-label={`Sort by ${label}`}
        aria-pressed={active}
        className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-blue-700"
      >
        {label}<Icon size={12} />
      </button>
    );
  };

  return (
    <div className="history-page panel">
      <div className="historical-header">
        <div>
          <h3 className="page-panel-title">Historical Price Records - {symbol}</h3>
          <p className="dashboard-panel-subtitle">Stored OHLC sample data · not a live market feed</p>
        </div>
        <button className="history-export-button" type="button" onClick={exportCsv}>
          <Download size={16} /> Export CSV
        </button>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="relative ml-auto flex min-w-[210px] flex-1 flex-col gap-1.5 text-[10px] font-semibold text-slate-500 sm:max-w-xs">
          Search records
          <span className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Date, price, or volume"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[11px] font-medium text-slate-700 placeholder:text-slate-400"
            />
          </span>
        </label>
      </div>
      <div className="wide-table-scroll">
        <table className="data-table history-table">
          <thead>
            <tr>
              <th aria-sort={sortBy === "date" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>{renderSortButton("date", "Record Date")}</th>
              <th>Open (USD)</th>
              <th>High (USD)</th>
              <th>Low (USD)</th>
              <th aria-sort={sortBy === "price" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>{renderSortButton("price", "Close / Price")}</th>
              <th style={{ textAlign: "right" }} aria-sort={sortBy === "volume" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>{renderSortButton("volume", "Volume")}</th>
            </tr>
          </thead>
          <tbody>
            {visibleLogs.map((log) => (
              <tr key={log.date}>
                <td><strong>{log.date}</strong></td>
                <td>{formatPrice(log.open)}</td>
                <td style={{ color: "#0FA968" }}>{formatPrice(log.high)}</td>
                <td style={{ color: "#E14C4C" }}>{formatPrice(log.low)}</td>
                <td><strong>{formatPrice(log.close)}</strong></td>
                <td style={{ textAlign: "right" }}>{log.volume}</td>
              </tr>
            ))}
            {visibleLogs.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center" }}>No records match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4" aria-label="Historical data pages">
        <p className="text-[10px] text-slate-500">
          {filteredLogs.length === 0
            ? "No records"
            : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of ${filteredLogs.length} records`}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40"
          >
            Previous
          </button>
          {pageItems.map((item) => typeof item === "number" ? (
            <button
              key={item}
              type="button"
              onClick={() => setPage(item)}
              aria-current={item === currentPage ? "page" : undefined}
              className={`min-w-8 rounded-lg border px-2 py-1.5 text-[10px] font-semibold ${item === currentPage ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="px-1 text-[10px] text-slate-400">…</span>
          ))}
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            disabled={currentPage === pageCount}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </nav>
    </div>
  );
}
