import React from "react";
import { motion } from "framer-motion";
import { HardDrive, Files, Folder, Trash, Activity, LogIn } from "lucide-react";

export default function StatsCards({
  totalSize,
  fileCount,
  folderCount,
  trashCount,
  uploadsToday = 0,
  formatSize,
}) {
  const CAPACITY = 2 * 1024 * 1024 * 1024; // 2GB
  const remainingSize = Math.max(CAPACITY - totalSize, 0);

  const cards = [
    {
      title: "Storage Used",
      value: formatSize(totalSize),
      subtitle: "AES-256 Encrypted",
      icon: HardDrive,
      color: "#9d4edd",
    },
    {
      title: "Storage Remaining",
      value: formatSize(remainingSize),
      subtitle: "Out of 2.0 GB quota",
      icon: HardDrive,
      color: "#3b82f6",
    },
    {
      title: "Total Files",
      value: fileCount,
      subtitle: "Secured in cloud",
      icon: Files,
      color: "#10b981",
    },
    {
      title: "Folders Created",
      value: folderCount,
      subtitle: "Virtual directory tree",
      icon: Folder,
      color: "#a78bfa",
    },
    {
      title: "Recycle Bin",
      value: trashCount,
      subtitle: "Soft-deleted files",
      icon: Trash,
      color: "#ef4444",
    },
    {
      title: "Uploads Today",
      value: uploadsToday,
      subtitle: "Last 24 hours activity",
      icon: Activity,
      color: "#ffd740",
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <motion.div
            key={card.title}
            className="dashboard-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.05,
              duration: 0.35,
            }}
            whileHover={{ y: -4 }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              borderLeft: `4px solid ${card.color}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
              <div
                className="card-icon"
                style={{
                  background: `${card.color}15`,
                  margin: 0,
                }}
              >
                <Icon size={20} color={card.color} />
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: "500", opacity: 0.8 }}>
                {card.subtitle}
              </span>
            </div>

            <div style={{ marginTop: "4px" }}>
              <p className="card-title" style={{ margin: 0 }}>{card.title}</p>
              <h2 className="card-value" style={{ marginTop: "4px" }}>{card.value}</h2>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}