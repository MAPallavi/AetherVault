import React from "react";
import { Upload, FolderPlus, RefreshCw, FolderOpen, Trash2, Settings, Download } from "lucide-react";

export default function QuickActions({
  setCurrentTab,
  onUploadClick,
  onCreateFolderClick,
  onRefreshClick,
  onExportCSV,
  onExportJSON
}) {
  return (
    <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <h3 className="dashboard-panel-title" style={{ marginBottom: "12px" }}>Quick Actions</h3>
        <div className="quick-actions-list">
          <button onClick={onUploadClick} className="quick-action-btn" title="Upload new files">
            <Upload size={16} />
            <span>Upload File</span>
          </button>

          <button onClick={onCreateFolderClick} className="quick-action-btn" title="Create a new directory">
            <FolderPlus size={16} />
            <span>Create Folder</span>
          </button>

          <button onClick={onRefreshClick} className="quick-action-btn" title="Refresh dashboard data">
            <RefreshCw size={16} />
            <span>Refresh Dashboard</span>
          </button>

          <button onClick={() => setCurrentTab("files")} className="quick-action-btn" title="Go to File Browser">
            <FolderOpen size={16} />
            <span>Open Browser</span>
          </button>

          <button onClick={() => setCurrentTab("trash")} className="quick-action-btn" title="View Recycle Bin">
            <Trash2 size={16} />
            <span>Recycle Bin</span>
          </button>

          <button onClick={() => setCurrentTab("settings")} className="quick-action-btn" title="Configure system settings">
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "12px" }}>
        <h3 className="dashboard-panel-title" style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Download size={14} color="var(--primary)" />
          <span>Export Vault Analytics</span>
        </h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onExportCSV} className="btn btn-secondary" style={{ flexGrow: 1, fontSize: "0.75rem", padding: "6px 12px", height: "auto" }}>
            CSV Format
          </button>
          <button onClick={onExportJSON} className="btn btn-primary" style={{ flexGrow: 1, fontSize: "0.75rem", padding: "6px 12px", height: "auto" }}>
            JSON Format
          </button>
        </div>
      </div>
    </div>
  );
}