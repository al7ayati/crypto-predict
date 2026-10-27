import React from "react";
import { AlertTriangle, Database, RefreshCw } from "lucide-react";

const SAMPLE_LOGS = [
  {
    id: "SAMPLE_001",
    action: "EXAMPLE_MODEL_EVALUATION",
    status: "SAMPLE",
    timestamp: "2026-09-15T10:00:00Z",
  },
  {
    id: "SAMPLE_002",
    action: "EXAMPLE_DATA_IMPORT",
    status: "SAMPLE",
    timestamp: "2026-09-01T08:30:00Z",
  },
];

export default function AdminPage() {
  return (
    <div className="admin-page">
      <section className="dashboard-panel">
        <div className="prediction-heading">
          <span className="quick-link-icon">
            <RefreshCw size={20} aria-hidden="true" />
          </span>
          <div>
            <h3>Model retraining</h3>
            <p className="dashboard-panel-subtitle">
              Manage model training and data pipeline operations.
            </p>
          </div>
        </div>

        <div className="form-message form-error" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            Model retraining is unavailable. This project does not currently
            include a secured backend endpoint or a connected training service.
            No model or database is changed from this page.
          </span>
        </div>

        <button className="history-export-button" type="button" disabled>
          <RefreshCw size={16} aria-hidden="true" />
          Retraining unavailable
        </button>
      </section>

      <section className="dashboard-panel">
        <div className="prediction-heading">
          <span className="quick-link-icon">
            <Database size={20} aria-hidden="true" />
          </span>
          <div>
            <h3>System audit log preview</h3>
            <p className="dashboard-panel-subtitle">
              Example records only. These entries are not read from a live
              database or a production audit-log service.
            </p>
          </div>
        </div>

        <div className="wide-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Action</th>
                <th>Status</th>
                <th>Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_LOGS.map((log) => (
                <tr key={log.id}>
                  <td><strong>{log.id}</strong></td>
                  <td>{log.action}</td>
                  <td>{log.status}</td>
                  <td>
                    {new Date(log.timestamp).toLocaleString("en-US", {
                      timeZone: "UTC",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
