import React from "react";
import { TrendingUp } from "lucide-react";

export default function PredictionPage({ assetData }) {
  const { symbol, forecastRows } = assetData;
  return (
    <section className="dashboard-panel prediction-page">
      <div className="prediction-heading">
        <span className="quick-link-icon"><TrendingUp size={20} /></span>
        <div>
          <h3>Detailed 30-Day Price Forecast - {symbol}</h3>
          <p className="dashboard-panel-subtitle">Stored LightGBM forecast sample · educational use only</p>
        </div>
      </div>
      <div className="wide-table-scroll">
        <table className="data-table prediction-table">
          <thead><tr><th>Target Date</th><th>Predicted Price (USD)</th><th>Expected Change</th><th style={{ textAlign: "right" }}>Confidence Index</th></tr></thead>
          <tbody>
            {forecastRows.map((row) => (
              <tr key={row.day}>
                <td>{row.date || "Day " + row.day}</td>
                <td><strong>{"$" + row.price.toLocaleString()}</strong></td>
                <td style={{ color: row.change >= 0 ? "#0FA968" : "#E14C4C", fontWeight: 700 }}>{row.change >= 0 ? "+" : ""}{row.change}%</td>
                <td style={{ textAlign: "right" }}>{typeof row.confidence === "number" ? row.confidence + "%" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
