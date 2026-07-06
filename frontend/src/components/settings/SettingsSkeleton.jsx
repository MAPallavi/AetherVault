import React from "react";

export default function SettingsSkeleton() {
  return (
    <div className="dashboard-container" style={{ opacity: 0.7, padding: "0 24px" }}>
      {/* Header Skeleton */}
      <div style={{ marginBottom: "20px" }}>
        <div className="skeleton-shimmer" style={{ width: "160px", height: "24px", borderRadius: "6px", marginBottom: "8px" }}></div>
        <div className="skeleton-shimmer" style={{ width: "260px", height: "14px", borderRadius: "4px" }}></div>
      </div>

      <div style={styles.layout}>
        {/* Left Tabs Skeleton */}
        <div style={styles.tabCol}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer" style={{ width: "100%", height: "40px", borderRadius: "10px" }}></div>
          ))}
        </div>

        {/* Right Content Card Skeleton */}
        <div className="glass-panel" style={styles.contentCard}>
          <div className="skeleton-shimmer" style={{ width: "180px", height: "20px", borderRadius: "4px", marginBottom: "8px" }}></div>
          <div className="skeleton-shimmer" style={{ width: "280px", height: "12px", borderRadius: "4px", marginBottom: "24px" }}></div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="skeleton-shimmer" style={{ width: "80px", height: "12px", borderRadius: "4px" }}></div>
                <div className="skeleton-shimmer" style={{ width: "100%", height: "36px", borderRadius: "8px" }}></div>
              </div>
            ))}
            <div className="skeleton-shimmer" style={{ width: "120px", height: "36px", borderRadius: "8px", marginTop: "12px" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  layout: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: "24px",
  },
  tabCol: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  contentCard: {
    padding: "30px",
    minHeight: "450px",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: "20px",
  },
};
