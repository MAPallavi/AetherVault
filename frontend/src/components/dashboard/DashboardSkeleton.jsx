import React from "react";

export default function DashboardSkeleton() {
  const cards = Array.from({ length: 6 });
  const rows = Array.from({ length: 5 });

  return (
    <div className="dashboard-container" style={{ opacity: 0.7, padding: "0 24px" }}>
      {/* Header Skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ width: "40%" }}>
          <div className="skeleton-shimmer" style={{ width: "180px", height: "24px", borderRadius: "6px", marginBottom: "8px" }}></div>
          <div className="skeleton-shimmer" style={{ width: "240px", height: "14px", borderRadius: "4px" }}></div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div className="skeleton-shimmer" style={{ width: "90px", height: "36px", borderRadius: "8px" }}></div>
          <div className="skeleton-shimmer" style={{ width: "110px", height: "36px", borderRadius: "8px" }}></div>
        </div>
      </div>

      {/* Stats Cards Grid Skeleton */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        {cards.map((_, i) => (
          <div key={i} className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: "12px", cursor: "default" }}>
            <div className="skeleton-shimmer" style={{ width: "42px", height: "42px", borderRadius: "12px" }}></div>
            <div className="skeleton-shimmer" style={{ width: "60%", height: "14px", borderRadius: "4px" }}></div>
            <div className="skeleton-shimmer" style={{ width: "40%", height: "20px", borderRadius: "6px" }}></div>
          </div>
        ))}
      </div>

      {/* Main Details Grid Row Skeleton */}
      <div className="dashboard-layout-row">
        {/* Left Column: Storage Chart Shimmer */}
        <div className="dashboard-chart-col">
          <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: "20px", height: "100%", cursor: "default" }}>
            <div className="skeleton-shimmer" style={{ width: "140px", height: "18px", borderRadius: "4px" }}></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "24px", flexGrow: 1 }}>
              <div className="skeleton-shimmer" style={{ width: "160px", height: "160px", borderRadius: "50%" }}></div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "180px" }}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} style={{ display: "flex", justifyContent: "space-between" }}>
                    <div className="skeleton-shimmer" style={{ width: "60px", height: "12px", borderRadius: "4px" }}></div>
                    <div className="skeleton-shimmer" style={{ width: "30px", height: "12px", borderRadius: "4px" }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Widgets Shimmer */}
        <div className="dashboard-activity-col">
          <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: "16px", cursor: "default" }}>
            <div className="skeleton-shimmer" style={{ width: "120px", height: "18px", borderRadius: "4px" }}></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {rows.map((_, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "8px", width: "70%" }}>
                    <div className="skeleton-shimmer" style={{ width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0 }}></div>
                    <div className="skeleton-shimmer" style={{ width: "80%", height: "12px", borderRadius: "4px" }}></div>
                  </div>
                  <div className="skeleton-shimmer" style={{ width: "40px", height: "12px", borderRadius: "4px" }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
