import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Loader2, ScrollText, RefreshCw, Search } from "lucide-react";
import { LogsSkeleton } from "./Skeleton";
import EmptyState from "./EmptyState";
import { toast } from "react-hot-toast";

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, search, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getLogs();
      setLogs(data);
    } catch (err) {
      setError("Failed to fetch activity logs.");
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...logs];

    // Search query match
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (log) =>
          log.details.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q)
      );
    }

    // Action category match
    if (actionFilter !== "ALL") {
      result = result.filter((log) => log.action === actionFilter);
    }

    setFilteredLogs(result);
  };

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
  };

  if (loading) {
    return (
      <div style={styles.tablePanel} className="glass-panel">
        <LogsSkeleton />
      </div>
    );
  }

  const actions = [
    "ALL",
    "LOGIN",
    "UPLOAD",
    "DOWNLOAD",
    "PREVIEW",
    "DELETE",
    "RESTORE",
    "RENAME",
    "CREATE_FOLDER",
    "PURGE",
  ];

  return (
    <div className="main-content animate-fade-in" style={{ width: "100%" }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Activity Audit Logs</h1>
          <p style={styles.pageSubtitle}>Review file management access history and operations</p>
        </div>
        <button onClick={fetchLogs} className="btn-gray btn-icon" title="Refresh logs" style={{ minWidth: 0, padding: "8px" }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.filterRow}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: "40px" }}
            placeholder="Search logs details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={styles.selectWrapper}>
          <select
            className="input-field"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={styles.selectDropdown}
          >
            {actions.map((act) => (
              <option key={act} value={act} style={{ background: "#1a1d24" }}>
                {act === "ALL" ? "Filter by Action" : act}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-panel" style={styles.tablePanel}>
        <div style={styles.tableWrapper}>
          {filteredLogs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No activity logs found"
              description={
                search || actionFilter !== "ALL"
                  ? "Try refining your keyword search terms or resetting the filter dropdown values."
                  : "Activity logs are empty."
              }
            />
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={{ ...styles.th, width: "150px" }}>Action</th>
                  <th style={styles.th}>Details</th>
                  <th style={{ ...styles.th, width: "130px" }}>IP Address</th>
                  <th style={{ ...styles.th, width: "180px" }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log._id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.actionTag(log.action)}>{log.action}</span>
                    </td>
                    <td style={{ ...styles.td, color: "#fff", fontWeight: "500" }}>
                      {log.details}
                    </td>
                    <td style={{ ...styles.td, color: "var(--text-secondary)" }}>
                      {log.ipAddress || "unknown"}
                    </td>
                    <td style={{ ...styles.td, color: "var(--text-muted)" }}>
                      {formatDateTime(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  pageTitle: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#fff",
    margin: 0,
  },
  pageSubtitle: {
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    marginTop: "4px",
    marginBottom: 0,
  },
  errorAlert: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "10px",
    padding: "12px",
    color: "#fca5a5",
    fontSize: "0.85rem",
    marginBottom: "16px",
  },
  filterRow: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  searchWrapper: {
    position: "relative",
    flexGrow: 1,
    maxWidth: "450px",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--text-secondary)",
  },
  selectWrapper: {
    width: "180px",
  },
  selectDropdown: {
    cursor: "pointer",
  },
  tablePanel: {
    padding: "16px",
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  tableWrapper: {
    overflow: "auto",
    flexGrow: 1,
    height: "100%",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  thRow: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  th: {
    padding: "12px 16px",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontWeight: "600",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
  },
  td: {
    padding: "14px 16px",
    fontSize: "0.9rem",
    verticalAlign: "middle",
  },
  actionTag: (action) => {
    let color = "#3b82f6";
    let bg = "rgba(59, 130, 246, 0.1)";
    if (action === "UPLOAD") {
      color = "#10b981";
      bg = "rgba(16, 185, 129, 0.1)";
    }
    if (action === "DELETE" || action === "PURGE") {
      color = "#ef4444";
      bg = "rgba(239, 68, 68, 0.1)";
    }
    if (action === "RESTORE") {
      color = "#ffd740";
      bg = "rgba(255, 215, 64, 0.1)";
    }

    return {
      fontSize: "0.75rem",
      fontWeight: "700",
      padding: "3px 8px",
      borderRadius: "5px",
      color,
      backgroundColor: bg,
      letterSpacing: "0.5px",
      display: "inline-block",
    };
  },
};
