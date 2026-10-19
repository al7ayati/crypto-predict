import React from "react";
import { TrendingUp, Award } from "lucide-react";

export default function PredictionPage({ assetData }) {
  const { symbol, forecastPrice, forecastRows } = assetData;

  return (
    <div style={{ background: "#FFFFFF", borderRadius: 22, padding: 24, border: "1px solid #E6ECF7" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <TrendingUp size={24} color="#155EEF" />
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Detailed 30-Day Price Forecast - {symbol}</h2>
          <p style={{ fontSize: 12, color: "#8592A6", margin: "2px 0 0" }}>LightGBM Machine Learning Trend Analysis</p>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginTop: 14 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #E6ECF7", color: "#8592A6", textAlign: "left" }}>
            <th style={{ padding: "10px 0" }}>Target Date</th>
            <th style={{ padding: "10px 0" }}>Predicted Price (USD)</th>
            <th style={{ padding: "10px 0" }}>Expected Change</th>
            <th style={{ padding: "10px 0", textAlign: "right" }}>Confidence Index</th>
          </tr>
        </thead>
        <tbody>
          {forecastRows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #E6ECF7" }}>
              <td style={{ padding: "12px 0", color: "#8592A6" }}>{r.date}</td>
              <td style={{ padding: "12px 0", fontWeight: 700 }}>${r.price.toLocaleString()}</td>
              <td style={{ padding: "12px 0", color: "#0FA968", fontWeight: 600 }}>+{r.change}%</td>
              <td style={{ padding: "12px 0", textAlign: "right", color: "#155EEF", fontWeight: 600 }}>{r.confidence}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}