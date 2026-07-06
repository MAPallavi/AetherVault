import React from "react";

export default function FileBrowserSkeleton({ viewMode = "grid" }) {
  const items = Array.from({ length: 8 });

  return (
    <div className="filebrowser-container" style={{ opacity: 0.7 }}>
      {/* Toolbar Skeleton */}
      <div className="toolbar" style={styles.toolbarSkeleton}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "40%" }}>
          <div className="skeleton-shimmer" style={{ width: "32px", height: "32px", borderRadius: "8px" }}></div>
          <div className="skeleton-shimmer" style={{ width: "120px", height: "18px", borderRadius: "6px" }}></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "50%", justifyContent: "flex-end" }}>
          <div className="skeleton-shimmer" style={{ width: "180px", height: "32px", borderRadius: "10px" }}></div>
          <div className="skeleton-shimmer" style={{ width: "64px", height: "32px", borderRadius: "8px" }}></div>
          <div className="skeleton-shimmer" style={{ width: "90px", height: "32px", borderRadius: "8px" }}></div>
          <div className="skeleton-shimmer" style={{ width: "80px", height: "32px", borderRadius: "8px" }}></div>
        </div>
      </div>

      {/* Grid or List content skeleton */}
      {viewMode === "grid" ? (
        <div className="file-grid">
          {items.map((_, i) => (
            <div key={i} className="file-card glass" style={{ cursor: "default" }}>
              <div className="file-card-top" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <div className="skeleton-shimmer" style={{ width: "40px", height: "40px", borderRadius: "10px" }}></div>
                <div className="skeleton-shimmer" style={{ width: "32px", height: "16px", borderRadius: "4px" }}></div>
              </div>
              <div className="file-card-bottom" style={{ width: "100%", marginTop: "10px" }}>
                <div className="skeleton-shimmer" style={{ width: "70%", height: "15px", borderRadius: "4px", marginBottom: "6px" }}></div>
                <div className="skeleton-shimmer" style={{ width: "40%", height: "12px", borderRadius: "4px" }}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="list-panel glass">
          <table className="file-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "45%" }}>Name</th>
                <th style={{ width: "15%" }}>Type</th>
                <th style={{ width: "15%" }}>Size</th>
                <th style={{ width: "15%" }}>Modified</th>
                <th style={{ width: "10%" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((_, i) => (
                <tr key={i} style={{ cursor: "default" }}>
                  <td>
                    <div className="list-name-cell">
                      <div className="skeleton-shimmer" style={{ width: "20px", height: "20px", borderRadius: "4px", flexShrink: 0 }}></div>
                      <div className="skeleton-shimmer" style={{ width: "150px", height: "14px", borderRadius: "4px" }}></div>
                    </div>
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: "50px", height: "14px", borderRadius: "4px" }}></div>
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: "40px", height: "14px", borderRadius: "4px" }}></div>
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: "80px", height: "14px", borderRadius: "4px" }}></div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <div className="skeleton-shimmer" style={{ width: "16px", height: "16px", borderRadius: "4px" }}></div>
                      <div className="skeleton-shimmer" style={{ width: "16px", height: "16px", borderRadius: "4px" }}></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  toolbarSkeleton: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  }
};
