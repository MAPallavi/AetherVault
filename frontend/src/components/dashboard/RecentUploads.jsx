import React from "react";
import { FileImage, FileVideo, FileAudio, FileArchive, FileText, Play } from "lucide-react";

export default function RecentUploads({ files, onPreviewSelect, formatSize }) {
  const getFileIcon = (mimeType) => {
    const mime = mimeType.toLowerCase();
    if (mime.startsWith("image/")) return <FileImage size={18} color="#e040fb" />;
    if (mime.startsWith("video/")) return <FileVideo size={18} color="#ff5252" />;
    if (mime.startsWith("audio/")) return <FileAudio size={18} color="#ffd740" />;
    if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar")) return <FileArchive size={18} color="#69f0ae" />;
    return <FileText size={18} color="#3b82f6" />;
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return then.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h3 className="dashboard-panel-title">Recent Uploads</h3>

      <div style={styles.list}>
        {files.length === 0 ? (
          <div style={styles.empty}>No recent uploads.</div>
        ) : (
          files.map((file) => (
            <div
              key={file._id}
              style={styles.item}
              className="activity-row"
              onDoubleClick={() => onPreviewSelect && onPreviewSelect(file)}
              title="Double click to preview"
            >
              <div style={styles.itemLeft}>
                {getFileIcon(file.mimeType)}
                <div style={styles.textGroup}>
                  <span style={styles.name} className="file-name">{file.name}</span>
                  <span style={styles.time}>{getRelativeTime(file.createdAt)}</span>
                </div>
              </div>

              <div style={styles.itemRight}>
                <span style={styles.size}>{formatSize(file.size)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "rgba(255, 255, 255, 0.01)",
    border: "1px solid rgba(255, 255, 255, 0.02)",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "background 0.2s ease",
  },
  itemLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    overflow: "hidden",
  },
  textGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  name: {
    fontSize: "0.85rem",
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "150px",
  },
  time: {
    fontSize: "0.7rem",
    color: "var(--text-secondary)",
    opacity: 0.7,
  },
  itemRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  size: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  },
  empty: {
    textAlign: "center",
    padding: "20px 0",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
  }
};
