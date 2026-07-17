import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { Loader2, Users, Database, HardDrive, Shield, RefreshCw } from "lucide-react";

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const loadAdminStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getAdminStatus();
      setStats(data);
    } catch (err) {
      setError(err.message || "Failed to load admin metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <Loader2 className="spinner" size={24} color="var(--primary)" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "var(--danger)", padding: "10px", fontSize: "0.85rem" }}>
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 className="dashboard-panel-title" style={{ margin: 0 }}>Admin Platform Metrics</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Overview of users, workspace sizes, capacities, and active storage engines.
          </p>
        </div>
        <button onClick={loadAdminStats} className="btn btn-secondary" style={{ display: "inline-flex", gap: "6px", fontSize: "0.75rem", padding: "6px 12px" }}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div className="glass-panel" style={{ padding: "15px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Users size={14} color="var(--primary)" />
            <span>Total Registered Users</span>
          </span>
          <strong style={{ fontSize: "1.4rem", color: "#fff" }}>{stats?.totalUsers || 0}</strong>
        </div>

        <div className="glass-panel" style={{ padding: "15px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Database size={14} color="var(--success)" />
            <span>Total Storage Used</span>
          </span>
          <strong style={{ fontSize: "1.4rem", color: "#fff" }}>
            {((stats?.activeStorageUsed || 0) / 1024 / 1024).toFixed(2)} MB
          </strong>
        </div>

        <div className="glass-panel" style={{ padding: "15px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
            <HardDrive size={14} color="var(--primary)" />
            <span>Cloud Provider Status</span>
          </span>
          <strong style={{ fontSize: "1.2rem", color: "var(--success)" }}>
            {stats?.cloudProvider ? stats.cloudProvider.toUpperCase() : "LOCAL"}
          </strong>
        </div>
      </div>

      <div style={{ height: "1px", background: "rgba(255,255,255,0.08)" }}></div>

      <div>
        <h4 style={{ color: "#fff", fontSize: "0.9rem", marginBottom: "12px" }}>Largest User Storage Consumption</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {stats?.largestUsers?.map((u, i) => (
            <div key={i} className="glass-panel" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span>@{u.username}</span>
              <strong style={{ color: "var(--primary)" }}>{(u.storageUsed / 1024 / 1024).toFixed(2)} MB</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
