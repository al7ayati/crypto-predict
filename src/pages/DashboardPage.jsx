import React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Gauge, Target, Percent } from "lucide-react";

const COLORS = {
  slate: "#8592A6",
  hairline: "#E6ECF7",
  tint: "#EFF4FF",
  primary: "#155EEF",
  primaryDeep: "#0B3B8C",
  positive: "#0FA968",
  negative: "#E14C4C"
};

const money = (value) => "$" + Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage({ assetData }) {
  const { symbol, currentPrice, forecastPrice, mape, modelVersion, series, forecastRows } = assetData;
  const upside = ((forecastPrice - currentPrice) / currentPrice) * 100;

  return (
    <div className="dashboard-contents">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label-row"><Gauge size={19} color={COLORS.primary} /><span className="metric-label">DATASET PRICE (USD)</span></div>
          <div className="metric-value">{money(currentPrice)}</div>
          <div className="metric-subtitle">{symbol} · Stored project data, not live</div>
        </div>
        <div className="metric-card">
          <div className="metric-label-row"><Target size={19} color={COLORS.primaryDeep} /><span className="metric-label">30-DAY MODEL FORECAST</span></div>
          <div className="metric-value">{money(forecastPrice)} <span style={{ color: upside >= 0 ? COLORS.positive : COLORS.negative, fontSize: 12, whiteSpace: "nowrap" }}>({upside >= 0 ? "+" : ""}{upside.toFixed(2)}%)</span></div>
          <div className="metric-subtitle">Projected value from stored model sample</div>
        </div>
        <div className="metric-card">
          <div className="metric-label-row"><Percent size={19} color={COLORS.slate} /><span className="metric-label">STORED MAPE VALUE</span></div>
          <div className="metric-value">{mape}%</div>
          <div className="metric-subtitle">{modelVersion} · Verify against the evaluation report</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <h3>Historical & forecast sample</h3>
          <p className="dashboard-panel-subtitle">Solid line — stored historical values · Dashed line — stored model forecast</p>
          <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={COLORS.hairline} strokeDasharray="4 5" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: COLORS.slate }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: COLORS.slate }} domain={["auto", "auto"]} axisLine={false} tickLine={false} width={57} />
                <Tooltip formatter={(value) => money(value)} />
                <Area type="monotone" dataKey="actual" name="Historical sample" stroke={COLORS.primaryDeep} fill={COLORS.tint} strokeWidth={2.3} connectNulls={false} />
                <Area type="monotone" dataKey="forecast" name="Forecast sample" stroke={COLORS.primary} strokeDasharray="5 5" fill="none" strokeWidth={2.3} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dashboard-panel">
          <h3>Forecast data table</h3>
          <p className="dashboard-panel-subtitle">Stored prediction rows for {symbol}; dates are sample data.</p>
          <div className="forecast-table-scroll">
            <table className="data-table">
              <thead><tr><th>Day</th><th>Predicted</th><th style={{ textAlign: "right" }}>Change</th></tr></thead>
              <tbody>
                {forecastRows.map((row) => (
                  <tr key={row.day}>
                    <td>Day {row.day}</td>
                    <td><strong>{money(row.price)}</strong></td>
                    <td style={{ textAlign: "right", color: row.change >= 0 ? COLORS.positive : COLORS.negative, fontWeight: 700 }}>{row.change >= 0 ? "+" : ""}{row.change}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
