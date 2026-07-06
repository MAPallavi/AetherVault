import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, FolderPlus, Clock } from "lucide-react";

export default function DashboardHeader({
  username,
  totalSize,
  formatSize,
  onUploadClick,
  onCreateFolderClick
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const LIMIT = 2 * 1024 * 1024 * 1024; // 2GB
  const percentUsed = Math.min((totalSize / LIMIT) * 100, 100).toFixed(1);

  return (
    <motion.div
      className="dashboard-header-container"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={styles.container}
    >
      <div style={styles.left}>
        <h1 className="dashboard-title" style={styles.welcome}>
          Welcome back, <span style={{ color: "var(--primary-light)" }}>{username || "Admin"}</span>
        </h1>
        <div style={styles.timeRow}>
          <Clock size={14} color="var(--text-secondary)" style={{ opacity: 0.8 }} />
          <span style={styles.timeText}>
            {formatDate(currentTime)} • {formatTime(currentTime)}
          </span>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.summaryBox}>
          <span style={styles.summaryLabel}>VAULT CAPACITY</span>
          <span style={styles.summaryVal}>
            {percentUsed}% of 2 GB Used
          </span>
        </div>
        <div style={styles.btnGroup}>
          <button onClick={onUploadClick} className="btn btn-primary" title="Upload files straight to vault root">
            <Upload size={14} style={{ marginRight: "6px" }} />
            <span>Upload File</span>
          </button>
          <button onClick={onCreateFolderClick} className="btn btn-secondary" title="Create a root folder">
            <FolderPlus size={14} style={{ marginRight: "6px" }} />
            <span>New Folder</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  left: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  welcome: {
    fontSize: "1.75rem",
    fontWeight: "800",
    color: "#fff",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  timeRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  timeText: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    fontWeight: "500",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  summaryBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "4px",
  },
  summaryLabel: {
    fontSize: "0.65rem",
    fontWeight: "700",
    color: "var(--text-secondary)",
    letterSpacing: "1px",
  },
  summaryVal: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#fff",
  },
  btnGroup: {
    display: "flex",
    gap: "10px",
  },
};