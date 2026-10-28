import React from "react";
import { Download } from "lucide-react";

export default function HistoricalPage({ assetData }) {
  const { symbol, historicalLogs } = assetData;
  const formatPrice = (value) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);

  const exportCsv = () => {
    const header = ["date", "open_usd", "high_usd", "low_usd", "close_usd", "volume"];
    const rows = historicalLogs.map((log) => [log.date, log.open, log.high, log.low, log.close, log.volume]);
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
      <div className="wide-table-scroll">
        <table className="data-table history-table">
          <thead><tr><th>Record Date</th><th>Open (USD)</th><th>High (USD)</th><th>Low (USD)</th><th>Close (USD)</th><th style={{ textAlign: "right" }}>Volume</th></tr></thead>
          <tbody>
            {historicalLogs.map((log) => (
              <tr key={log.date}>
                <td><strong>{log.date}</strong></td>
                <td>{formatPrice(log.open)}</td>
                <td style={{ color: "#0FA968" }}>{formatPrice(log.high)}</td>
                <td style={{ color: "#E14C4C" }}>{formatPrice(log.low)}</td>
                <td><strong>{formatPrice(log.close)}</strong></td>
                <td style={{ textAlign: "right" }}>{log.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
