import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function BacktestPage({ assetData }) {
  const { symbol, mape, modelVersion } = assetData;

  return (
    <div className="backtest-page">
      <section className="dashboard-panel">
        <h3>Backtesting & Model Evaluation ({symbol})</h3>
        <p className="dashboard-panel-subtitle">Comparing model projections against the stored test dataset</p>
        <div className="backtest-status-grid">
          <div className="backtest-status-card">
            <div className="backtest-status-title"><CheckCircle2 size={18} /> Model Validation Status</div>
            <div className="backtest-status-value">PASSED (Sample)</div>
            <div className="dashboard-panel-subtitle">Displayed status from the current demo interface; confirm against an actual evaluation run.</div>
          </div>
          <div className="backtest-score-card">
            <div className="metric-label">STORED MAPE VALUE</div>
            <div className="metric-value">{mape}%</div>
            <div className="metric-subtitle">Engine: {modelVersion}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
