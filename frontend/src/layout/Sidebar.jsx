import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import { FaHome, FaFolder, FaTrash, FaChartPie, FaCog, FaSignOutAlt, FaShieldAlt } from "react-icons/fa";
import { HardDrive } from "lucide-react";
import "../styles/sidebar.css";

export default function Sidebar({ currentTab, setCurrentTab, username, onLogout, refreshTrigger, isOpen, toggleSidebar }) {
  const [stats, setStats] = useState({ totalSize: 0, fileCount: 0 });

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger, currentTab]);

  const fetchStats = async () => {
    try {
      const data = await api.getAnalytics();
      setStats({
        totalSize: data.totalSize,
        fileCount: data.fileCount,
      });
    } catch (err) {
      console.error("Error fetching stats for sidebar:", err);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const QUOTA_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB
  const percentage = Math.min((stats.totalSize / QUOTA_LIMIT) * 100, 100);

  const menuItems = [
    { id: "dashboard", name: "Dashboard", icon: FaHome },
    { id: "files", name: "My Files", icon: FaFolder },
    { id: "trash", name: "Recycle Bin", icon: FaTrash },
    { id: "logs", name: "Activity Logs", icon: FaChartPie },
    { id: "settings", name: "Settings", icon: FaCog },
  ];

  return (
    <aside className={`sidebar glass ${isOpen ? "open" : ""}`}>
      <div className="sidebar-branding">
        <FaShieldAlt size={22} color="var(--primary)" />
        <span className="sidebar-logo-text">AetherVault</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                if (isOpen && toggleSidebar) toggleSidebar();
              }}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <Icon />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Storage quota view */}
      <div className="storage-panel">
        <div className="storage-header">
          <HardDrive size={14} color="var(--text-secondary)" />
          <span className="storage-title">Vault Storage</span>
        </div>
        <div className="storage-progress-container">
          <div className="storage-progress-bar" style={{ width: `${percentage}%` }}></div>
        </div>
        <div className="storage-details">
          <span>{formatSize(stats.totalSize)} of 2 GB</span>
        </div>
      </div>

      {/* User profile footer */}
      <div className="profile-section">
        <div className="user-info">
          <div className="avatar">
            {username ? username.charAt(0).toUpperCase() : "A"}
          </div>
          <span className="user-name" title={username}>{username}</span>
        </div>
        <button onClick={onLogout} className="logout-btn" title="Lock Vault">
          <FaSignOutAlt size={16} />
        </button>
      </div>
    </aside>
  );
}