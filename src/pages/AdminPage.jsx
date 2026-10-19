import React, { useState } from "react";
import { RefreshCw, Database } from "lucide-react";

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([
    { id: "LOG_001", action: "RETRAIN_MODEL", status: "SUCCESS", timestamp: "2026-09-15T10:00:00Z" },
    { id: "LOG_002", action: "INITIAL_DATA_IMPORT", status: "SUCCESS", timestamp: "2026-09-01T08:30:00Z" }
  ]);

  const handleRetrain = () => {
    setLoading(true);
    setTimeout(() => {
      setLogs([
        { id: `LOG_00${logs.length + 1}`, action: "RETRAIN_MODEL", status: "SUCCESS", timestamp: new Date().toISOString() },
        ...logs
      ]);
      setLoading(false);
      alert("โมเดล LightGBM ได้รับการ Retrain และอัปเดตข้อมูลลงฐานข้อมูลสำเร็จ!");
    }, 1500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#FFFFFF", borderRadius: 22, padding: 24, border: "1px solid #E6ECF7" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Admin Management Panel</h2>
        <p style={{ fontSize: 12.5, color: "#8592A6", marginTop: 4 }}>Trigger model retraining & database updates</p>

        <button
          onClick={handleRetrain}
          disabled={loading}
          style={{
            marginTop: 16, display: "flex", alignItems: "center", gap: 10, background: "#155EEF", color: "#fff",
            border: "none", padding: "12px 20px", borderRadius: 12, fontWeight: 600, cursor: "pointer"
          }}
        >
          <RefreshCw size={18} className={loading ? "spin" : ""} />
          {loading ? "Processing Retrain..." : "Trigger LightGBM Retrain"}
        </button>
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: 22, padding: 24, border: "1px solid #E6ECF7" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>System Audit Logs (/system_logs)</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E6ECF7", color: "#8592A6", textAlign: "left" }}>
              <th style={{ padding: "8px 0" }}>Log ID</th>
              <th style={{ padding: "8px 0" }}>Action</th>
              <th style={{ padding: "8px 0" }}>Status</th>
              <th style={{ padding: "8px 0", textAlign: "right" }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: "1px solid #E6ECF7" }}>
                <td style={{ padding: "10px 0", fontWeight: 600 }}>{log.id}</td>
                <td style={{ padding: "10px 0" }}>{log.action}</td>
                <td style={{ padding: "10px 0", color: "#0FA968", fontWeight: 600 }}>{log.status}</td>
                <td style={{ padding: "10px 0", textAlign: "right", color: "#8592A6" }}>{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}