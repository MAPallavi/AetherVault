import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import DashboardHeader from "./dashboard/DashboardHeader";
import StatsCards from "./dashboard/StatsCards";
import StorageChart from "./dashboard/StorageChart";
import QuickActions from "./dashboard/QuickActions";
import RecentActivities from "./dashboard/RecentActivities";
import { Loader2 } from "lucide-react";
import "../styles/dashboard.css";

export default function Dashboard({ setCurrentTab }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const [analytics, logs] = await Promise.all([
        api.getAnalytics(),
        api.getLogs(),
      ]);
      setData(analytics);
      setRecentLogs(logs.slice(0, 5));
    } catch (err) {
      setError("Failed to fetch dashboard analytics.");
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader2 className="spinner" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p style={{ color: "#ef4444" }}>{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ marginTop: "10px" }}>
          Retry
        </button>
      </div>
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

  return (
    <div className="dashboard-container fade">
      <DashboardHeader />
      <StatsCards
        totalSize={totalSize}
        fileCount={fileCount}
        folderCount={folderCount}
        trashCount={trashCount}
        formatSize={formatSize}
      />

      <div className="dashboard-layout-row">
        <StorageChart
          totalSize={totalSize}
          categoriesList={categoriesList}
          formatSize={formatSize}
          donutSegments={donutSegments}
          setCurrentTab={setCurrentTab}
        />

        <div className="dashboard-activity-col">
          <QuickActions setCurrentTab={setCurrentTab} />
          <RecentActivities
            recentLogs={recentLogs}
            setCurrentTab={setCurrentTab}
          />
        </div>
      </div>
    </div>
  );
}
