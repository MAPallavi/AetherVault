import React from "react";
import { FileImage, FileVideo, FileAudio, FileArchive, FileText, ExternalLink } from "lucide-react";

export default function LargestFiles({ files, onPreviewSelect, formatSize }) {
  const getFileIcon = (mimeType) => {
    const mime = mimeType.toLowerCase();
    if (mime.startsWith("image/")) return <FileImage size={18} color="#e040fb" />;
    if (mime.startsWith("video/")) return <FileVideo size={18} color="#ff5252" />;
    if (mime.startsWith("audio/")) return <FileAudio size={18} color="#ffd740" />;
    if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar")) return <FileArchive size={18} color="#69f0ae" />;
    return <FileText size={18} color="#3b82f6" />;
  };

  return (
    <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h3 className="dashboard-panel-title">Largest Vault Files</h3>

      <div style={styles.list}>
        {files.length === 0 ? (
          <div style={styles.empty}>No files available.</div>
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
                <span style={styles.name} className="file-name">{file.name}</span>
              </div>

              <div style={styles.itemRight}>
                <span style={styles.size}>{formatSize(file.size)}</span>
                <button
                  onClick={() => onPreviewSelect && onPreviewSelect(file)}
                  style={styles.previewBtn}
                  title="Preview file"
                >
                  <ExternalLink size={12} />
                </button>
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
  name: {
    fontSize: "0.85rem",
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "150px",
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
  previewBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px",
    borderRadius: "4px",
    transition: "color 0.2s ease",
    ":hover": {
      color: "#fff",
    }
  },
  empty: {
    textAlign: "center",
    padding: "20px 0",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
  }
};
