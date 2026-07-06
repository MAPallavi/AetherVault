import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function RecentActivities({ recentLogs, setCurrentTab }) {
  const getActionStyle = (action) => {
    let color = "#3b82f6";
    let bg = "rgba(59, 130, 246, 0.12)";
    if (action === "UPLOAD") {
      color = "#10b981";
      bg = "rgba(16, 185, 129, 0.12)";
    } else if (action === "DELETE" || action === "PURGE") {
      color = "#ef4444";
      bg = "rgba(239, 68, 68, 0.12)";
    } else if (action === "RESTORE" || action === "RENAME") {
      color = "#f59e0b";
      bg = "rgba(245, 158, 11, 0.12)";
    } else if (action === "CREATE_FOLDER") {
      color = "#a78bfa";
      bg = "rgba(167, 139, 250, 0.12)";
    }
    return { color, backgroundColor: bg };
  };

  const groupLogsByDate = (logs) => {
    const today = [];
    const yesterday = [];
    const earlier = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    logs.forEach((log) => {
      const time = new Date(log.timestamp).getTime();
      if (time >= startOfToday) {
        today.push(log);
      } else if (time >= startOfYesterday) {
        yesterday.push(log);
      } else {
        earlier.push(log);
      }
    });

    return { today, yesterday, earlier };
  };

  const { today, yesterday, earlier } = groupLogsByDate(recentLogs);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
  };

  const renderGroup = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
        <h4 style={styles.groupHeader}>{title}</h4>
        {items.map((log) => (
          <motion.div
            key={log._id}
            variants={itemVariants}
            className="activity-row"
            whileHover={{ x: 4 }}
          >
            <div className="activity-left">
              <span className="activity-badge" style={getActionStyle(log.action)}>
                {log.action}
              </span>
              <span className="activity-details" title={log.details}>
                {log.details}
              </span>
            </div>
            <span className="activity-time">
              {new Date(log.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: "16px", flexGrow: 1 }}>
      <div className="dashboard-panel-header">
        <h3 className="dashboard-panel-title">System Activities</h3>
        <button
          onClick={() => setCurrentTab("logs")}
          className="view-all-btn"
          title="View all logs"
        >
          <span>View All</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="activity-list"
        style={{ maxHeight: "360px" }}
      >
        {recentLogs.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            <p>No activity logs found.</p>
          </div>
        ) : (
          <>
            {renderGroup("Today", today)}
            {renderGroup("Yesterday", yesterday)}
            {renderGroup("Earlier", earlier)}
          </>
        )}
      </motion.div>
    </div>
  );
}

const styles = {
  groupHeader: {
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "var(--text-secondary)",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    margin: "12px 0 4px 0",
    borderBottom: "1px dashed rgba(255,255,255,0.03)",
    paddingBottom: "4px",
  },
};
