import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  Search,
  Bell,
  User,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileText,
  FolderOpen,
  Trash2,
  Activity,
  X,
  Loader2,
} from "lucide-react";
import { api } from "../utils/api";

export default function Navbar({
  toggleSidebar,
  username,
  currentTab,
  setCurrentTab,
  onPreviewSelect,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState({ files: [], trash: [], logs: [] });
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    window.addEventListener("mousedown", clickOutside);
    return () => window.removeEventListener("mousedown", clickOutside);
  }, []);

  // Debounced query triggering
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setResults({ files: [], trash: [], logs: [] });
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      performGlobalSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performGlobalSearch = async () => {
    setSearching(true);
    setShowDropdown(true);
    try {
      const [activeItems, trashItems, logList] = await Promise.all([
        api.listFiles(null, searchQuery.trim()),
        api.listFiles(null, searchQuery.trim(), true), // trash search
        api.getLogs(),
      ]);

      const matchingLogs = logList
        .filter(
          (l) =>
            l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.action.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 4);

      setResults({
        files: activeItems.slice(0, 5),
        trash: trashItems.slice(0, 4),
        logs: matchingLogs,
      });
    } catch (err) {
      console.error("Global search query failed", err);
    } finally {
      setSearching(false);
    }
  };

  const getFileIcon = (mimeType) => {
    const mime = mimeType?.toLowerCase() || "";
    if (mime.startsWith("image/")) return <FileImage size={14} color="#e040fb" />;
    if (mime.startsWith("video/")) return <FileVideo size={14} color="#ff5252" />;
    if (mime.startsWith("audio/")) return <FileAudio size={14} color="#ffd740" />;
    if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar"))
      return <FileArchive size={14} color="#69f0ae" />;
    return <FileText size={14} color="#3b82f6" />;
  };

  const handleItemClick = (item, category) => {
    setShowDropdown(false);
    setSearchQuery("");

    if (category === "files") {
      if (item.isFolder) {
        localStorage.setItem(
          "aethervault_search_folder",
          JSON.stringify({ _id: item._id, name: item.name })
        );
        setCurrentTab("files");
      } else {
        if (onPreviewSelect) onPreviewSelect(item);
      }
    } else if (category === "trash") {
      setCurrentTab("trash");
    } else if (category === "logs") {
      setCurrentTab("logs");
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case "dashboard":
        return "Dashboard";
      case "files":
        return "My Files";
      case "trash":
        return "Recycle Bin";
      case "logs":
        return "Activity Logs";
      case "settings":
        return "Settings";
      default:
        return "AetherVault";
    }
  };

  const hasResults =
    results.files.length > 0 || results.trash.length > 0 || results.logs.length > 0;

  return (
    <header className="navbar glass">
      <div className="navbar-left">
        <button className="hamburger-btn" onClick={toggleSidebar} title="Toggle Menu">
          <Menu size={20} />
        </button>
        <h2 className="navbar-title">{getTabTitle()}</h2>
      </div>

      {/* Middle search bar suggestions overlay */}
      <div className="navbar-search-wrapper" ref={dropdownRef}>
        <Search size={16} className="navbar-search-icon" />
        <input
          id="navbar-global-search"
          type="text"
          placeholder="Search files, folders, logs... (Ctrl+F)"
          className="navbar-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim().length >= 2) setShowDropdown(true);
          }}
          autoComplete="off"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              setShowDropdown(false);
            }}
            style={{
              position: "absolute",
              right: "12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        )}

        {/* Floating results lists */}
        {showDropdown && (
          <div className="navbar-search-dropdown">
            {searching ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 0",
                  gap: "8px",
                  color: "var(--text-secondary)",
                  fontSize: "0.8rem",
                }}
              >
                <Loader2 className="spinner" size={14} />
                <span>Searching Vault...</span>
              </div>
            ) : !hasResults ? (
              <div className="navbar-search-no-results">No vault files or log coordinates found.</div>
            ) : (
              <>
                {/* Active Files & Folders */}
                {results.files.length > 0 && (
                  <div>
                    <div className="navbar-search-section-title">Files & Folders</div>
                    {results.files.map((file) => (
                      <div
                        key={file._id}
                        onClick={() => handleItemClick(file, "files")}
                        className="navbar-search-item"
                      >
                        {file.isFolder ? (
                          <FolderOpen size={14} color="var(--primary)" />
                        ) : (
                          getFileIcon(file.mimeType)
                        )}
                        <span className="navbar-search-item-text">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Trash */}
                {results.trash.length > 0 && (
                  <div>
                    <div className="navbar-search-section-title">Recycle Bin (Trash)</div>
                    {results.trash.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => handleItemClick(item, "trash")}
                        className="navbar-search-item"
                      >
                        <Trash2 size={14} color="var(--danger)" style={{ opacity: 0.8 }} />
                        <span className="navbar-search-item-text">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Log Activities */}
                {results.logs.length > 0 && (
                  <div>
                    <div className="navbar-search-section-title">System Activities</div>
                    {results.logs.map((log) => (
                      <div
                        key={log._id}
                        onClick={() => handleItemClick(log, "logs")}
                        className="navbar-search-item"
                      >
                        <Activity size={14} color="var(--warning)" style={{ opacity: 0.8 }} />
                        <span className="navbar-search-item-text">{log.details}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right control utilities */}
      <div className="navbar-right">
        {/* Notification Bell */}
        <button className="navbar-bell-btn" title="Notifications">
          <Bell size={18} />
          <span className="navbar-bell-badge"></span>
        </button>

        {/* User Profile Avatar info */}
        <div className="navbar-user-info" onClick={() => setCurrentTab("settings")}>
          <span className="navbar-username">{username || "Admin"}</span>
          <button className="navbar-profile-btn" title="View Profile">
            <User size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}