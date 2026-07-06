import React from "react";
import { ChevronRight, ArrowLeft } from "lucide-react";

export default function Breadcrumbs({ currentFolder, folderHistory, navigateBack, navigateToBreadcrumb }) {
  return (
    <div style={styles.breadcrumbsContainer}>
      {currentFolder && (
        <button onClick={navigateBack} className="btn-icon" title="Go Back" style={{ marginRight: "10px" }}>
          <ArrowLeft size={16} />
        </button>
      )}

      <div style={styles.trail}>
        <span onClick={() => navigateToBreadcrumb(-1)} className="breadcrumb-link" style={styles.link}>
          Root
        </span>
        {folderHistory.slice(1).map((hist, index) => (
          <React.Fragment key={hist._id || index}>
            <ChevronRight size={14} color="var(--text-secondary)" style={{ opacity: 0.6 }} />
            <span onClick={() => navigateToBreadcrumb(index + 1)} className="breadcrumb-link" style={styles.link}>
              {hist.name}
            </span>
          </React.Fragment>
        ))}
        {currentFolder && (
          <>
            <ChevronRight size={14} color="var(--text-secondary)" style={{ opacity: 0.6 }} />
            <span style={styles.active}>{currentFolder.name}</span>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  breadcrumbsContainer: {
    display: "flex",
    alignItems: "center",
  },
  trail: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.9rem",
  },
  link: {
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontWeight: "500",
    transition: "color 0.2s ease",
  },
  active: {
    color: "#fff",
    fontWeight: "600",
  },
};
