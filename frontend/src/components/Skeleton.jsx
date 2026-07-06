import React from "react";

export function CardSkeleton() {
  return (
    <div className="skeleton-shimmer" style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardAvatar}></div>
        <div style={styles.cardTextBig}></div>
      </div>
      <div style={styles.cardTextSmall}></div>
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="skeleton-shimmer" style={styles.row}>
      <div style={styles.rowLeft}>
        <div style={styles.rowIcon}></div>
        <div style={styles.rowTextBig}></div>
      </div>
      <div style={styles.rowRight}>
        <div style={styles.rowTextSmall}></div>
      </div>
    </div>
  );
}

export function LogsSkeleton() {
  return (
    <div style={styles.logsContainer}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton-shimmer" style={styles.logRow}>
          <div style={styles.logLeft}>
            <div style={styles.logBadge}></div>
            <div style={styles.logText}></div>
          </div>
          <div style={styles.logRight}></div>
        </div>
      ))}
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div className="skeleton-shimmer" style={styles.preview}>
      <div style={styles.previewHeader}>
        <div style={styles.previewAvatar}></div>
        <div style={styles.previewTitle}></div>
      </div>
      <div style={styles.previewBody}></div>
    </div>
  );
}

const styles = {
  card: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: "14px",
    padding: "16px",
    height: "110px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  cardAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.05)",
  },
  cardTextBig: {
    width: "60%",
    height: "14px",
    borderRadius: "4px",
    background: "rgba(255, 255, 255, 0.05)",
  },
  cardTextSmall: {
    width: "40%",
    height: "10px",
    borderRadius: "4px",
    background: "rgba(255, 255, 255, 0.05)",
  },
  row: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: "10px",
    padding: "12px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "60%",
  },
  rowIcon: {
    width: "20px",
    height: "20px",
    borderRadius: "4px",
    background: "rgba(255, 255, 255, 0.05)",
  },
  rowTextBig: {
    width: "70%",
    height: "12px",
    borderRadius: "4px",
    background: "rgba(255, 255, 255, 0.05)",
  },
  rowRight: {
    width: "20%",
    display: "flex",
    justifyContent: "flex-end",
  },
  rowTextSmall: {
    width: "60px",
    height: "10px",
    borderRadius: "4px",
    background: "rgba(255, 255, 255, 0.05)",
  },
  logsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "100%",
  },
  logRow: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: "12px",
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    width: "70%",
  },
  logBadge: {
    width: "68px",
    height: "22px",
    borderRadius: "6px",
    background: "rgba(255, 255, 255, 0.05)",
  },
  logText: {
    width: "50%",
    height: "12px",
    borderRadius: "4px",
    background: "rgba(255, 255, 255, 0.05)",
  },
  logRight: {
    width: "60px",
    height: "10px",
    borderRadius: "4px",
    background: "rgba(255, 255, 255, 0.05)",
  },
  preview: {
    width: "100%",
    height: "360px",
    borderRadius: "16px",
    background: "rgba(255, 255, 255, 0.015)",
    border: "1px solid rgba(255, 255, 255, 0.03)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  previewHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  previewAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.05)",
  },
  previewTitle: {
    width: "140px",
    height: "14px",
    borderRadius: "4px",
    background: "rgba(255, 255, 255, 0.05)",
  },
  previewBody: {
    flexGrow: 1,
    marginTop: "20px",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.03)",
  },
};
