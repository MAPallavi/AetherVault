import React, { useState, useEffect } from "react";
import { api } from "./utils/api";
import DashboardPage from "./pages/Dashboard";
import FilesPage from "./pages/FilesPage";
import TrashPage from "./pages/TrashPage";
import LogsPage from "./pages/LogsPage";
import SettingsPage from "./pages/SettingsPage";
import PreviewModal from "./components/PreviewModal";
import Auth from "./components/Auth";
import { Loader2 } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import "./styles/app.css";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  // Tab navigation
  const [currentTab, setCurrentTab] = useState("dashboard");

  // Mobile sidebar open state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Media preview modal target
  const [previewFile, setPreviewFile] = useState(null);

  // Sidebar metrics refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    checkSession();
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
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
      // Delete -> Move to Trash
      if (e.key === "Delete") {
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_delete"));
      }
      // Esc -> Close Preview/Modals
      if (e.key === "Escape") {
        setPreviewFile(null);
        window.dispatchEvent(new CustomEvent("aethervault_shortcut_esc"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

      {/* Floating Media Preview modal overlay */}
      {previewFile && (
        <PreviewModal 
          file={previewFile} 
          onClose={() => setPreviewFile(null)} 
          onActionSuccess={triggerStatsRefresh}
        />
      )}
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
