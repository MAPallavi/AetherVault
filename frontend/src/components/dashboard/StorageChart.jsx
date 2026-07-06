import React from "react";
import { motion } from "framer-motion";
import { FileImage, FileVideo, FileAudio, FileText, FileArchive, HelpCircle, HardDrive } from "lucide-react";

export default function StorageChart({ totalSize, categoriesList, formatSize, donutSegments, setCurrentTab }) {
  const CAPACITY = 2 * 1024 * 1024 * 1024; // 2GB
  const percentUsed = Math.min((totalSize / CAPACITY) * 100, 100);
  const remainingSize = Math.max(CAPACITY - totalSize, 0);

  const getCatIcon = (label) => {
    switch (label) {
      case "Images": return FileImage;
      case "Videos": return FileVideo;
      case "Audio": return FileAudio;
      case "Documents": return FileText;
      case "Archives": return FileArchive;
      default: return HelpCircle;
    }
  };

  return (
    <motion.div
      className="dashboard-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      style={{ display: "flex", flexDirection: "column", gap: "22px", height: "100%" }}
    >
      <h3 className="dashboard-panel-title">Storage Analytics</h3>

      {totalSize === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", flexGrow: 1 }}>
          <div className="circle">
            <span>0 Bytes</span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "14px 0 0 0" }}>No files uploaded yet.</p>
          <button onClick={() => setCurrentTab("files")} className="btn btn-primary" style={{ marginTop: "16px" }}>
            Upload Files
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", flexGrow: 1 }}>
          {/* Main Visual Row */}
          <div className="chart-wrapper">
            <div className="chart-container">
              <svg width="180" height="180" viewBox="0 0 200 200">
                {donutSegments.map((seg, i) => (
                  <motion.path
                    key={i}
                    d={seg.path}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="20"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 1000" }}
                    animate={{ strokeDasharray: "1000 1000" }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                ))}
                {/* Center donut text */}
                <circle cx="100" cy="100" r="58" className="chart-donut-center" />
                <text x="100" y="95" textAnchor="middle" fill="var(--text-secondary)" fontSize="11" fontWeight="600" letterSpacing="0.5">
                  USED SPACE
                </text>
                <text x="100" y="118" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700">
                  {formatSize(totalSize)}
                </text>
              </svg>
            </div>

            <div className="chart-legend">
              {categoriesList.map((cat) => {
                const CatIcon = getCatIcon(cat.label);
                const ratio = Math.round((cat.size / totalSize) * 100);
                return (
                  <div key={cat.label} className="legend-item">
                    <div className="legend-left">
                      <div className="color-indicator" style={{ background: cat.color }}></div>
                      <CatIcon size={14} color="var(--text-secondary)" style={{ marginRight: "4px" }} />
                      <span className="legend-name">{cat.label}</span>
                    </div>
                    <div className="legend-right">
                      <span className="legend-percent">{ratio}%</span>
                      <span className="legend-size">({formatSize(cat.size)})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.05)" }}></div>

          {/* Capacity Progress Bar Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <HardDrive size={15} color="var(--text-secondary)" />
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600" }}>TOTAL CAPACITY</span>
              </div>
              <span style={{ fontSize: "0.8rem", color: "#fff", fontWeight: "700" }}>2.0 GB</span>
            </div>
            
            {/* Pulsing visual track */}
            <div style={{ height: "8px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "4px", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentUsed}%` }}
                transition={{ duration: 0.6 }}
                style={{ height: "100%", background: "linear-gradient(to right, var(--primary), var(--primary-light))", borderRadius: "4px" }}
              ></motion.div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "500" }}>
              <span>{formatSize(totalSize)} Used</span>
              <span>{formatSize(remainingSize)} Free</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}