import React from "react";
import { Download, Search } from "lucide-react";

export default function HistoricalPage({ assetData }) {
  const { symbol, historicalLogs } = assetData;

  return (
    <div style={{ background: "#FFFFFF", borderRadius: 22, padding: 24, border: "1px solid #E6ECF7" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Historical Price Records - {symbol}</h2>
          <p style={{ fontSize: 12.5, color: "#8592A6", margin: "4px 0 0" }}>Raw daily market OHLC data points</p>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 8, background: "#EFF4FF", color: "#155EEF",
          border: "none", padding: "10px 16px", borderRadius: 12, fontWeight: 600, cursor: "pointer"
        }}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #E6ECF7", textAlign: "left", color: "#8592A6" }}>
            <th style={{ padding: "12px 8px" }}>Record Date</th>
            <th style={{ padding: "12px 8px" }}>Open (USD)</th>
            <th style={{ padding: "12px 8px" }}>High (USD)</th>
            <th style={{ padding: "12px 8px" }}>Low (USD)</th>
            <th style={{ padding: "12px 8px" }}>Close (USD)</th>
            <th style={{ padding: "12px 8px", textAlign: "right" }}>Volume</th>
          </tr>
        </thead>
        <tbody>
          {historicalLogs.map((log, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #E6ECF7" }}>
              <td style={{ padding: "12px 8px", fontWeight: 600 }}>{log.date}</td>
              <td style={{ padding: "12px 8px" }}>${log.open.toLocaleString()}</td>
              <td style={{ padding: "12px 8px", color: "#0FA968" }}>${log.high.toLocaleString()}</td>
              <td style={{ padding: "12px 8px", color: "#E14C4C" }}>${log.low.toLocaleString()}</td>
              <td style={{ padding: "12px 8px", fontWeight: 700 }}>${log.close.toLocaleString()}</td>
              <td style={{ padding: "12px 8px", textAlign: "right", color: "#8592A6" }}>{log.volume}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}