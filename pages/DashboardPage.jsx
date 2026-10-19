import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Gauge, Target, Percent } from "lucide-react";

const COLORS = {
  panel: "#FFFFFF",
  ink: "#0B1526",
  slate: "#8592A6",
  hairline: "#E6ECF7",
  tint: "#EFF4FF",
  primary: "#155EEF",
  primaryDeep: "#0B3B8C",
  positive: "#0FA968",
  negative: "#E14C4C",
};

export default function DashboardPage({ assetData }) {
  const { symbol, currentPrice, forecastPrice, mape, modelVersion, series, forecastRows } = assetData;
  const upside = (((forecastPrice - currentPrice) / currentPrice) * 100).toFixed(2);

  return (
    <div>
      {/* Metric Summary Cards */}
      <div style={{ display: "flex", gap: 18, marginBottom: 22 }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Gauge size={20} color={COLORS.primary} />
            <span style={labelStyle}>CURRENT PRICE (USD)</span>
          </div>
          <div style={valStyle}>${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          <div style={subStyle}>{symbol} · Live market close</div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Target size={20} color={COLORS.primaryDeep} />
            <span style={labelStyle}>30-DAY FORECAST PRICE</span>
          </div>
          <div style={valStyle}>
            ${forecastPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            <span style={{ fontSize: 13, color: Number(upside) >= 0 ? COLORS.positive : COLORS.negative, marginLeft: 8 }}>
              ({upside}%)
            </span>
          </div>
          <div style={subStyle}>Projected trend analysis</div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Percent size={20} color={COLORS.slate} />
            <span style={labelStyle}>MODEL MAPE ERROR RATE</span>
          </div>
          <div style={valStyle}>{mape}%</div>
          <div style={subStyle}>{modelVersion} · Validation set</div>
        </div>
      </div>

      {/* Main Dual Chart & Forecast Table Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 20 }}>
        {/* Chart Panel */}
        <div style={{ ...panelBoxStyle, padding: 22 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Historical & Forecasted Price</div>
          <div style={{ fontSize: 12, color: COLORS.slate, marginBottom: 16 }}>
            Solid line — Actual close · Dashed line — LightGBM Prediction
          </div>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid vertical={false} stroke={COLORS.hairline} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.slate }} />
                <YAxis tick={{ fontSize: 11, fill: COLORS.slate }} domain={["auto", "auto"]} />
                <Tooltip />
                <Area type="monotone" dataKey="actual" stroke={COLORS.primaryDeep} fill={COLORS.tint} strokeWidth={2.4} />
                <Area type="monotone" dataKey="forecast" stroke={COLORS.primary} strokeDasharray="5 5" fill="none" strokeWidth={2.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 30-Day Forecast Data Table */}
        <div style={{ ...panelBoxStyle, padding: "22px 18px" }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>30-Day Forecast Table</div>
          <div style={{ fontSize: 12, color: COLORS.slate, marginBottom: 14 }}>Day-by-day projected price close</div>
          <div style={{ maxHeight: 310, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.hairline}`, color: COLORS.slate, textAlign: "left" }}>
                  <th style={{ paddingBottom: 8 }}>Day</th>
                  <th style={{ paddingBottom: 8 }}>Predicted</th>
                  <th style={{ paddingBottom: 8, textAlign: "right" }}>Δ%</th>
                </tr>
              </thead>
              <tbody>
                {forecastRows.map((row) => (
                  <tr key={row.day} style={{ borderBottom: `1px solid ${COLORS.hairline}` }}>
                    <td style={{ padding: "10px 0", color: COLORS.slate }}>Day {row.day}</td>
                    <td style={{ padding: "10px 0", fontWeight: 600 }}>${row.price.toLocaleString("en-US")}</td>
                    <td style={{ padding: "10px 0", textAlign: "right", color: row.change >= 0 ? COLORS.positive : COLORS.negative, fontWeight: 600 }}>
                      +{row.change}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const cardStyle = { flex: 1, background: COLORS.panel, borderRadius: 20, padding: "20px 22px", border: `1px solid ${COLORS.hairline}`, boxShadow: "0 10px 25px -10px rgba(15,32,74,0.08)" };
const labelStyle = { fontSize: 11.5, letterSpacing: "0.04em", color: COLORS.slate, fontWeight: 600 };
const valStyle = { fontSize: 25, fontWeight: 700, color: COLORS.ink, marginTop: 10 };
const subStyle = { fontSize: 12, color: COLORS.slate, marginTop: 4 };
const panelBoxStyle = { background: COLORS.panel, borderRadius: 22, border: `1px solid ${COLORS.hairline}`, boxShadow: "0 10px 25px -10px rgba(15,32,74,0.08)" };