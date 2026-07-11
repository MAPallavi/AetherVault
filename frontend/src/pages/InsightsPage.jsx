import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Loader2, TrendingUp, HardDrive, Download, Eye, FileText, Calendar, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";

export default function InsightsPage({ setCurrentTab }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getInsights();
      setStats(data);
    } catch (err) {
      toast.error(err.message || "Failed to load insights statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "350px" }}>
        <Loader2 className="spinner" size={32} color="var(--primary)" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
        No insights data available. Click refresh to try again.
      </div>
    );
  }

  const { largestFiles, largestFolders, recentlyModified, categories, mostDownloaded, mostPreviewed } = stats;

  // Calculate totals for Pie Chart
  const totalCatSize = Object.values(categories).reduce((acc, curr) => acc + curr.size, 0);

  // SVG Pie chart helper
  const drawPieChart = () => {
    const data = [
      { label: "Images", value: categories.images.size, color: "#9d4edd" },
      { label: "Videos", value: categories.videos.size, color: "#3b82f6" },
      { label: "Audio", value: categories.audio.size, color: "#10b981" },
      { label: "Documents", value: categories.documents.size, color: "#eab308" },
      { label: "Archives", value: categories.archives.size, color: "#f43f5e" },
      { label: "Others", value: categories.others.size, color: "#6b7280" }
    ].filter(item => item.value > 0);

    if (data.length === 0) {
      return <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>No category space data.</div>;
    }

    let cumulativePercent = 0;
    const slices = data.map((item, idx) => {
      const percent = item.value / totalCatSize;
      const startAngle = cumulativePercent * 360;
      cumulativePercent += percent;
      const endAngle = cumulativePercent * 360;

      const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
      };

      const [startX, startY] = getCoordinatesForPercent(startAngle / 360);
      const [endX, endY] = getCoordinatesForPercent(endAngle / 360);

      const largeArcFlag = percent > 0.5 ? 1 : 0;

      // Map from [-1, 1] coordinate system to SVG viewBox [0, 100]
      const scaleX = (val) => 50 + val * 40;
      const scaleY = (val) => 50 + val * 40;

      const pathData = [
        `M 50 50`,
        `L ${scaleX(startX)} ${scaleY(startY)}`,
        `A 40 40 0 ${largeArcFlag} 1 ${scaleX(endX)} ${scaleY(endY)}`,
        `Z`
      ].join(" ");

      return (
        <path
          key={idx}
          d={pathData}
          fill={item.color}
          stroke="rgba(25, 28, 41, 0.65)"
          strokeWidth="1"
          style={{ transition: "all 0.3s ease" }}
        />
      );
    });

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "24px", width: "100%" }}>
        <svg width="150" height="150" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
          {slices}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexGrow: 1 }}>
          {data.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.color }}></span>
                <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
              </div>
              <span style={{ fontWeight: "600" }}>{formatSize(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="insights-container" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#fff", margin: 0 }}>Analytics Insights</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>Detailed statistics, utilization trends, and activity analytics.</p>
        </div>
        <button onClick={() => setCurrentTab("dashboard")} className="btn btn-secondary" style={{ display: "inline-flex", gap: "6px", fontSize: "0.85rem" }}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Grid Layout Row 1: Charts section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1-fraction))", gap: "20px" }}>
        
        {/* Category distribution */}
        <div className="dashboard-card glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <HardDrive size={16} color="var(--primary)" />
            <span>Category Space Distribution</span>
          </h3>
          {drawPieChart()}
        </div>

        {/* Most active files */}
        <div className="dashboard-card glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={16} color="var(--primary)" />
            <span>Most Active Operations</span>
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", justifyContent: "center", flexGrow: 1 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                <span>Downloads logged</span>
                <strong style={{ color: "var(--success)" }}>{mostDownloaded.reduce((acc, c) => acc + c.count, 0)}</strong>
              </div>
              <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--success)", width: `${Math.min(mostDownloaded.reduce((acc, c) => acc + c.count, 0) * 10, 100)}%` }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                <span>Previews viewed</span>
                <strong style={{ color: "var(--primary)" }}>{mostPreviewed.reduce((acc, c) => acc + c.count, 0)}</strong>
              </div>
              <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--primary)", width: `${Math.min(mostPreviewed.reduce((acc, c) => acc + c.count, 0) * 10, 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout Row 2: File listings statistics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        
        {/* Largest Files */}
        <div className="dashboard-card glass" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={16} color="var(--primary)" />
            <span>Largest Files in Vault</span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {largestFiles.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem" }}>No files uploaded yet.</div>
            ) : (
              largestFiles.map((file) => (
                <div key={file._id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", background: "rgba(255,255,255,0.01)", padding: "8px 12px", borderRadius: "8px" }}>
                  <span style={{ color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "200px" }}>{file.name}</span>
                  <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>{formatSize(file.size)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Largest Folders */}
        <div className="dashboard-card glass" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <HardDrive size={16} color="var(--primary)" />
            <span>Largest Folders</span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {largestFolders.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem" }}>No folders created yet.</div>
            ) : (
              largestFolders.map((folder) => (
                <div key={folder._id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", background: "rgba(255,255,255,0.01)", padding: "8px 12px", borderRadius: "8px" }}>
                  <span style={{ color: "#fff" }}>{folder.name}</span>
                  <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>{formatSize(folder.size)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Modified */}
        <div className="dashboard-card glass" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={16} color="var(--primary)" />
            <span>Recently Modified</span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recentlyModified.map((file) => (
              <div key={file._id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", background: "rgba(255,255,255,0.01)", padding: "8px 12px", borderRadius: "8px" }}>
                <span style={{ color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "200px" }}>{file.name}</span>
                <span style={{ color: "var(--text-secondary)" }}>{new Date(file.updatedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
