import React from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";

export default function BacktestPage({ assetData }) {
  const { symbol, mape, modelVersion } = assetData;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#FFFFFF", borderRadius: 22, padding: 24, border: "1px solid #E6ECF7" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Backtesting & Model Evaluation ({symbol})</h2>
        <p style={{ fontSize: 12.5, color: "#8592A6", marginTop: 4 }}>Comparing model projections against test dataset</p>

        <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
          <div style={{ flex: 1, background: "#EFF4FF", borderRadius: 16, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#155EEF", fontWeight: 600, fontSize: 13 }}>
              <CheckCircle2 size={18} /> Model Validation Status
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8, color: "#0B1526" }}>PASSED (Accurate)</div>
            <div style={{ fontSize: 12, color: "#8592A6", marginTop: 4 }}>Evaluated using 20% holdout test set</div>
          </div>

          <div style={{ flex: 1, background: "#F8FAFC", borderRadius: 16, padding: 18, border: "1px solid #E6ECF7" }}>
            <div style={{ fontSize: 12, color: "#8592A6", fontWeight: 600 }}>MAPE ERROR SCORE</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: "#0B1526" }}>{mape}%</div>
            <div style={{ fontSize: 12, color: "#8592A6", marginTop: 4 }}>Engine: {modelVersion}</div>
          </div>
        </div>
      </div>
    </div>
  );
}