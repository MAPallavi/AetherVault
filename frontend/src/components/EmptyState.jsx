import React from "react";
import { motion } from "framer-motion";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={styles.container}
      className="glass"
    >
      <div style={styles.iconCircle}>
        <Icon size={32} color="var(--primary)" />
      </div>
      
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      
      {actionText && onAction && (
        <button onClick={onAction} className="btn-purple" style={styles.btn}>
          {actionText}
        </button>
      )}
    </motion.div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 32px",
    textAlign: "center",
    maxWidth: "480px",
    margin: "40px auto",
    borderRadius: "20px",
  },
  iconCircle: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "rgba(124, 58, 237, 0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "18px",
    border: "1px solid rgba(124, 58, 237, 0.15)",
  },
  title: {
    fontSize: "1.15rem",
    fontWeight: "700",
    color: "#ffffff",
    margin: "0 0 8px 0",
    letterSpacing: "-0.3px",
  },
  description: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    margin: "0 0 20px 0",
    lineHeight: "1.5",
  },
  btn: {
    padding: "10px 20px",
    borderRadius: "10px",
    border: "none",
    fontWeight: "600",
    fontSize: "0.85rem",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.2)",
  },
};
