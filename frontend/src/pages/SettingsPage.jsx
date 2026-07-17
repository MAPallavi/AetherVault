import React, { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import { api } from "../utils/api";
import SettingsSkeleton from "../components/settings/SettingsSkeleton";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Bell,
  HardDrive,
  Info,
  Palette,
  Laptop,
  Check,
  Github,
  FolderOpen,
  ArrowRight,
  FileText,
  ToggleLeft,
  ToggleRight,
  Settings,
  Heart,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminHealth from "../components/settings/AdminHealth";
import AdminPanel from "../components/settings/AdminPanel";

export default function SettingsPage({
  currentTab,
  setCurrentTab,
  username,
  onLogout,
  refreshTrigger,
  isSidebarOpen,
  toggleSidebar,
  onPreviewSelect,
}) {
  const { user, updateProfile, deleteAccount, downloadData } = useAuth();
  const { theme: activeTheme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState("profile");

  // SECTION 1: Profile specs states
  const [profileUsername, setProfileUsername] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");

  useEffect(() => {
    if (user) {
      setProfileUsername(user.username || "");
      setProfileDisplayName(user.fullName || user.username || "");
      setProfileEmail(user.email || "");
      setProfileAvatar(user.avatar || "");
    }
  }, [user]);

  // SECTION 2: Appearance & Accents
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("aethervault_theme") || "dark";
  });
  const [accent, setAccent] = useState(() => {
    return localStorage.getItem("aethervault_accent") || "Purple";
  });

  // SECTION 3: Security & Change Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // SECTION 5: Two-Factor UI
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    return localStorage.getItem("aethervault_2fa") === "true";
  });

  // SECTION 7: Notification switches
  const [notifyUpload, setNotifyUpload] = useState(() => {
    return localStorage.getItem("notify_upload") !== "false";
  });
  const [notifyDelete, setNotifyDelete] = useState(() => {
    return localStorage.getItem("notify_delete") !== "false";
  });
  const [notifySecurity, setNotifySecurity] = useState(() => {
    return localStorage.getItem("notify_security") !== "false";
  });
  const [notifyUpdates, setNotifyUpdates] = useState(() => {
    return localStorage.getItem("notify_updates") === "true";
  });

  // SECTION 8: Application Preferences
  const [prefView, setPrefView] = useState(() => {
    return localStorage.getItem("aethervault_view_mode") || "grid";
  });
  const [prefSort, setPrefSort] = useState(() => {
    return localStorage.getItem("pref_sort") || "name";
  });
  const [prefLang, setPrefLang] = useState("en");
  const [prefAutoRefresh, setPrefAutoRefresh] = useState(() => {
    return localStorage.getItem("pref_autorefresh") !== "false";
  });
  const [prefRememberSidebar, setPrefRememberSidebar] = useState(() => {
    return localStorage.getItem("pref_remember_sidebar") === "true";
  });
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem("aethervault_high_contrast") === "true";
  });
  const [focusOutline, setFocusOutline] = useState(() => {
    return localStorage.getItem("aethervault_focus_outline") === "true";
  });

  // Alerts
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [updating, setUpdating] = useState(false);

  // Storage data states
  const [storageStats, setStorageStats] = useState(null);
  const [largestFolders, setLargestFolders] = useState([]);
  const [largestFile, setLargestFile] = useState(null);
  const [unusedFiles, setUnusedFiles] = useState([]);

  // Active Sessions mockup state
  const [sessions, setSessions] = useState([
    { id: 1, device: "Chrome / Windows 11 Laptop", ip: "192.168.1.5", location: "Mumbai, India", loginTime: "July 6, 2026, 4:12 PM", active: true },
    { id: 2, device: "Safari / Apple iPad Pro", ip: "192.168.1.12", location: "Home Wifi", loginTime: "July 6, 2026, 2:42 PM", active: false },
    { id: 3, device: "Mobile App / iPhone 15", ip: "103.45.2.89", location: "Cell Tower Session", loginTime: "July 5, 2026, 11:15 AM", active: false },
  ]);

  const accents = [
    { name: "Purple", primary: "#7C3AED", light: "#9F67FF" },
    { name: "Blue", primary: "#2563EB", light: "#60A5FA" },
    { name: "Green", primary: "#059669", light: "#34D399" },
    { name: "Orange", primary: "#EA580C", light: "#FB923C" },
  ];

  useEffect(() => {
    loadSettingsData();
  }, []);

  // Sync Accent variables to DOM root styles & save
  useEffect(() => {
    const selectedAccent = accents.find((a) => a.name === accent) || accents[0];
    document.documentElement.style.setProperty("--primary", selectedAccent.primary);
    document.documentElement.style.setProperty("--primary-light", selectedAccent.light);
    localStorage.setItem("aethervault_accent", accent);
  }, [accent]);

  // Sync Theme variables to DOM root styles & save
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light-theme");
    } else if (theme === "dark") {
      root.classList.remove("light-theme");
    } else {
      const isSystemLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      if (isSystemLight) {
        root.classList.add("light-theme");
      } else {
        root.classList.remove("light-theme");
      }
    }
  }, [theme]);

  // Sync Accessibility configurations to DOM root
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
    localStorage.setItem("aethervault_high_contrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    if (focusOutline) {
      document.documentElement.classList.add("accessibility-focus");
    } else {
      document.documentElement.classList.remove("accessibility-focus");
    }
    localStorage.setItem("aethervault_focus_outline", focusOutline);
  }, [focusOutline]);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const [analytics, files] = await Promise.all([
        api.getAnalytics(),
        api.listFiles(null, "."), // Global listing
      ]);
      setStorageStats(analytics);

      // Recursive Folders calculation
      const folders = files.filter((f) => f.isFolder);
      const fileList = files.filter((f) => !f.isFolder);

      const calculatedFolders = folders.map((folder) => {
        let size = 0;
        const addSizeRecursive = (fId) => {
          const directFiles = fileList.filter((f) => f.parentFolder === fId);
          directFiles.forEach((f) => (size += f.size));

          const subfolders = folders.filter((f) => f.parentFolder === fId);
          subfolders.forEach((sf) => addSizeRecursive(sf._id));
        };
        addSizeRecursive(folder._id);
        return {
          _id: folder._id,
          name: folder.name,
          size,
        };
      });

      setLargestFolders(calculatedFolders.sort((a, b) => b.size - a.size).slice(0, 3));

      // Unused/Old files calculation (haven't been modified in the last 30 days)
      const unused = fileList.filter((f) => {
        const diff = new Date() - new Date(f.updatedAt);
        return diff > 30 * 24 * 60 * 60 * 1000;
      });
      setUnusedFiles(unused.sort((a, b) => b.size - a.size).slice(0, 5));

      // Largest File listing
      if (fileList.length > 0) {
        const sortedFiles = [...fileList].sort((a, b) => b.size - a.size);
        setLargestFile(sortedFiles[0]);
      }
    } catch (err) {
      console.error("Failed to load settings data", err);
    } finally {
      setLoading(false);
    }
  };

  // Section 1: Profile saving
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const trimmedName = profileDisplayName.trim();
    const trimmedEmail = profileEmail.trim();

    if (!trimmedName) {
      setErrorMsg("Display name cannot be empty.");
      toast.error("Display name cannot be empty.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      toast.error("Please enter a valid email address.");
      return;
    }

    setUpdating(true);
    try {
      await updateProfile({
        fullName: trimmedName,
        email: trimmedEmail,
        avatar: profileAvatar.trim()
      });
      setSuccessMsg("Profile information saved successfully.");
      toast.success("Profile information saved successfully.");
    } catch (err) {
      setErrorMsg(err.message || "Failed to update profile settings.");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelProfile = () => {
    if (user) {
      setProfileDisplayName(user.fullName || user.username || "");
      setProfileEmail(user.email || "");
      setProfileAvatar(user.avatar || "");
    }
    setSuccessMsg("");
    setErrorMsg("");
  };

  // Section 2: Themes Toggling
  const handleThemeChange = async (newTheme) => {
    setThemeState(newTheme);
    setTheme(newTheme);
    localStorage.setItem("aethervault_theme", newTheme);
    try {
      await api.logSettingsChange(`UI Theme updated to: ${newTheme}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Section 3: Password Update
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const checklist = getPasswordChecks(newPassword);
    if (!Object.values(checklist).every((met) => met)) {
      setErrorMsg("Password strength validation checks failed.");
      toast.error("Password strength validation checks failed.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Confirm passwords do not match.");
      toast.error("Confirm passwords do not match.");
      return;
    }

    setUpdating(true);
    const toastId = toast.loading("Updating password credentials...");
    try {
      if (!navigator.onLine) {
        throw new Error("You are currently offline. Please check connectivity and retry.");
      }
      await api.changePassword(currentPassword, newPassword);
      setSuccessMsg("Security credentials saved successfully.");
      toast.success("Security credentials saved successfully.", { id: toastId });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errMsg = err.message || "Failed to update security credentials.";
      setErrorMsg(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setUpdating(false);
    }
  };

  const getPasswordChecks = (pwd) => {
    return {
      minLength: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      specialChar: /[^A-Za-z0-9]/.test(pwd),
    };
  };

  const checks = getPasswordChecks(newPassword);

  // Section 4: Device logs
  const revokeSession = (id) => {
    setSessions(sessions.filter((s) => s.id !== id));
  };

  const logoutOtherSessions = () => {
    setSessions(sessions.filter((s) => s.active));
    alert("Revoked access tokens for all secondary sessions.");
  };

  const logoutAllDevices = () => {
    alert("Revoking all active device session keys.");
    onLogout();
  };

  // Section 5: 2FA Toggle
  const handleToggle2FA = () => {
    const nextVal = !twoFactorEnabled;
    setTwoFactorEnabled(nextVal);
    localStorage.setItem("aethervault_2fa", nextVal);
  };

  // Section 7: Notifications toggles
  const handleNotifyToggle = (type, val) => {
    if (type === "upload") {
      setNotifyUpload(val);
      localStorage.setItem("notify_upload", val);
    } else if (type === "delete") {
      setNotifyDelete(val);
      localStorage.setItem("notify_delete", val);
    } else if (type === "security") {
      setNotifySecurity(val);
      localStorage.setItem("notify_security", val);
    } else if (type === "updates") {
      setNotifyUpdates(val);
      localStorage.setItem("notify_updates", val);
    }
  };

  // Section 8: Preference selections
  const handlePreferenceSave = (key, val) => {
    if (key === "view") {
      setPrefView(val);
      localStorage.setItem("aethervault_view_mode", val);
    } else if (key === "sort") {
      setPrefSort(val);
      localStorage.setItem("pref_sort", val);
    } else if (key === "lang") {
      setPrefLang(val);
    } else if (key === "refresh") {
      setPrefAutoRefresh(val);
      localStorage.setItem("pref_autorefresh", val);
    } else if (key === "sidebar") {
      setPrefRememberSidebar(val);
      localStorage.setItem("pref_remember_sidebar", val);
    }
  };

  const handleExportConfig = () => {
    const config = {
      theme: localStorage.getItem("aethervault_theme") || "dark",
      accent: localStorage.getItem("aethervault_accent") || "Purple",
      viewMode: localStorage.getItem("aethervault_view_mode") || "grid",
      sort: localStorage.getItem("pref_sort") || "name",
      autoRefresh: localStorage.getItem("pref_autorefresh") !== "false",
      rememberSidebar: localStorage.getItem("pref_remember_sidebar") === "true",
      highContrast: localStorage.getItem("aethervault_high_contrast") === "true",
      focusOutline: localStorage.getItem("aethervault_focus_outline") === "true"
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(config, null, 2))}`;
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", "aethervault_config.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessMsg("Configuration exported successfully.");
  };

  const handleImportConfig = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target.result);
        if (config.theme) {
          setTheme(config.theme);
          localStorage.setItem("aethervault_theme", config.theme);
        }
        if (config.accent) {
          setAccent(config.accent);
          localStorage.setItem("aethervault_accent", config.accent);
        }
        if (config.viewMode) {
          setPrefView(config.viewMode);
          localStorage.setItem("aethervault_view_mode", config.viewMode);
        }
        if (config.sort) {
          setPrefSort(config.sort);
          localStorage.setItem("pref_sort", config.sort);
        }
        if (config.autoRefresh !== undefined) {
          setPrefAutoRefresh(config.autoRefresh);
          localStorage.setItem("pref_autorefresh", String(config.autoRefresh));
        }
        if (config.rememberSidebar !== undefined) {
          setPrefRememberSidebar(config.rememberSidebar);
          localStorage.setItem("pref_remember_sidebar", String(config.rememberSidebar));
        }
        if (config.highContrast !== undefined) {
          setHighContrast(config.highContrast);
          localStorage.setItem("aethervault_high_contrast", String(config.highContrast));
        }
        if (config.focusOutline !== undefined) {
          setFocusOutline(config.focusOutline);
          localStorage.setItem("aethervault_focus_outline", String(config.focusOutline));
        }
        setSuccessMsg("Configuration imported successfully. Reloading theme settings...");
      } catch (err) {
        setErrorMsg("Failed to parse config file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Browser & OS parser from User Agent
  const getBrowserDetails = () => {
    const ua = navigator.userAgent;
    let browser = "Web Browser";
    let os = "Desktop OS";

    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";

    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Macintosh")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";

    return { browser, os };
  };

  const currentDevice = getBrowserDetails();

  const subTabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "workspaces", label: "My Workspaces", icon: FolderOpen },
    { id: "invitations", label: "Invitations", icon: ArrowRight },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "sharing-defaults", label: "Sharing Defaults", icon: Info },
    { id: "storage", label: "Storage details", icon: HardDrive },
    { id: "preferences", label: "Preferences", icon: Settings },
    { id: "health", label: "System Health", icon: Heart },
    ...(user?.role === 'Admin' ? [{ id: "admin-panel", label: "Admin Panel", icon: Shield }] : []),
    { id: "about", label: "About AetherVault", icon: Info },
  ];

  const CAPACITY = storageStats?.storageLimit || 10 * 1024 * 1024 * 1024; // Use user limit or default 10GB
  const usedSize = storageStats?.storageUsed || storageStats?.totalSize || 0;
  const freeSize = Math.max(CAPACITY - usedSize, 0);
  const percentUsed = Math.min((usedSize / CAPACITY) * 100, 100);

  if (loading) {
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
        <SettingsSkeleton />
      </MainLayout>
    );
  }

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
      <div className="settings-page-container fade">
        <div>
          <h2 className="settings-title">
            Vault Settings Center
          </h2>
          <p className="settings-subtitle">
            Adjust secure profile information, color aesthetics, password validation checklists, and app options
          </p>
        </div>

        <div className="settings-layout">
          {/* Tabs Menu */}
          <div className="settings-sidebar">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveSubTab(tab.id);
                    setSuccessMsg("");
                    setErrorMsg("");
                  }}
                  className={`nav-item ${isActive ? "active" : ""}`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          <div className="settings-content-card glass">
            <AnimatePresence mode="wait">
              {/* TAB 1: PROFILE */}
              {activeSubTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <div>
                    <h3 className="dashboard-panel-title">Profile Configuration</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Modify public identifiers, emails, and audit profile status.</p>
                  </div>

                  {successMsg && <div className="success-alert">{successMsg}</div>}

                  {/* Premium Profile Card */}
                  <div className="profile-premium-card">
                    <div className="profile-avatar-big" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {profileAvatar ? (
                        <img src={profileAvatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        profileUsername ? profileUsername.charAt(0).toUpperCase() : ""
                      )}
                    </div>
                    <div className="profile-text-info">
                      <h4 className="profile-text-name">{profileDisplayName}</h4>
                      <span className="profile-text-sub">Member: @{profileUsername}</span>
                    </div>

                    <div className="profile-details-list">
                      <div className="profile-detail-item">
                        <span className="profile-detail-label">Status</span>
                        <span className="profile-detail-val" style={{ color: "var(--success)" }}>Active Security</span>
                      </div>
                      <div className="profile-detail-item">
                        <span className="profile-detail-label">Created At</span>
                        <span className="profile-detail-val">July 3, 2026</span>
                      </div>
                      <div className="profile-detail-item">
                        <span className="profile-detail-label">Last Login</span>
                        <span className="profile-detail-val">Today</span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="settings-form">
                    <div className="settings-form-group">
                      <label className="settings-label">Username (Read-only)</label>
                      <input
                        type="text"
                        className="input-field"
                        value={profileUsername}
                        disabled
                      />
                    </div>
                    <div className="settings-form-group">
                      <label className="settings-label">Display Name</label>
                      <input
                        type="text"
                        className="input-field"
                        value={profileDisplayName}
                        onChange={(e) => setProfileDisplayName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="settings-form-group">
                      <label className="settings-label">Email Address</label>
                      <input
                        type="email"
                        className="input-field"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="settings-form-group">
                      <label className="settings-label">Avatar URL</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="https://example.com/avatar.jpg"
                        value={profileAvatar}
                        onChange={(e) => setProfileAvatar(e.target.value)}
                      />
                    </div>

                    <div className="btn-group">
                      <button type="submit" className="btn-purple" disabled={updating}>
                        {updating ? "Saving..." : "Save Details"}
                      </button>
                      <button type="button" onClick={handleCancelProfile} className="btn-gray">
                        Cancel
                      </button>
                    </div>
                  </form>

                  <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <h4 style={{ color: "#fff", fontSize: "0.95rem", margin: "0 0 10px 0" }}>Account Management</h4>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={downloadData}
                        className="btn btn-primary"
                        style={{ background: "var(--success)" }}
                      >
                        📥 Download My Data
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const confirm = window.confirm("Are you absolutely sure you want to delete your account? All your files, folders, favorites, tags, logs, and comments will be permanently erased. This cannot be undone.");
                          if (confirm) deleteAccount();
                        }}
                        className="btn"
                        style={{ background: "var(--danger)", color: "#fff" }}
                      >
                        ❌ Delete Account
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: APPEARANCE */}
              {activeSubTab === "appearance" && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <div>
                    <h3 className="dashboard-panel-title">Appearance & Color Accents</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Choose theme settings and accent color styles.</p>
                  </div>

                  <div className="theme-selector-grid">
                    {/* Dark Preview */}
                    <div
                      onClick={() => handleThemeChange("dark")}
                      className={`theme-card-block ${theme === "dark" ? "active" : ""}`}
                      style={{ background: "#0f121d" }}
                    >
                      <div className="theme-preview-top">
                        <div className="theme-preview-line" style={{ background: "rgba(255,255,255,0.2)" }}></div>
                      </div>
                      <div className="theme-preview-body">
                        <div className="theme-preview-block-left" style={{ background: "rgba(255,255,255,0.03)" }}></div>
                        <div className="theme-preview-block-right" style={{ background: "rgba(255,255,255,0.01)" }}></div>
                      </div>
                      <div className="theme-card-footer-label">
                        <span style={{ color: "#fff" }}>Dark Theme</span>
                        {theme === "dark" && <Check size={14} color="var(--primary)" />}
                      </div>
                    </div>

                    {/* Light Preview */}
                    <div
                      onClick={() => handleThemeChange("light")}
                      className={`theme-card-block ${theme === "light" ? "active" : ""}`}
                      style={{ background: "#f3f4f6" }}
                    >
                      <div className="theme-preview-top">
                        <div className="theme-preview-line" style={{ background: "rgba(0,0,0,0.2)" }}></div>
                      </div>
                      <div className="theme-preview-body">
                        <div className="theme-preview-block-left" style={{ background: "rgba(0,0,0,0.04)" }}></div>
                        <div className="theme-preview-block-right" style={{ background: "rgba(0,0,0,0.02)" }}></div>
                      </div>
                      <div className="theme-card-footer-label">
                        <span style={{ color: "#0f172a" }}>Light Theme</span>
                        {theme === "light" && <Check size={14} color="var(--primary)" />}
                      </div>
                    </div>

                    {/* System Default */}
                    <div
                      onClick={() => handleThemeChange("system")}
                      className={`theme-card-block ${theme === "system" ? "active" : ""}`}
                      style={{ background: "linear-gradient(to right, #0f121d 50%, #f3f4f6 50%)" }}
                    >
                      <div className="theme-preview-top">
                        <div className="theme-preview-line" style={{ background: "rgba(255,255,255,0.2)" }}></div>
                      </div>
                      <div className="theme-preview-body">
                        <div className="theme-preview-block-left" style={{ background: "var(--primary)", opacity: 0.15 }}></div>
                        <div className="theme-preview-block-right" style={{ background: "rgba(255,255,255,0.02)" }}></div>
                      </div>
                      <div className="theme-card-footer-label">
                        <span style={{ color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 6px", borderRadius: "4px" }}>System Theme</span>
                        {theme === "system" && <Check size={14} color="var(--primary)" />}
                      </div>
                    </div>
                  </div>

                  <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.05)" }}></div>

                  {/* Accent Color Chooser */}
                  <div>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "0.95rem" }}>System Accent Color</h4>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Choose the application indicator highlight tone.</p>
                    
                    <div className="accent-colors-row">
                      {accents.map((acc) => (
                        <button
                          key={acc.name}
                          onClick={() => setAccent(acc.name)}
                          className={`accent-btn ${accent === acc.name ? "active" : ""}`}
                          style={{ backgroundColor: acc.primary }}
                          title={`${acc.name} Theme`}
                        >
                          {accent === acc.name && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: SECURITY */}
              {activeSubTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <div>
                    <h3 className="dashboard-panel-title">Credentials & Change Password</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Update password parameters and manage active device sessions.</p>
                  </div>

                  {errorMsg && <div className="error-alert">{errorMsg}</div>}
                  {successMsg && <div className="success-alert">{successMsg}</div>}

                  <form onSubmit={handlePasswordUpdate} className="settings-form">
                    <div className="settings-form-group">
                      <label className="settings-label">Current Password</label>
                      <div className="settings-input-wrapper">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          className="input-field"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="settings-eye-btn"
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="settings-form-group">
                      <label className="settings-label">New Password</label>
                      <div className="settings-input-wrapper">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          className="input-field"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="settings-eye-btn"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Password check validations */}
                      {newPassword && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "10px 0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Password Strength:</span>
                            <strong style={{ color: Object.values(checks).filter(Boolean).length >= 5 ? "var(--success)" : Object.values(checks).filter(Boolean).length >= 3 ? "var(--warning)" : "var(--danger)" }}>
                              {Object.values(checks).filter(Boolean).length >= 5 ? "Strong" : Object.values(checks).filter(Boolean).length >= 3 ? "Medium" : "Weak"}
                            </strong>
                          </div>
                          <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                            <div style={{ height: "100%", background: Object.values(checks).filter(Boolean).length >= 5 ? "var(--success)" : Object.values(checks).filter(Boolean).length >= 3 ? "var(--warning)" : "var(--danger)", width: `${(Object.values(checks).filter(Boolean).length / 5) * 100}%`, transition: "all 0.3s ease" }}></div>
                          </div>
                        </div>
                      )}

                      {newPassword && (
                        <div className="password-check-list">
                          <div className={`password-check-item ${checks.minLength ? "met" : "unmet"}`}>
                            <Check size={12} /> <span>Min 8 characters</span>
                          </div>
                          <div className={`password-check-item ${checks.uppercase ? "met" : "unmet"}`}>
                            <Check size={12} /> <span>1 Uppercase (A-Z)</span>
                          </div>
                          <div className={`password-check-item ${checks.lowercase ? "met" : "unmet"}`}>
                            <Check size={12} /> <span>1 Lowercase (a-z)</span>
                          </div>
                          <div className={`password-check-item ${checks.number ? "met" : "unmet"}`}>
                            <Check size={12} /> <span>1 Number (0-9)</span>
                          </div>
                          <div className={`password-check-item ${checks.specialChar ? "met" : "unmet"}`}>
                            <Check size={12} /> <span>1 Special char</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="settings-form-group">
                      <label className="settings-label">Confirm New Password</label>
                      <input
                        type="password"
                        className="input-field"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="btn-group">
                      <button type="submit" className="btn-purple" disabled={updating}>
                        {updating ? "Saving..." : "Change Password"}
                      </button>
                    </div>
                  </form>

                  <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.05)" }}></div>

                  {/* Active Sessions UI */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                      <h4 style={{ margin: 0, color: "#fff", fontSize: "0.95rem" }}>Device Sessions</h4>
                      <div className="btn-group" style={{ marginTop: 0 }}>
                        <button onClick={logoutOtherSessions} className="btn-gray" style={{ fontSize: "0.8rem", padding: "8px 16px" }}>
                          Logout Others
                        </button>
                        <button onClick={logoutAllDevices} className="btn-gray" style={{ fontSize: "0.8rem", padding: "8px 16px", color: "var(--danger)" }}>
                          Logout All Devices
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Current active session */}
                      <div className="session-row">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <Laptop size={18} color="var(--success)" />
                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                              {currentDevice.browser} / {currentDevice.os}
                              <span className="session-device-badge">Current Session</span>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                              IP: 192.168.1.1 (Local) • Location: India • Active now
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mock secondary sessions */}
                      {sessions.filter(s => !s.active).map((session) => (
                        <div key={session.id} className="session-row">
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <Laptop size={18} color="var(--text-secondary)" />
                            <div>
                              <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>
                                {session.device}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                IP: {session.ip} • Location: {session.location} • Last active {session.loginTime}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => revokeSession(session.id)} className="btn-gray" style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: TWO FACTOR AUTH */}
              {activeSubTab === "security" && (
                <motion.div
                  key="2fa"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                  style={{ marginTop: "24px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ margin: 0, color: "#fff", fontSize: "0.95rem" }}>Two-Factor Authentication (2FA)</h4>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Enable key generation security codes to log in.</p>
                    </div>
                    <span className="badge-coming-soon">Coming Soon</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={handleToggle2FA}
                      style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
                    >
                      {twoFactorEnabled ? (
                        <ToggleRight size={38} color="var(--primary)" />
                      ) : (
                        <ToggleLeft size={38} color="var(--text-secondary)" />
                      )}
                    </button>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                      {twoFactorEnabled ? "2FA Protection Enabled" : "2FA Protection Disabled"}
                    </span>
                  </div>

                  {twoFactorEnabled && (
                    <div className="twofa-preview-box fade">
                      {/* QR Placeholder */}
                      <div className="qr-placeholder">
                        <svg width="84" height="84" viewBox="0 0 100 100">
                          {/* Mock QR pattern */}
                          <rect x="5" y="5" width="25" height="25" fill="#111" />
                          <rect x="10" y="10" width="15" height="15" fill="#fff" />
                          <rect x="70" y="5" width="25" height="25" fill="#111" />
                          <rect x="75" y="10" width="15" height="15" fill="#fff" />
                          <rect x="5" y="70" width="25" height="25" fill="#111" />
                          <rect x="10" y="75" width="15" height="15" fill="#fff" />
                          <rect x="35" y="10" width="10" height="20" fill="#111" />
                          <rect x="50" y="25" width="15" height="10" fill="#111" />
                          <rect x="35" y="50" width="20" height="15" fill="#111" />
                          <rect x="60" y="60" width="10" height="20" fill="#111" />
                          <rect x="40" y="80" width="30" height="10" fill="#111" />
                        </svg>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, minWidth: "200px" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "500" }}>
                          Scan this QR code with Google Authenticator or Authy to configure 2FA tokens.
                        </span>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "600" }}>RECOVERY CODES</span>
                          <div className="recovery-codes-box">
                            <span>AV-8492-9182</span>
                            <span>AV-1049-7681</span>
                            <span>AV-3902-1249</span>
                            <span>AV-0928-8241</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 5: NOTIFICATIONS */}
              {activeSubTab === "notifications" && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <div>
                    <h3 className="dashboard-panel-title">Notification Settings</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Manage workspace warning alerts and email reports.</p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "500px" }}>
                    <div className="switch-row">
                      <div>
                        <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem" }}>Upload Notifications</h4>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Alert upon successful upload and ciphering of files.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifyUpload}
                        onChange={(e) => handleNotifyToggle("upload", e.target.checked)}
                        className="checkbox"
                      />
                    </div>

                    <div className="switch-row">
                      <div>
                        <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem" }}>Delete Confirmations</h4>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Prompt alert dialogue validations when shifting items to Recycle Bin.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifyDelete}
                        onChange={(e) => handleNotifyToggle("delete", e.target.checked)}
                        className="checkbox"
                      />
                    </div>

                    <div className="switch-row">
                      <div>
                        <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem" }}>Security Alerts</h4>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Alert instantly upon new device registrations or failed locks.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifySecurity}
                        onChange={(e) => handleNotifyToggle("security", e.target.checked)}
                        className="checkbox"
                      />
                    </div>

                    <div className="switch-row">
                      <div>
                        <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem" }}>System Updates</h4>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Get notified when new builds of AetherVault are deployed.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifyUpdates}
                        onChange={(e) => handleNotifyToggle("updates", e.target.checked)}
                        className="checkbox"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 6: STORAGE */}
              {activeSubTab === "storage" && (
                <motion.div
                  key="storage"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <div>
                    <h3 className="dashboard-panel-title">Storage Information</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Overview of storage spaces and folder sizes.</p>
                  </div>

                  <div className="storage-stats-box">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: "600" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Used space</span>
                      <span style={{ color: "#fff" }}>{formatSize(usedSize)} of {formatSize(CAPACITY)}</span>
                    </div>

                    <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden", margin: "10px 0" }}>
                      <div style={{ height: "100%", width: `${percentUsed}%`, background: "linear-gradient(to right, var(--primary), var(--primary-light))", borderRadius: "4px" }}></div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      <span>{percentUsed.toFixed(1)}% Used</span>
                      <span>{formatSize(freeSize)} Free</span>
                    </div>
                  </div>

                  {/* Category Breakdown Progress Bars */}
                  {storageStats?.categories && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <h4 style={{ margin: "0 0 6px 0", color: "#fff", fontSize: "0.95rem" }}>Category Space Utilization</h4>
                      {Object.entries(storageStats.categories).map(([category, stats]) => {
                        const catPercent = Math.min((stats.size / CAPACITY) * 100, 100);
                        return (
                          <div key={category} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                              <span style={{ color: "#fff", textTransform: "capitalize" }}>{category} ({stats.count} files)</span>
                              <span style={{ color: "var(--text-secondary)" }}>{formatSize(stats.size)}</span>
                            </div>
                            <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${catPercent}%`, background: "var(--primary)" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <h4 style={{ margin: "6px 0", color: "#fff", fontSize: "0.95rem" }}>Capacity Indicators</h4>

                    {/* Display Largest File */}
                    {largestFile && (
                      <div className="folder-row" style={{ cursor: "default" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <FileText size={16} color="var(--primary)" />
                          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>Largest File: {largestFile.name}</span>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatSize(largestFile.size)}</span>
                      </div>
                    )}

                    {/* Display Largest Folder */}
                    {largestFolders.length > 0 && (
                      <div className="folder-row" style={{ cursor: "default" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <FolderOpen size={16} color="var(--primary)" />
                          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>Largest Folder: {largestFolders[0].name}</span>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatSize(largestFolders[0].size)}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.05)" }}></div>

                  {/* Largest Folders List */}
                  <div>
                    <h4 style={{ margin: "0 0 14px 0", color: "#fff", fontSize: "0.95rem" }}>Top Directory Folders</h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {largestFolders.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>No folders created yet.</div>
                      ) : (
                        largestFolders.map((folder) => (
                          <div key={folder._id} className="folder-row" onClick={() => setCurrentTab("files")}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <FolderOpen size={16} color="var(--primary)" />
                              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>{folder.name}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatSize(folder.size)}</span>
                              <ArrowRight size={12} color="var(--text-secondary)" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Unused / Old Files list */}
                  {unusedFiles.length > 0 && (
                    <div>
                      <h4 style={{ margin: "14px 0", color: "#fff", fontSize: "0.95rem" }}>Unused Files (No edits in last 30 days)</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {unusedFiles.map(file => (
                          <div key={file._id} className="folder-row" style={{ cursor: "default" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <FileText size={16} color="var(--primary)" />
                              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>{file.name}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatSize(file.size)}</span>
                              <span style={{ fontSize: "0.7rem", color: "var(--warning)", background: "rgba(234, 88, 12, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>Unused</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 7: PREFERENCES */}
              {activeSubTab === "preferences" && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <div>
                    <h3 className="dashboard-panel-title">Application Preferences</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Adjust default sorting orders, language targets, and locks.</p>
                  </div>

                  <div className="preference-grid">
                    <div className="settings-form-group">
                      <label className="settings-label">Default Explorer Layout</label>
                      <select
                        className="input-field"
                        value={prefView}
                        onChange={(e) => handlePreferenceSave("view", e.target.value)}
                      >
                        <option value="grid">Grid View</option>
                        <option value="list">List View</option>
                      </select>
                    </div>

                    <div className="settings-form-group">
                      <label className="settings-label">Default Sorting Parameter</label>
                      <select
                        className="input-field"
                        value={prefSort}
                        onChange={(e) => handlePreferenceSave("sort", e.target.value)}
                      >
                        <option value="name">Name (Ascending)</option>
                        <option value="size">File Size</option>
                        <option value="date">Modification Date</option>
                      </select>
                    </div>

                    <div className="settings-form-group">
                      <label className="settings-label">Language Coordinate</label>
                      <select
                        className="input-field"
                        value={prefLang}
                        onChange={(e) => handlePreferenceSave("lang", e.target.value)}
                      >
                        <option value="en">English (US)</option>
                        <option value="es" disabled>Español (Coming Soon)</option>
                        <option value="fr" disabled>Français (Coming Soon)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.05)" }}></div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div className="switch-row">
                      <div>
                        <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem" }}>Auto Refresh Dashboard</h4>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Polled synchronization checks for server-side logging.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefAutoRefresh}
                        onChange={(e) => handlePreferenceSave("refresh", e.target.checked)}
                        className="checkbox"
                      />
                    </div>

                    <div className="switch-row">
                      <div>
                        <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem" }}>Remember Sidebar Open State</h4>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Save sidebar navigation toggle history locally.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefRememberSidebar}
                        onChange={(e) => handlePreferenceSave("sidebar", e.target.checked)}
                        className="checkbox"
                      />
                    </div>

                    <div className="switch-row">
                      <div>
                        <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem" }}>High Contrast Mode</h4>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Increases contrast across elements for better accessibility.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={highContrast}
                        onChange={(e) => setHighContrast(e.target.checked)}
                        className="checkbox"
                      />
                    </div>

                    <div className="switch-row">
                      <div>
                        <h4 style={{ margin: 0, color: "#fff", fontSize: "0.9rem" }}>Focus Outline Assistant</h4>
                        <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Displays sharp visual borders on active inputs for keyboard navigation.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={focusOutline}
                        onChange={(e) => setFocusOutline(e.target.checked)}
                        className="checkbox"
                      />
                    </div>

                    <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "10px 0" }}></div>

                    <div>
                      <h4 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "0.9rem" }}>Backup / Restore Theme Configuration</h4>
                      <p style={{ margin: "0 0 10px 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Export or import current visual theme and accent settings to a JSON file.</p>
                      
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <button onClick={handleExportConfig} className="btn btn-secondary" style={{ fontSize: "0.78rem", padding: "6px 12px" }}>
                          Export Config (JSON)
                        </button>
                        
                        <label className="btn btn-primary" style={{ fontSize: "0.78rem", padding: "6px 12px", cursor: "pointer", margin: 0 }}>
                          <span>Import Config (JSON)</span>
                          <input 
                            type="file" 
                            accept=".json" 
                            onChange={handleImportConfig} 
                            style={{ display: "none" }} 
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 8: ABOUT */}
              {activeSubTab === "about" && (
                <motion.div
                  key="about"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <div>
                    <h3 className="dashboard-panel-title">About AetherVault</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Encrypted cloud file management specifications.</p>
                  </div>

                  <div className="about-info-box">
                    <div className="about-row">
                      <span>Application Name:</span>
                      <strong>AetherVault Secure Storage</strong>
                    </div>
                    <div className="about-row">
                      <span>Version Code:</span>
                      <strong>v1.0.4 Production (Stable)</strong>
                    </div>
                    <div className="about-row">
                      <span>Principal Developer:</span>
                      <strong>MAPallavi</strong>
                    </div>
                    <div className="about-row">
                      <span>Core Engine:</span>
                      <span>React.js v18 • Node.js v20 • Express.js</span>
                    </div>
                    <div className="about-row">
                      <span>Database Engine:</span>
                      <span>MongoDB Document Store</span>
                    </div>
                    <div className="about-row">
                      <span>Security:</span>
                      <span>AES-256-CBC rests, HMAC-SHA256 JWT sessions</span>
                    </div>
                    <div className="about-row">
                      <span>License Type:</span>
                      <span>MIT License</span>
                    </div>
                  </div>

                  <a
                    href="https://github.com/MAPallavi/AetherVault"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-gray"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      alignSelf: "flex-start",
                      marginTop: "10px",
                      textDecoration: "none",
                    }}
                  >
                    <Github size={16} />
                    <span>View GitHub Repository</span>
                  </a>
                </motion.div>
              )}

              {/* TAB: WORKSPACES */}
              {activeSubTab === "workspaces" && (
                <motion.div
                  key="workspaces"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <div>
                    <h3 className="dashboard-panel-title">My Workspaces</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Manage collaboration hubs (Personal, Team, Department).</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
                    <div className="glass-panel" style={{ padding: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ color: "#fff" }}>Personal Vault Workspace</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>Type: Personal • Owner: Me</div>
                      </div>
                      <span style={{ fontSize: "0.75rem", padding: "4px 8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px" }}>Active</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB: INVITATIONS */}
              {activeSubTab === "invitations" && (
                <motion.div
                  key="invitations"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <div>
                    <h3 className="dashboard-panel-title">Workspace Invitations</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Review and manage pending department and team workspace invites.</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No pending workspace invitations found.</p>
                  </div>
                </motion.div>
              )}

              {/* TAB: SHARING DEFAULTS */}
              {activeSubTab === "sharing-defaults" && (
                <motion.div
                  key="sharing-defaults"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <div>
                    <h3 className="dashboard-panel-title">Sharing Defaults</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Configure default permission levels for shared folders and links.</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Default Access Permission</label>
                      <select className="input-field" defaultValue="Viewer" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "8px", color: "#fff" }}>
                        <option value="Viewer">Viewer (Read Only)</option>
                        <option value="Editor">Editor (Read/Write)</option>
                        <option value="Commenter">Commenter</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 9: SYSTEM HEALTH */}
              {activeSubTab === "health" && (
                <motion.div
                  key="health"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <AdminHealth />
                </motion.div>
              )}

              {/* TAB: ADMIN PANEL */}
              {activeSubTab === "admin-panel" && (
                <motion.div
                  key="admin-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="settings-section-container"
                >
                  <AdminPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
