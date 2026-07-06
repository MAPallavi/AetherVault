import React, { useState, useEffect, useRef } from "react";
import { api } from "../utils/api";
import MainLayout from "../layout/MainLayout";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatsCards from "../components/dashboard/StatsCards";
import StorageChart from "../components/dashboard/StorageChart";
import QuickActions from "../components/dashboard/QuickActions";
import RecentActivities from "../components/dashboard/RecentActivities";
import LargestFiles from "../components/dashboard/LargestFiles";
import RecentUploads from "../components/dashboard/RecentUploads";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";
import { Loader2 } from "lucide-react";
import "../styles/dashboard.css";

export default function Dashboard({
  currentTab,
  setCurrentTab,
  username,
  onLogout,
  refreshTrigger,
  isSidebarOpen,
  toggleSidebar,
  onPreviewSelect,
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [allActiveFiles, setAllActiveFiles] = useState([]);
  const [error, setError] = useState("");
  const [localRefresh, setLocalRefresh] = useState(0);

  // Upload States for Dashboard Uploads
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger, localRefresh]);

  // Listen to custom upload/new folder shortcuts on dashboard tab
  useEffect(() => {
    const handleShortcutUpload = () => {
      if (currentTab === "dashboard") {
        fileInputRef.current?.click();
      }
    };
    const handleShortcutNewFolder = () => {
      if (currentTab === "dashboard") {
        handleDashboardCreateFolder();
      }
    };
    
    window.addEventListener("aethervault_shortcut_upload", handleShortcutUpload);
    window.addEventListener("aethervault_shortcut_new_folder", handleShortcutNewFolder);
    return () => {
      window.removeEventListener("aethervault_shortcut_upload", handleShortcutUpload);
      window.removeEventListener("aethervault_shortcut_new_folder", handleShortcutNewFolder);
    };
  }, [currentTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const [analytics, logs, files] = await Promise.all([
        api.getAnalytics(),
        api.getLogs(),
        api.listFiles(null, "."), // Query all active files/folders globally
      ]);
      setData(analytics);
      setRecentLogs(logs.slice(0, 10)); // fetch top 10 logs
      // Filter out folders to keep actual files
      const activeFiles = files.filter((f) => !f.isFolder);
      setAllActiveFiles(activeFiles);
    } catch (err) {
      setError("Failed to fetch dashboard analytics.");
    } finally {
      setLoading(false);
    }
  };

  const triggerLocalRefresh = () => {
    setLocalRefresh((prev) => prev + 1);
  };

  // Direct Upload from Dashboard Actions
  const handleDashboardUpload = async (e) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    setUploading(true);
    setUploadPercent(0);
    try {
      await api.uploadFiles(filesList, null, (percent) => {
        setUploadPercent(percent);
      });
      triggerLocalRefresh();
    } catch (err) {
      alert("Failed to upload file from dashboard: " + err.message);
    } finally {
      setUploading(false);
      setUploadPercent(0);
    }
  };

  // Direct Folder Creation from Dashboard Actions
  const handleDashboardCreateFolder = async () => {
    const name = window.prompt("Enter new folder name:");
    if (!name || !name.trim()) return;

    try {
      await api.createFolder(name.trim(), null);
      triggerLocalRefresh();
    } catch (err) {
      alert("Failed to create folder from dashboard: " + err.message);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (loading && !uploading) {
    return (
      <MainLayout
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        username={username}
        onLogout={onLogout}
        refreshTrigger={refreshTrigger}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        onPreviewSelect={onPreviewSelect}
      >
        <DashboardSkeleton />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        username={username}
        onLogout={onLogout}
        refreshTrigger={refreshTrigger}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        onPreviewSelect={onPreviewSelect}
      >
        <div className="error-container">
          <p style={{ color: "#ef4444" }}>{error}</p>
          <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ marginTop: "10px" }}>
            Retry
          </button>
        </div>
      </MainLayout>
    );
  }

  const { totalSize, fileCount, folderCount, trashCount, categories } = data;

  const categoriesList = [
    { label: "Images", color: "#e040fb", ...categories.images },
    { label: "Videos", color: "#ff5252", ...categories.video },
    { label: "Audio", color: "#ffd740", ...categories.audio },
    { label: "Documents", color: "#18ffff", ...categories.documents },
    { label: "Archives", color: "#69f0ae", ...categories.archives },
    { label: "Others", color: "#b0bec5", ...categories.others },
  ].filter((cat) => cat.count > 0);

  // Donut segment calculation
  let cumAngle = 0;
  const donutSegments = categoriesList.map((cat) => {
    const sizeRatio = totalSize > 0 ? cat.size / totalSize : 0;
    const angle = sizeRatio * 360;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
      };
    };

    const describeArc = (x, y, radius, startAngle, endAngle) => {
      const start = polarToCartesian(x, y, radius, endAngle);
      const end = polarToCartesian(x, y, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      return [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      ].join(" ");
    };

    return {
      path: describeArc(100, 100, 70, startAngle, endAngle),
      color: cat.color,
      label: cat.label,
      percent: Math.round(sizeRatio * 100),
    };
  });

  // Extract size / time ranking segments client-side
  const largestFiles = [...allActiveFiles].sort((a, b) => b.size - a.size).slice(0, 5);
  const recentUploads = [...allActiveFiles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  
  // Calculate files uploaded in the last 24 hours
  const uploadsToday = allActiveFiles.filter(
     (f) => new Date() - new Date(f.createdAt) < 24 * 60 * 60 * 1000
  ).length;

  const getStorageTrendData = () => {
    if (!allActiveFiles || allActiveFiles.length === 0) return [];
    
    // Sort files by creation date
    const sorted = [...allActiveFiles].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Group sizes cumulatively
    let cumulative = 0;
    const points = sorted.map(file => {
      cumulative += file.size;
      return {
        date: new Date(file.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
        size: cumulative
      };
    });

    // Sub-sample or limit to last 7 data points to fit the graph cleanly
    if (points.length <= 7) return points;
    
    // Pick 7 evenly spaced indexes
    const step = (points.length - 1) / 6;
    const sampled = [];
    for (let i = 0; i < 7; i++) {
      sampled.push(points[Math.round(i * step)]);
    }
    return sampled;
  };

  const headerProps = {
    username,
    totalSize,
    formatSize,
    onUploadClick: () => fileInputRef.current.click(),
    onCreateFolderClick: handleDashboardCreateFolder,
  };

  return (
    <MainLayout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      username={username}
      onLogout={onLogout}
      refreshTrigger={refreshTrigger}
      isSidebarOpen={isSidebarOpen}
      toggleSidebar={toggleSidebar}
      onPreviewSelect={onPreviewSelect}
    >
      <div className="dashboard-container fade">
        {/* Header greeting banner */}
        <DashboardHeader {...headerProps} />

        {/* Dynamic Metric Widgets Grid */}
        <StatsCards
          totalSize={totalSize}
          fileCount={fileCount}
          folderCount={folderCount}
          trashCount={trashCount}
          uploadsToday={uploadsToday}
          formatSize={formatSize}
        />

        {/* Analytics Row: Storage breakdown vs. Largest Files */}
        <div className="dashboard-layout-row">
          <div className="dashboard-chart-col">
            <StorageChart
              totalSize={totalSize}
              categoriesList={categoriesList}
              formatSize={formatSize}
              donutSegments={donutSegments}
              setCurrentTab={setCurrentTab}
            />
          </div>

          <div className="dashboard-activity-col">
            <LargestFiles
              files={largestFiles}
              onPreviewSelect={onPreviewSelect}
              formatSize={formatSize}
            />
            <QuickActions
              setCurrentTab={setCurrentTab}
              onUploadClick={() => fileInputRef.current.click()}
              onCreateFolderClick={handleDashboardCreateFolder}
              onRefreshClick={triggerLocalRefresh}
            />
          </div>
        </div>

        {/* Widgets Row: Recent Uploads vs. Activity Logs */}
        <div className="dashboard-layout-row" style={{ marginTop: "24px" }}>
          <div className="dashboard-chart-col">
            <RecentUploads
              files={recentUploads}
              onPreviewSelect={onPreviewSelect}
              formatSize={formatSize}
            />
          </div>
          <div className="dashboard-activity-col">
            <RecentActivities
              recentLogs={recentLogs}
              setCurrentTab={setCurrentTab}
            />
          </div>
        </div>

        {/* Third Row: Storage Trend vs. Recent Login Audits */}
        <div className="dashboard-layout-row" style={{ marginTop: "24px" }}>
          <div className="dashboard-chart-col">
            <div className="dashboard-card glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", minHeight: "260px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", margin: 0 }}>Storage Usage Growth Trend</h3>
              {/* Storage Trend Area Chart SVG */}
              <div style={{ flexGrow: 1, position: "relative", minHeight: "150px" }}>
                {getStorageTrendData().length < 2 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    Not enough uploads to chart growth trends.
                  </div>
                ) : (
                  <svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>
                    
                    {/* SVG Line / Area */}
                    {(() => {
                      const trend = getStorageTrendData();
                      const maxVal = Math.max(...trend.map(t => t.size));
                      const getX = (index) => (index / (trend.length - 1)) * 500;
                      const getY = (val) => 140 - (maxVal > 0 ? (val / maxVal) * 110 : 0);
                      
                      const pointsStr = trend.map((t, idx) => `${getX(idx)},${getY(t.size)}`).join(" ");
                      const areaStr = `0,140 ${pointsStr} 500,140`;
                      
                      return (
                        <>
                          {/* Grid Lines */}
                          <line x1="0" y1="140" x2="500" y2="140" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                          <line x1="0" y1="85" x2="500" y2="85" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                          <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                          {/* Gradient Area Fill */}
                          <polygon points={areaStr} fill="url(#trendGrad)" />
                          
                          {/* Main Line Path */}
                          <polyline points={pointsStr} fill="none" stroke="var(--primary)" strokeWidth="2.5" />
                          
                          {/* Dot markers */}
                          {trend.map((t, idx) => (
                            <g key={idx}>
                              <circle cx={getX(idx)} cy={getY(t.size)} r="4" fill="var(--primary-light)" />
                              {/* Date labels below */}
                              <text x={getX(idx)} y="150" fill="var(--text-secondary)" fontSize="8" textAnchor="middle">{t.date}</text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                )}
              </div>
            </div>
          </div>
          
          <div className="dashboard-activity-col">
            <div className="dashboard-card glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", minHeight: "260px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", margin: 0 }}>Recent User Audits (Logins)</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", flexGrow: 1, overflowY: "auto" }}>
                {(() => {
                  const loginLogs = recentLogs.filter(l => l.action === "LOGIN").slice(0, 4);
                  if (loginLogs.length === 0) {
                    return (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        No user login audits recorded recently.
                      </div>
                    );
                  }
                  return loginLogs.map((log) => (
                    <div key={log._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "0.8rem", color: "#fff", fontWeight: "600" }}>{log.details}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>IP: {log.ipAddress || "unknown"}</span>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input for dashboard uploads */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleDashboardUpload}
        multiple
      />

      {/* Floating Upload Progress Overlay */}
      {uploading && (
        <div className="progress-card glass" style={styles.progressCard}>
          <div style={styles.progressHeader}>
            <Loader2 className="spinner" size={16} color="var(--primary)" />
            <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>Securing files...</span>
            <span style={{ fontSize: "0.85rem", color: "var(--primary)" }}>{uploadPercent}%</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${uploadPercent}%` }}></div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

const styles = {
  progressCard: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "260px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    border: "1px solid var(--primary)",
    zIndex: 9999,
  },
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  progressTrack: {
    height: "6px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "var(--primary)",
    borderRadius: "3px",
    transition: "width 0.1s ease",
  },
};