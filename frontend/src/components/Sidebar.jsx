import "../styles/sidebar.css";
import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { LayoutDashboard, FolderClosed, Trash2, ScrollText, LogOut, Shield, HardDrive } from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, username, onLogout, refreshTrigger }) {
  const [stats, setStats] = useState({ totalSize: 0, fileCount: 0 });

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger, currentTab]); // Refetch when requested or tab shifts

  const fetchStats = async () => {
    try {
      const data = await api.getAnalytics();
      setStats({
        totalSize: data.totalSize,
        fileCount: data.fileCount
      });
    } catch (err) {
      console.error('Error fetching stats for sidebar:', err);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Standard quota setup: let's set a visual quota of 2GB for display
  const QUOTA_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB
  const percentage = Math.min((stats.totalSize / QUOTA_LIMIT) * 100, 100);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'files', name: 'All Files', icon: FolderClosed },
    { id: 'trash', name: 'Recycle Bin', icon: Trash2 },
    { id: 'logs', name: 'Activity Logs', icon: ScrollText },
  ];

  return (
    <div className="glass-panel sidebar">
      <div style={styles.branding}>
        <Shield size={24} color="#9d4edd" />
        <span style={styles.logoText}>AetherVault</span>
      </div>

      <nav style={styles.navigation}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              }}
            >
              <Icon size={18} color={isActive ? '#9d4edd' : 'var(--text-secondary)'} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Storage Dashboard summary */}
      <div style={styles.storagePanel}>
        <div style={styles.storageHeader}>
          <HardDrive size={16} color="var(--text-secondary)" />
          <span style={styles.storageTitle}>Vault Storage</span>
        </div>
        <div style={styles.storageProgressContainer}>
          <div style={{ ...styles.storageProgressBar, width: `${percentage}%` }}></div>
        </div>
        <div style={styles.storageDetails}>
          <span>{formatSize(stats.totalSize)} of 2 GB</span>
          <span>{stats.fileCount} files</span>
        </div>
      </div>

      <div style={styles.profileSection}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {username.charAt(0).toUpperCase()}
          </div>
          <span style={styles.userName} title={username}>{username}</span>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn} title="Lock Vault">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    height: 'calc(100vh - 40px)',
    margin: '20px 0 20px 20px',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    borderRadius: '16px',
    flexShrink: 0,
  },
  branding: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    marginBottom: '24px',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: '700',
    background: 'linear-gradient(to right, #f3f4f6, #9d4edd)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '0.5px',
  },
  navigation: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexGrow: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    fontWeight: '500',
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s ease',
  },
  navItemActive: {
    background: 'rgba(157, 78, 221, 0.1)',
    color: 'var(--text-primary)',
  },
  storagePanel: {
    background: 'rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  storageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  storageTitle: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  storageProgressContainer: {
    height: '6px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  storageProgressBar: {
    height: '100%',
    background: 'var(--primary)',
    borderRadius: '3px',
    boxShadow: '0 0 8px var(--primary-glow)',
  },
  storageDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  profileSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    overflow: 'hidden',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    color: '#fff',
    fontSize: '0.9rem',
    boxShadow: '0 0 10px var(--primary-glow)',
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100px',
  },
  logoutBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
};
// Add CSS rule for hover dynamically via style tags if we want, or handle inside css
