import React, { useState, useEffect } from "react";
import { ChevronRight, ArrowLeft, Folder, ChevronDown, Clock } from "lucide-react";
import { toast } from "react-hot-toast";

export default function Breadcrumbs({ currentFolder, folderHistory, navigateBack, navigateToBreadcrumb }) {
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [showRightClickMenu, setShowRightClickMenu] = useState(null); // { x, y, index }

  // Load history list from localStorage on mount and folder change
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aethervault_visited_folders");
      const list = saved ? JSON.parse(saved) : [];
      setHistoryList(list);
    } catch (e) {
      setHistoryList([]);
    }
  }, [currentFolder]);

  // Save current folder to visited history
  useEffect(() => {
    if (!currentFolder) return;
    try {
      const saved = localStorage.getItem("aethervault_visited_folders");
      let list = saved ? JSON.parse(saved) : [];
      // Remove existing
      list = list.filter(f => f._id !== currentFolder._id);
      // Prepend
      list.unshift({ _id: currentFolder._id, name: currentFolder.name, timestamp: new Date().toISOString() });
      // Limit to 8 items
      list = list.slice(0, 8);
      localStorage.setItem("aethervault_visited_folders", JSON.stringify(list));
      setHistoryList(list);
    } catch (e) {
      // Ignore
    }
  }, [currentFolder]);

  const handleRightClick = (e, index) => {
    e.preventDefault();
    setShowRightClickMenu({
      x: e.clientX,
      y: e.clientY,
      index: index
    });
  };

  const closeDropdowns = () => {
    setShowRightClickMenu(null);
    setShowHistory(false);
  };

  useEffect(() => {
    window.addEventListener("click", closeDropdowns);
    return () => window.removeEventListener("click", closeDropdowns);
  }, []);

  const getBreadcrumbName = (index) => {
    if (index === -1) return "Root";
    if (index === folderHistory.length) return currentFolder?.name || "Current";
    return folderHistory[index]?.name || "";
  };

  return (
    <div style={styles.breadcrumbsContainer}>
      {currentFolder && (
        <button onClick={navigateBack} className="btn-icon" title="Go Back" style={{ marginRight: "10px" }}>
          <ArrowLeft size={16} />
        </button>
      )}

      <div style={styles.trail}>
        <span 
          onClick={() => navigateToBreadcrumb(-1)} 
          onContextMenu={(e) => handleRightClick(e, -1)}
          className="breadcrumb-link" 
          style={styles.link}
        >
          Root
        </span>
        {folderHistory.slice(1).map((hist, index) => (
          <React.Fragment key={hist._id || index}>
            <ChevronRight size={14} color="var(--text-secondary)" style={{ opacity: 0.6 }} />
            <span 
              onClick={() => navigateToBreadcrumb(index + 1)} 
              onContextMenu={(e) => handleRightClick(e, index + 1)}
              className="breadcrumb-link" 
              style={styles.link}
            >
              {hist.name}
            </span>
          </React.Fragment>
        ))}
        {currentFolder && (
          <>
            <ChevronRight size={14} color="var(--text-secondary)" style={{ opacity: 0.6 }} />
            <span 
              onContextMenu={(e) => handleRightClick(e, folderHistory.length)}
              style={styles.active}
            >
              {currentFolder.name}
            </span>
          </>
        )}

        {/* History Dropdown Trigger */}
        <div style={{ position: "relative", marginLeft: "10px" }}>
          <button 
            onClick={() => setShowHistory(!showHistory)} 
            className="btn-icon" 
            style={{ padding: "4px", display: "inline-flex", alignItems: "center", minWidth: 0 }}
            title="Folder History"
          >
            <ChevronDown size={14} />
          </button>

          {showHistory && (
            <div className="glass-panel" style={styles.dropdown}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={12} color="var(--primary)" />
                <span style={{ fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)" }}>Recently Visited</span>
              </div>
              {historyList.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>No visited folder history yet.</div>
              ) : (
                historyList.map(folder => (
                  <div 
                    key={folder._id} 
                    onClick={() => {
                      navigateToBreadcrumb(-2); // Special value to set custom folder
                      localStorage.setItem("aethervault_search_folder", JSON.stringify(folder));
                      window.dispatchEvent(new CustomEvent("refresh_files"));
                      setShowHistory(false);
                    }}
                    style={styles.dropdownItem}
                  >
                    <Folder size={12} style={{ color: "var(--primary)", marginRight: "6px" }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right-click Context Menu */}
      {showRightClickMenu && (
        <div 
          className="glass-panel context-menu"
          style={{
            position: "fixed",
            left: showRightClickMenu.x,
            top: showRightClickMenu.y,
            zIndex: 10002,
            padding: "4px 0",
            minWidth: "140px"
          }}
        >
          <div 
            onClick={() => {
              const name = getBreadcrumbName(showRightClickMenu.index);
              navigator.clipboard.writeText(name);
              toast.success(`Copied folder name: ${name}`);
            }}
            style={styles.menuItem}
          >
            Copy Name
          </div>
          <div 
            onClick={() => {
              const pathStr = showRightClickMenu.index === -1 ? "/" : "/" + folderHistory.slice(1, showRightClickMenu.index + 1).map(h => h.name).join("/") + "/" + getBreadcrumbName(showRightClickMenu.index);
              navigator.clipboard.writeText(pathStr);
              toast.success(`Copied path: ${pathStr}`);
            }}
            style={styles.menuItem}
          >
            Copy Path
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  breadcrumbsContainer: {
    display: "flex",
    alignItems: "center",
  },
  trail: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.9rem",
  },
  link: {
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontWeight: "500",
    transition: "color 0.2s ease",
  },
  active: {
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer"
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: "0",
    zIndex: 1000,
    background: "rgba(10, 10, 15, 0.95)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    minWidth: "180px",
    maxHeight: "240px",
    overflowY: "auto",
    marginTop: "6px",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)"
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    fontSize: "0.8rem",
    cursor: "pointer",
    color: "#fff",
    transition: "background 0.2s ease",
  },
  menuItem: {
    padding: "8px 12px",
    fontSize: "0.8rem",
    cursor: "pointer",
    color: "#fff",
    transition: "background 0.2s ease",
    textAlign: "left"
  }
};
