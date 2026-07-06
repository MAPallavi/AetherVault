import React from "react";
import { Upload, FolderPlus, RefreshCw, FolderOpen, Trash2, Settings } from "lucide-react";

export default function QuickActions({
  setCurrentTab,
  onUploadClick,
  onCreateFolderClick,
  onRefreshClick
}) {
  return (
    <div className="dashboard-card">
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
          <span>Open File Browser</span>
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
  );
}