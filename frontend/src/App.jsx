import React, { useState, useEffect, Suspense } from "react";
import { api } from "./utils/api";

const DashboardPage = React.lazy(() => import("./pages/Dashboard"));
const FilesPage = React.lazy(() => import("./pages/FilesPage"));
const TrashPage = React.lazy(() => import("./pages/TrashPage"));
const LogsPage = React.lazy(() => import("./pages/LogsPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const PreviewModal = React.lazy(() => import("./components/PreviewModal"));
import Auth from "./components/Auth";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
const SharedLinkPage = React.lazy(() => import("./pages/SharedLinkPage"));
const InsightsPage = React.lazy(() => import("./pages/InsightsPage"));
import CommandPalette from "./components/CommandPalette";
import "./styles/app.css";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [showIdleCountdown, setShowIdleCountdown] = useState(false);
  const [idleTimeRemaining, setIdleTimeRemaining] = useState(60);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Tab navigation
  const [currentTab, setCurrentTab] = useState("dashboard");

  // Mobile sidebar open state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Media preview modal target
  const [previewFile, setPreviewFile] = useState(null);

  // Sidebar metrics refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    checkSession();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K -> Toggle Command Palette
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
        return;
      }

      // Avoid triggering shortcuts when inside input/textarea fields
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        // Except Escape, which should blur the field or close dialogs
        if (e.key === "Escape") {
          document.activeElement.blur();
          window.dispatchEvent(new CustomEvent("aethervault_shortcut_esc"));
        }
        return;
      }

      // Ctrl+F -> Focus Search
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        document.getElementById("navbar-global-search")?.focus();
      }
      // Ctrl+U -> Upload
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_upload"));
      }
      // Ctrl+N -> New Folder
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_new_folder"));
      }
      // Delete -> Move to Trash / Shift+Delete -> Permanent Delete
      if (e.shiftKey && e.key === "Delete") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_permanent_delete"));
      } else if (e.key === "Delete") {
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_delete"));
      }
      // Esc -> Close Preview/Modals
      if (e.key === "Escape") {
        setPreviewFile(null);
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_esc"));
      }
      // Ctrl+A -> Select All
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_select_all"));
      }
      // Ctrl+C -> Copy
      if (e.ctrlKey && e.key === "c") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_copy"));
      }
      // Ctrl+X -> Cut
      if (e.ctrlKey && e.key === "x") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_cut"));
      }
      // Ctrl+V -> Paste
      if (e.ctrlKey && e.key === "v") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_paste"));
      }
      // F2 -> Rename
      if (e.key === "F2") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_rename"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Idle session countdown warning (14 minutes warning, 60 seconds countdown)
  useEffect(() => {
    if (!isAuthenticated) return;

    let warnTimeoutId;
    let countdownIntervalId;

    const resetTimer = () => {
      clearTimeout(warnTimeoutId);
      clearInterval(countdownIntervalId);
      setShowIdleCountdown(false);
      setIdleTimeRemaining(60);

      // Warning occurs at 14 minutes (14 * 60 * 1000)
      warnTimeoutId = setTimeout(() => {
        setShowIdleCountdown(true);
        let sec = 60;
        countdownIntervalId = setInterval(() => {
          sec--;
          setIdleTimeRemaining(sec);
          if (sec <= 0) {
            clearInterval(countdownIntervalId);
            handleLogout();
            toast("Logged out due to inactivity", { icon: "⏳" });
          }
        }, 1000);
      }, 14 * 60 * 1000);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    const handleActivity = () => {
      if (!showIdleCountdown) {
        resetTimer();
      }
    };
    
    events.forEach(event => window.addEventListener(event, handleActivity));

    resetTimer();

    return () => {
      clearTimeout(warnTimeoutId);
      clearInterval(countdownIntervalId);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [isAuthenticated, showIdleCountdown]);

  const checkSession = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUsername(data.username);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Session validation failed:", err.message);
      api.logout();
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (name) => {
    setUsername(name);
    setIsAuthenticated(true);
    setCurrentTab("dashboard");
    toast.success(`Logged in as ${name}`);
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setUsername("");
    toast.success("Logged out successfully");
  };

  const triggerStatsRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Public shared link routing interception
  if (window.location.pathname.startsWith("/shared/")) {
    return (
      <>
        <SharedLinkPage />
        <Toaster position="top-right" reverseOrder={false} />
      </>
    );
  }

  if (isOffline) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0e12", color: "#fff", padding: "20px" }}>
        <div className="glass-panel" style={{ maxWidth: "450px", width: "100%", padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", gap: "20px" }}>
          <AlertTriangle size={64} color="var(--danger)" style={{ margin: "0 auto" }} />
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "700", margin: 0 }}>You are Offline</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "8px" }}>
              Please check your network connection. AetherVault will reconnect automatically when you are back online.
            </p>
          </div>
          <button onClick={() => setIsOffline(!navigator.onLine)} className="btn btn-primary" style={{ display: "inline-flex", gap: "8px", alignSelf: "center" }}>
            <RefreshCw size={16} />
            <span>Check Connectivity</span>
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 className="spinner" size={48} color="#7C3AED" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Auth onAuthSuccess={handleAuthSuccess} />
        <Toaster position="top-right" reverseOrder={false} />
      </>
    );
  }

  // Common navigation props to feed into pages
  const pageProps = {
    currentTab,
    setCurrentTab,
    username,
    onLogout: handleLogout,
    refreshTrigger,
    isSidebarOpen,
    toggleSidebar,
  };

  return (
    <div style={{ height: "100vh", overflow: "hidden" }}>
      <Toaster position="top-right" reverseOrder={false} />

      <Suspense fallback={
        <div style={styles.loadingContainer}>
          <Loader2 className="spinner" size={48} color="#7C3AED" />
        </div>
      }>
        {currentTab === "dashboard" && (
          <DashboardPage 
            {...pageProps} 
            onPreviewSelect={setPreviewFile} 
          />
        )}

        {currentTab === "files" && (
          <FilesPage
            {...pageProps}
            onActionSuccess={triggerStatsRefresh}
            onPreviewSelect={setPreviewFile}
          />
        )}

        {currentTab === "trash" && <TrashPage {...pageProps} onActionSuccess={triggerStatsRefresh} />}

        {currentTab === "logs" && <LogsPage {...pageProps} />}

        {currentTab === "settings" && <SettingsPage {...pageProps} />}

        {currentTab === "insights" && <InsightsPage {...pageProps} />}

        {/* Floating Media Preview modal overlay */}
        {previewFile && (
          <PreviewModal 
            file={previewFile} 
            onClose={() => setPreviewFile(null)} 
            onActionSuccess={triggerStatsRefresh}
          />
        )}
      </Suspense>
      {/* Session timeout warning countdown modal */}
      {showIdleCountdown && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100000, padding: "20px" }}>
          <div className="glass-panel" style={{ maxWidth: "400px", width: "100%", padding: "30px", textAlign: "center", display: "flex", flexDirection: "column", gap: "20px", border: "1px solid var(--primary-light)" }}>
            <AlertTriangle size={48} color="var(--warning)" style={{ margin: "0 auto" }} />
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#fff" }}>Inactivity Warning</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "8px" }}>
                You have been inactive. You will be logged out in <strong style={{ color: "var(--primary)" }}>{idleTimeRemaining}</strong> seconds.
              </p>
            </div>
            <button
              onClick={() => {
                setShowIdleCountdown(false);
              }}
              className="btn btn-primary"
            >
              Stay Logged In
            </button>
          </div>
        </div>
      )}

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        setCurrentTab={setCurrentTab}
      />
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    alignItems: "center",
    justifyContent: "center",
    background: "#0B1120",
  },
};
