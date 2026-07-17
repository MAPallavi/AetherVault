import React, { useState, useEffect } from "react";
import { api } from "../../utils/api";
import { Loader2, Heart, Shield, RefreshCw, Cpu, Database, AlertCircle } from "lucide-react";

export default function AdminHealth() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchHealth = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      setError(err.message || "Failed to load health statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [refreshTrigger]);

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  if (loading && !health) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <Loader2 className="spinner" size={24} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 className="dashboard-panel-title" style={{ margin: 0 }}>System & Server Health</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Real-time status indicators of the API server, database connection, and encryption configuration.
          </p>
        </div>
        <button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="btn btn-secondary"
          style={{ display: "inline-flex", gap: "6px", fontSize: "0.75rem", padding: "6px 12px" }}
        >
          <RefreshCw size={14} className={loading ? "spinner" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--danger)", background: "rgba(239, 68, 68, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "0.8rem" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {health && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Status widgets row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            
            {/* Server Status */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "14px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Heart size={14} color="var(--success)" />
                <span>API Server Status</span>
              </span>
              <strong style={{ fontSize: "1.1rem", color: "var(--success)" }}>{health.status}</strong>
            </div>

            {/* Database Connection */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "14px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Database size={14} color="var(--primary)" />
                <span>MongoDB Link</span>
              </span>
              <strong style={{ fontSize: "1.1rem", color: health.mongoStatus === "CONNECTED" ? "var(--success)" : "var(--danger)" }}>
                {health.mongoStatus}
              </strong>
            </div>

            {/* Encryption status */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "14px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Shield size={14} color="var(--primary)" />
                <span>Encryption Engine</span>
              </span>
              <strong style={{ fontSize: "1.1rem", color: "var(--success)" }}>{health.encryptionStatus}</strong>
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}></div>

          {/* Details list */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
            
            {/* System Resources */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <h4 style={{ margin: 0, fontSize: "0.85rem", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                <Cpu size={14} color="var(--primary)" />
                <span>System Metrics</span>
              </h4>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Server Uptime:</span>
                  <strong style={{ color: "#fff" }}>{formatUptime(health.uptime)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Average DB Latency:</span>
                  <strong style={{ color: "#fff" }}>{health.dbResponseTime}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Allocated RSS Memory:</span>
                  <strong style={{ color: "#fff" }}>{health.memoryUsage.rss}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Heap Memory Limit/Used:</span>
                  <strong style={{ color: "#fff" }}>{health.memoryUsage.heapUsed} / {health.memoryUsage.heapTotal}</strong>
                </div>
              </div>
            </div>

            {/* Build Specifications */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <h4 style={{ margin: 0, fontSize: "0.85rem", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                <Shield size={14} color="var(--primary)" />
                <span>Runtime Environment</span>
              </h4>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Node.js Version:</span>
                  <strong style={{ color: "#fff" }}>{health.buildInfo.nodeVersion}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>OS Platform:</span>
                  <strong style={{ color: "#fff" }}>{health.buildInfo.platform}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>CPU Architecture:</span>
                  <strong style={{ color: "#fff" }}>{health.buildInfo.arch}</strong>
                </div>
              </div>
            </div>

            {/* Storage Provider Specifications */}
            {health.storageStatus && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <h4 style={{ margin: 0, fontSize: "0.85rem", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Database size={14} color="var(--primary)" />
                  <span>Storage Engine Specs</span>
                </h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Active Provider:</span>
                    <strong style={{ color: "#fff", textTransform: "uppercase" }}>{health.storageStatus.provider}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Storage Path:</span>
                    <strong style={{ color: "#fff", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px", whiteSpace: "nowrap" }} title={health.storageStatus.storagePath}>{health.storageStatus.storagePath}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Cloud Sync Status:</span>
                    <strong style={{ color: "#fff" }}>{health.storageStatus.cloudStatus}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Provider Health:</span>
                    <strong style={{ color: health.storageStatus.health === "healthy" ? "var(--success)" : "var(--danger)" }}>
                      {health.storageStatus.health === "healthy" ? "HEALTHY" : "UNHEALTHY"}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Config Status:</span>
                    <strong style={{ color: "#fff" }}>{health.storageStatus.configurationStatus}</strong>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
