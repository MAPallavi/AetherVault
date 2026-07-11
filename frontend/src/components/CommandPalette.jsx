import React, { useState, useEffect, useRef } from "react";
import { Search, Navigation, Zap, History, Loader2, ArrowRight } from "lucide-react";
import { api } from "../utils/api";
import { toast } from "react-hot-toast";

export default function CommandPalette({ isOpen, onClose, setCurrentTab }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState(() => {
    return JSON.parse(localStorage.getItem("aethervault_recent_commands") || '["/files", "/settings", "/insights"]');
  });

  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Live search for files when query is typed
  useEffect(() => {
    if (!query.trim() || query.startsWith("/")) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.listFiles(null, query);
        setResults(data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const saveRecentCommand = (cmd) => {
    const updated = [cmd, ...recent.filter(c => c !== cmd)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("aethervault_recent_commands", JSON.stringify(updated));
  };

  const executeCommand = (cmd) => {
    saveRecentCommand(cmd);
    onClose();

    if (cmd === "/dashboard" || cmd === "dashboard") {
      setCurrentTab("dashboard");
    } else if (cmd === "/files" || cmd === "files") {
      setCurrentTab("files");
    } else if (cmd === "/insights" || cmd === "insights") {
      setCurrentTab("insights");
    } else if (cmd === "/trash" || cmd === "trash" || cmd === "recycle bin") {
      setCurrentTab("trash");
    } else if (cmd === "/settings" || cmd === "settings") {
      setCurrentTab("settings");
    } else if (cmd === "/high-contrast") {
      const active = localStorage.getItem("aethervault_high_contrast") === "true";
      localStorage.setItem("aethervault_high_contrast", String(!active));
      document.documentElement.classList.toggle("high-contrast");
      toast.success(`High Contrast Mode ${!active ? "Enabled" : "Disabled"}`);
      window.location.reload();
    } else if (cmd === "/focus-outline") {
      const active = localStorage.getItem("aethervault_focus_outline") === "true";
      localStorage.setItem("aethervault_focus_outline", String(!active));
      document.documentElement.classList.toggle("accessibility-focus");
      toast.success(`Focus Outline Assistant ${!active ? "Enabled" : "Disabled"}`);
    }
  };

  if (!isOpen) return null;

  const showShortcuts = !query;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        zIndex: 999999
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "580px",
          background: "rgba(18, 22, 33, 0.95)",
          borderRadius: "14px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          overflow: "hidden"
        }}
      >
        {/* Search header bar */}
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Search size={18} color="var(--text-secondary)" style={{ marginRight: "12px" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command (e.g. /files) or search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flexGrow: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: "0.95rem"
            }}
          />
          <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.06)", padding: "3px 6px", borderRadius: "4px", color: "var(--text-secondary)" }}>
            ESC
          </span>
        </div>

        {/* Contents area */}
        <div style={{ padding: "12px", maxHeight: "360px", overflowY: "auto" }}>
          
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
              <Loader2 className="spinner" size={20} color="var(--primary)" />
            </div>
          )}

          {/* Quick shortcuts / Navigation */}
          {showShortcuts && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              
              {/* Navigation list */}
              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", marginLeft: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Vault Navigation
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                  <button onClick={() => executeCommand("/dashboard")} className="palette-item" style={styles.paletteItem}>
                    <Navigation size={14} color="var(--primary)" />
                    <span style={{ flexGrow: 1 }}>Go to Dashboard</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/dashboard</span>
                  </button>
                  <button onClick={() => executeCommand("/files")} className="palette-item" style={styles.paletteItem}>
                    <Navigation size={14} color="var(--primary)" />
                    <span style={{ flexGrow: 1 }}>Go to My Files</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/files</span>
                  </button>
                  <button onClick={() => executeCommand("/insights")} className="palette-item" style={styles.paletteItem}>
                    <Navigation size={14} color="var(--primary)" />
                    <span style={{ flexGrow: 1 }}>Open File Insights Console</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/insights</span>
                  </button>
                  <button onClick={() => executeCommand("/settings")} className="palette-item" style={styles.paletteItem}>
                    <Navigation size={14} color="var(--primary)" />
                    <span style={{ flexGrow: 1 }}>Open Settings Center</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/settings</span>
                  </button>
                </div>
              </div>

              {/* Utility Commands */}
              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", marginLeft: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  System Actions
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                  <button onClick={() => executeCommand("/high-contrast")} className="palette-item" style={styles.paletteItem}>
                    <Zap size={14} color="#ffd740" />
                    <span style={{ flexGrow: 1 }}>Toggle Accessibility High Contrast</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/high-contrast</span>
                  </button>
                  <button onClick={() => executeCommand("/focus-outline")} className="palette-item" style={styles.paletteItem}>
                    <Zap size={14} color="#ffd740" />
                    <span style={{ flexGrow: 1 }}>Toggle Accessibility Focus Outline Helper</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/focus-outline</span>
                  </button>
                </div>
              </div>

              {/* Recent Commands */}
              {recent.length > 0 && (
                <div>
                  <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", marginLeft: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Recent Searches
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                    {recent.map((cmd, index) => (
                      <button key={index} onClick={() => executeCommand(cmd)} className="palette-item" style={styles.paletteItem}>
                        <History size={14} color="var(--text-muted)" />
                        <span>{cmd}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Query search results */}
          {!showShortcuts && results.length > 0 && (
            <div>
              <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", marginLeft: "8px", textTransform: "uppercase" }}>
                Matching Vault Files
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                {results.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => {
                      saveRecentCommand(item.name);
                      onClose();
                      // Set search field globally in window state and trigger navigate to browser
                      localStorage.setItem("aethervault_search_folder", JSON.stringify(item.isFolder ? item : { _id: item.parentFolder, name: "Folder" }));
                      setCurrentTab("files");
                      window.dispatchEvent(new CustomEvent("refresh_files"));
                    }}
                    className="palette-item"
                    style={styles.paletteItem}
                  >
                    <FileText size={14} color="var(--primary)" />
                    <span style={{ flexGrow: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", textAlign: "left" }}>
                      {item.name}
                    </span>
                    <ArrowRight size={14} color="var(--text-muted)" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results placeholder */}
          {!showShortcuts && !loading && results.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              No commands or files matching "{query}" found.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const styles = {
  paletteItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    background: "none",
    border: "none",
    padding: "10px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    color: "var(--text-secondary)",
    fontSize: "0.82rem",
    transition: "all 0.15s ease",
    textAlign: "left"
  }
};
