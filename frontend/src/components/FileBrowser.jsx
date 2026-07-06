import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { api } from "../utils/api";
import {
  FolderClosed,
  Plus,
  Upload,
  Loader2,
  Download,
  Trash,
  Edit2,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileText,
  CornerDownRight,
  Info,
  X,
  FileUp,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Breadcrumbs from "./filebrowser/Breadcrumbs";
import SearchBar from "./filebrowser/SearchBar";
import FilterBar from "./filebrowser/FilterBar";
import ContextMenu from "./filebrowser/ContextMenu";
import FileBrowserSkeleton from "./filebrowser/FileBrowserSkeleton";
import EmptyState from "./EmptyState";
import { toast } from "react-hot-toast";
import "../styles/filebrowser.css";

export default function FileBrowser({ onActionSuccess, onPreviewSelect, refreshTrigger }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]);
  const [error, setError] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ percent: 0, loaded: 0, total: 0 });
  const xhrRef = useRef(null);

  const [starredIds, setStarredIds] = useState(() => {
    try {
      const saved = localStorage.getItem("aethervault_starred");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [starredOnly, setStarredOnly] = useState(false);

  const [recentFiles, setRecentFiles] = useState(() => {
    try {
      const saved = localStorage.getItem("aethervault_recents");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Sync starred items to localStorage
  useEffect(() => {
    localStorage.setItem("aethervault_starred", JSON.stringify(starredIds));
  }, [starredIds]);

  const toggleStar = (id) => {
    setStarredIds((prev) => {
      const isStarred = prev.includes(id);
      let updated;
      if (isStarred) {
        updated = prev.filter((x) => x !== id);
        toast.success("Removed from Favorites");
      } else {
        updated = [...prev, id];
        toast.success("Added to Favorites");
      }
      return updated;
    });
  };

  const addToRecents = (file, actionType = "viewed") => {
    if (!file || file.isFolder) return;
    setRecentFiles((prev) => {
      const filtered = prev.filter((x) => x._id !== file._id);
      const updated = [{ ...file, actionType, timestamp: Date.now() }, ...filtered].slice(0, 8);
      localStorage.setItem("aethervault_recents", JSON.stringify(updated));
      return updated;
    });
  };

  // Grid/List View state with localStorage persistence
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("aethervault_view_mode") || "grid";
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("aethervault_view_mode", mode);
  };

  // Filtering & Sorting states
  const [filterType, setFilterType] = useState("ALL");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Context Menu state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });

  // File Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Modals state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [actioningId, setActioningId] = useState(null);

  // Metadata Properties modal state
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [propertiesItem, setPropertiesItem] = useState(null);

  const fileInputRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    const mime = mimeType.toLowerCase();
    if (mime.startsWith("image/")) return <FileImage size={24} color="#e040fb" />;
    if (mime.startsWith("video/")) return <FileVideo size={24} color="#ff5252" />;
    if (mime.startsWith("audio/")) return <FileAudio size={24} color="#ffd740" />;
    if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar") || mime.includes("compressed")) return <FileArchive size={24} color="#69f0ae" />;
    return <FileText size={24} color="#3b82f6" />;
  };

  const getFileExtensionBadge = (filename, mimeType) => {
    if (mimeType.includes("folder")) {
      return <span className="badge badge-folder">Folder</span>;
    }
    const ext = filename.split(".").pop().toUpperCase();
    const mime = mimeType.toLowerCase();
    if (mime.includes("pdf")) return <span className="badge badge-pdf">PDF</span>;
    if (mime.startsWith("image/")) return <span className="badge badge-image">IMG</span>;
    if (mime.startsWith("video/")) return <span className="badge badge-video">VIDEO</span>;
    if (mime.startsWith("audio/")) return <span className="badge badge-audio">AUDIO</span>;
    if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar") || mime.includes("compressed")) return <span className="badge badge-zip">ZIP</span>;
    if (mime.includes("word") || mime.includes("document")) return <span className="badge badge-doc">DOC</span>;
    if (mime.includes("sheet") || mime.includes("excel")) return <span className="badge badge-spreadsheet">XLS</span>;
    if (mime.includes("presentation") || mime.includes("powerpoint")) return <span className="badge badge-presentation">PPT</span>;
    if (mime.includes("text/html") || mime.includes("javascript") || mime.includes("json") || mime.includes("css")) return <span className="badge badge-code">CODE</span>;
    if (mime.startsWith("text/")) return <span className="badge badge-text">TXT</span>;
    
    if (ext.length <= 4 && /^[A-Z0-9]+$/.test(ext)) {
      return <span className="badge badge-other">{ext}</span>;
    }
    return <span className="badge badge-other">FILE</span>;
  };

  const renderHighlightedName = (name, query) => {
    if (!query.trim()) return name;
    const parts = name.split(new RegExp(`(${query})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="search-highlight">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const fetchFiles = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listFiles(currentFolder?._id || null, search);
      setItems(data);
    } catch (err) {
      setError("Failed to fetch files.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
  };

  const handleUpload = async (filesList) => {
    if (!filesList || filesList.length === 0) return;

    setUploading(true);
    setUploadProgress({ percent: 0, loaded: 0, total: 0 });
    setError("");
    const toastId = toast.loading("Encrypting & uploading files...");
    try {
      const uploaded = await api.uploadFiles(
        filesList,
        currentFolder?._id || null,
        (percent, loaded, total) => {
          setUploadProgress({ percent, loaded, total });
        },
        xhrRef
      );
      setItems([...uploaded, ...items]);
      uploaded.forEach((f) => addToRecents(f, "uploaded"));
      toast.success("Upload completed successfully", { id: toastId });
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      if (xhrRef.current?.status === 0) {
        toast.error("Upload aborted", { id: toastId });
      } else {
        toast.error(err.message || "Failed to upload files.", { id: toastId });
        setError(err.message || "Failed to upload files.");
      }
    } finally {
      setUploading(false);
      setUploadProgress({ percent: 0, loaded: 0, total: 0 });
      xhrRef.current = null;
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setActioningId("create-folder");
    setError("");
    const toastId = toast.loading("Creating folder...");
    try {
      const newFolder = await api.createFolder(newFolderName.trim(), currentFolder?._id || null);
      setItems([newFolder, ...items]);
      setShowFolderModal(false);
      setNewFolderName("");
      toast.success("Folder created successfully", { id: toastId });
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      toast.error(err.message || "Failed to create folder.", { id: toastId });
      setError(err.message || "Failed to create folder.");
    } finally {
      setActioningId(null);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameValue.trim() || !renameItem) return;

    setActioningId(renameItem._id);
    setError("");
    const toastId = toast.loading("Renaming item...");
    try {
      const updated = await api.renameItem(renameItem._id, renameValue.trim());
      setItems(items.map((item) => (item._id === renameItem._id ? updated : item)));
      setShowRenameModal(false);
      setRenameItem(null);
      setRenameValue("");
      toast.success("Item renamed successfully", { id: toastId });
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      toast.error(err.message || "Failed to rename item.", { id: toastId });
      setError(err.message || "Failed to rename item.");
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmation = window.confirm(`Move "${name}" to the Recycle Bin?`);
    if (!confirmation) return;

    setActioningId(id);
    setError("");
    const toastId = toast.loading("Moving to Recycle Bin...");
    try {
      await api.moveToTrash(id);
      setItems(items.filter((item) => item._id !== id));
      toast.success(`"${name}" moved to Recycle Bin`, { id: toastId });
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      toast.error(err.message || "Failed to delete item.", { id: toastId });
      setError(err.message || "Failed to delete item.");
    } finally {
      setActioningId(null);
    }
  };

  const navigateIntoFolder = useCallback((folder) => {
    setFolderHistory((prev) => [
      ...prev,
      currentFolder ? { _id: currentFolder._id, name: currentFolder.name } : { _id: null, name: "Root" },
    ]);
    setCurrentFolder(folder);
    setSearch("");
  }, [currentFolder]);

  const navigateBack = useCallback(() => {
    if (folderHistory.length === 0) return;
    const previous = folderHistory[folderHistory.length - 1];
    setFolderHistory((prev) => prev.slice(0, -1));
    setCurrentFolder(previous._id ? { _id: previous._id, name: previous.name } : null);
    setSearch("");
  }, [folderHistory]);

  const navigateToBreadcrumb = useCallback((index) => {
    if (index === -1) {
      setFolderHistory([]);
      setCurrentFolder(null);
    } else {
      const destination = folderHistory[index];
      setFolderHistory((prev) => prev.slice(0, index));
      setCurrentFolder(destination._id ? { _id: destination._id, name: destination.name } : null);
    }
    setSearch("");
  }, [folderHistory]);

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      item,
    });
  };

  // Fetch files on folder or search parameter change
  useEffect(() => {
    fetchFiles();
  }, [currentFolder, search, refreshTrigger]);

  // Open search redirected folder if any
  useEffect(() => {
    const savedFolder = localStorage.getItem("aethervault_search_folder");
    if (savedFolder) {
      localStorage.removeItem("aethervault_search_folder");
      try {
        const parsed = JSON.parse(savedFolder);
        navigateIntoFolder(parsed);
      } catch (err) {
        console.error("Failed to parse redirected folder", err);
      }
    }
  }, [refreshTrigger, navigateIntoFolder]);

  // Handle keyboard shortcut hooks
  useEffect(() => {
    const handleShortcutUpload = () => {
      fileInputRef.current?.click();
    };
    const handleShortcutNewFolder = () => {
      setShowFolderModal(true);
      setNewFolderName("");
    };
    const handleShortcutDelete = () => {
      if (selectedItem) {
        handleDelete(selectedItem._id, selectedItem.name);
      }
    };
    const handleShortcutEsc = () => {
      setSelectedItem(null);
      setContextMenu((prev) => ({ ...prev, visible: false }));
      setShowFolderModal(false);
      setShowRenameModal(false);
      setShowPropertiesModal(false);
    };

    window.addEventListener("aethervault_shortcut_upload", handleShortcutUpload);
    window.addEventListener("aethervault_shortcut_new_folder", handleShortcutNewFolder);
    window.addEventListener("aethervault_shortcut_delete", handleShortcutDelete);
    window.addEventListener("aethervault_shortcut_esc", handleShortcutEsc);

    return () => {
      window.removeEventListener("aethervault_shortcut_upload", handleShortcutUpload);
      window.removeEventListener("aethervault_shortcut_new_folder", handleShortcutNewFolder);
      window.removeEventListener("aethervault_shortcut_delete", handleShortcutDelete);
      window.removeEventListener("aethervault_shortcut_esc", handleShortcutEsc);
    };
  }, [selectedItem]);

  // Clear selected item on navigation
  useEffect(() => {
    setSelectedItem(null);
  }, [currentFolder, search]);

  // Context Menu close listener
  useEffect(() => {
    const closeMenu = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  // Global Drag & Drop listener for the entire file browser
  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const handleDragLeave = (e) => {
      // Only close if leaving the viewport boundary
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragOver(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [currentFolder]);

  // Client-side filtering and sorting
  const processedItems = useMemo(() => {
    let result = [...items];

    if (filterType !== "ALL") {
      result = result.filter((item) => {
        if (item.isFolder) return true;
        const mime = item.mimeType.toLowerCase();
        if (filterType === "IMAGES") return mime.startsWith("image/");
        if (filterType === "VIDEOS") return mime.startsWith("video/");
        if (filterType === "AUDIO") return mime.startsWith("audio/");
        if (filterType === "DOCUMENTS") {
          return (
            mime.includes("pdf") ||
            mime.includes("document") ||
            mime.includes("sheet") ||
            mime.includes("text") ||
            mime.includes("msword") ||
            mime.includes("powerpoint")
          );
        }
        if (filterType === "ARCHIVES") {
          return mime.includes("zip") || mime.includes("rar") || mime.includes("tar") || mime.includes("compressed");
        }
        return false;
      });
    }

    if (starredOnly) {
      result = result.filter((item) => starredIds.includes(item._id));
    }

    result.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "size") {
        comparison = a.size - b.size;
      } else if (sortBy === "date") {
        comparison = new Date(a.updatedAt) - new Date(b.updatedAt);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [items, filterType, sortBy, sortOrder, starredOnly, starredIds]);

  return (
    <div className="filebrowser-container">
      {/* Animated Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="drag-overlay"
          >
            <div className="drag-overlay-card">
              <FileUp size={64} className="spinner" color="var(--primary)" />
              <h2>Drop files here to upload securely</h2>
              <p>Your files will be end-to-end encrypted with AES-256 before disk writes.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <Breadcrumbs
            currentFolder={currentFolder}
            folderHistory={folderHistory}
            navigateBack={navigateBack}
            navigateToBreadcrumb={navigateToBreadcrumb}
          />
        </div>

        <div className="toolbar-right">
          <SearchBar search={search} setSearch={setSearch} />
          
          <FilterBar
            filterType={filterType}
            setFilterType={setFilterType}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            viewMode={viewMode}
            setViewMode={handleSetViewMode}
          />

          <button
            onClick={() => setStarredOnly(!starredOnly)}
            className={`btn ${starredOnly ? "btn-primary" : "btn-secondary"}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "38px" }}
            title="Filter Starred Only"
          >
            <Star size={14} fill={starredOnly ? "#ffd740" : "transparent"} color={starredOnly ? "#ffd740" : "var(--primary)"} />
            <span>Starred</span>
          </button>

          <button onClick={() => setShowFolderModal(true)} className="btn btn-secondary" title="New Folder">
            <Plus size={16} />
            <span>Folder</span>
          </button>

          <button onClick={() => fileInputRef.current.click()} className="btn btn-primary" title="Upload Files">
            <Upload size={16} />
            <span>Upload</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => handleUpload(e.target.files)}
            multiple
          />
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {/* Recent Files Widget Carousel */}
      {!loading && !search && !currentFolder && recentFiles.length > 0 && (
        <div className="recent-files-widget animate-fade-in">
          <h3 className="recent-title">Recent Files</h3>
          <div className="recent-chips-row">
            {recentFiles.map((file) => (
              <div
                key={file._id}
                onClick={() => (addToRecents(file, "viewed"), onPreviewSelect(file))}
                className="recent-file-chip glass"
                title={`Last action: ${file.actionType || "viewed"}`}
              >
                {getFileIcon(file.mimeType)}
                <div className="recent-file-info">
                  <span className="recent-file-name">{file.name}</span>
                  <span className="recent-file-meta">{formatSize(file.size)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <FileBrowserSkeleton viewMode={viewMode} />
      ) : processedItems.length === 0 ? (
        <EmptyState
          icon={FolderClosed}
          title={search ? "No files found" : "This folder is empty"}
          description={search ? `We couldn't find any items matching "${search}".` : "This vault directory is currently empty. Drop files anywhere or secure them."}
          actionText={search ? "" : "Upload Files"}
          onAction={search ? null : () => fileInputRef.current.click()}
        />
      ) : viewMode === "grid" ? (
        /* GRID VIEW with Framer Motion Appearances */
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.04 } },
          }}
          className="file-grid"
        >
          {processedItems.map((item) => (
            <motion.div
              key={item._id}
              variants={{
                hidden: { opacity: 0, y: 15 },
                show: { opacity: 1, y: 0 },
              }}
              className={`file-card glass ${selectedItem?._id === item._id ? "selected-item" : ""}`}
              onClick={() => setSelectedItem(item)}
              onDoubleClick={() => (item.isFolder ? navigateIntoFolder(item) : (addToRecents(item, "viewed"), onPreviewSelect(item)))}
              onContextMenu={(e) => handleContextMenu(e, item)}
              whileHover={{ y: -4 }}
            >
              <div className="file-card-top">
                {item.isFolder ? <FolderClosed size={44} color="var(--primary)" /> : getFileIcon(item.mimeType)}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(item._id);
                  }}
                  className={`star-btn ${starredIds.includes(item._id) ? "starred" : "unstarred"}`}
                  title={starredIds.includes(item._id) ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Star size={14} fill={starredIds.includes(item._id) ? "#ffd740" : "transparent"} />
                </button>

                <div className="action-buttons">
                  <button
                    onClick={() => {
                      setRenameItem(item);
                      setRenameValue(item.name);
                      setShowRenameModal(true);
                    }}
                    className="btn-icon"
                    title="Rename"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id, item.name)}
                    className="btn-icon text-danger"
                    title="Delete"
                    disabled={actioningId === item._id}
                  >
                    {actioningId === item._id ? <Loader2 className="spinner" size={12} /> : <Trash size={12} />}
                  </button>
                </div>
              </div>

              <div className="file-card-bottom">
                <p className="file-name" title={item.name}>
                  {renderHighlightedName(item.name, search)}
                </p>
                <div className="file-meta">
                  <span className="file-date">
                    {new Date(item.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  {getFileExtensionBadge(item.name, item.mimeType)}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* LIST VIEW with Fade-ins */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="list-panel glass"
        >
          <table className="file-table">
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ width: "130px" }}>Format</th>
                <th style={{ width: "120px" }}>Size</th>
                <th style={{ width: "160px" }}>Last Modified</th>
                <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedItems.map((item) => (
                <tr
                  key={item._id}
                  onClick={() => setSelectedItem(item)}
                  onDoubleClick={() => (item.isFolder ? navigateIntoFolder(item) : (addToRecents(item, "viewed"), onPreviewSelect(item)))}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  className={selectedItem?._id === item._id ? "selected-item-row" : ""}
                >
                  <td>
                    <div className="list-name-cell">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(item._id);
                        }}
                        style={{ background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", marginRight: "8px", padding: 0 }}
                        className={starredIds.includes(item._id) ? "star-btn-list starred" : "star-btn-list unstarred"}
                        title={starredIds.includes(item._id) ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        <Star size={14} fill={starredIds.includes(item._id) ? "#ffd740" : "transparent"} />
                      </button>
                      {item.isFolder ? <FolderClosed size={18} color="var(--primary)" /> : getFileIcon(item.mimeType)}
                      <span className="list-name-text" title={item.name}>
                        {renderHighlightedName(item.name, search)}
                      </span>
                    </div>
                  </td>
                  <td>{getFileExtensionBadge(item.name, item.mimeType)}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{item.isFolder ? "—" : formatSize(item.size)}</td>
                  <td style={{ color: "var(--text-secondary)", opacity: 0.8 }}>
                    {new Date(item.updatedAt).toLocaleDateString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td>
                    <div className="list-action-buttons">
                      <button
                        onClick={() => (item.isFolder ? navigateIntoFolder(item) : (addToRecents(item, "viewed"), onPreviewSelect(item)))}
                        className="btn-icon"
                        title="Open"
                      >
                        <CornerDownRight size={12} />
                      </button>
                      <a 
                        href={api.getDownloadUrl(item._id)} 
                        className="btn-icon" 
                        title="Download"
                        onClick={() => addToRecents(item, "downloaded")}
                      >
                        <Download size={12} />
                      </a>
                      <button
                        onClick={() => {
                          setRenameItem(item);
                          setRenameValue(item.name);
                          setShowRenameModal(true);
                        }}
                        className="btn-icon"
                        title="Rename"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id, item.name)}
                        className="btn-icon"
                        title="Delete"
                        disabled={actioningId === item._id}
                      >
                        {actioningId === item._id ? <Loader2 className="spinner" size={12} /> : <Trash size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Floating Upload Progress Indicator */}
      {uploading && (
        <div className="progress-card glass" style={styles.progressCard}>
          <div style={styles.progressHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Loader2 className="spinner" size={14} color="var(--primary)" />
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#fff" }}>Uploading Encrypted...</span>
            </div>
            <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--primary)" }}>
              {uploadProgress.percent}%
            </span>
          </div>
          
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${uploadProgress.percent}%` }}></div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              {formatSize(uploadProgress.loaded)} / {formatSize(uploadProgress.total)}
              {uploadProgress.total > 0 && ` (${formatSize(Math.max(uploadProgress.total - uploadProgress.loaded, 0))} left)`}
            </span>
            <button 
              onClick={handleCancelUpload}
              className="btn-gray"
              style={{ fontSize: "0.68rem", padding: "4px 8px", minHeight: 0, height: "auto" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Modern Context Menu */}
      <AnimatePresence>
        {contextMenu.visible && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            item={contextMenu.item}
            onOpen={() =>
              contextMenu.item.isFolder ? navigateIntoFolder(contextMenu.item) : (addToRecents(contextMenu.item, "viewed"), onPreviewSelect(contextMenu.item))
            }
            onDownload={() => {
              addToRecents(contextMenu.item, "downloaded");
              window.open(api.getDownloadUrl(contextMenu.item._id));
            }}
            onRename={() => {
              setRenameItem(contextMenu.item);
              setRenameValue(contextMenu.item.name);
              setShowRenameModal(true);
            }}
            onDelete={() => handleDelete(contextMenu.item._id, contextMenu.item.name)}
            onProperties={() => {
              setPropertiesItem(contextMenu.item);
              setShowPropertiesModal(true);
            }}
            isStarred={starredIds.includes(contextMenu.item._id)}
            onStar={() => {
              toggleStar(contextMenu.item._id);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
          />
        )}
      </AnimatePresence>

      {/* MODALS */}
      {/* Folder Creation Modal */}
      {showFolderModal && (
        <div className="modal-backdrop" onClick={() => setShowFolderModal(false)} style={styles.modalBackdrop}>
          <div className="modal-card glass" onClick={(e) => e.stopPropagation()} style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Create New Folder</h3>
            <form onSubmit={handleCreateFolder} style={styles.modalForm}>
              <input
                type="text"
                className="input-field"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                required
                disabled={actioningId === "create-folder"}
              />
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="btn btn-secondary"
                  disabled={actioningId === "create-folder"}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actioningId === "create-folder"}>
                  {actioningId === "create-folder" ? <Loader2 className="spinner" size={16} /> : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowRenameModal(false);
            setRenameItem(null);
          }}
          style={styles.modalBackdrop}
        >
          <div className="modal-card glass" onClick={(e) => e.stopPropagation()} style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Rename Item</h3>
            <form onSubmit={handleRename} style={styles.modalForm}>
              <input
                type="text"
                className="input-field"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                required
                disabled={actioningId !== null}
              />
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowRenameModal(false);
                    setRenameItem(null);
                  }}
                  className="btn btn-secondary"
                  disabled={actioningId !== null}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actioningId !== null}>
                  {actioningId === renameItem?._id ? <Loader2 className="spinner" size={16} /> : "Rename"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Metadata Properties Dialog */}
      <AnimatePresence>
        {showPropertiesModal && propertiesItem && (
          <div className="modal-backdrop" onClick={() => setShowPropertiesModal(false)} style={styles.modalBackdrop}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="modal-card glass"
              onClick={(e) => e.stopPropagation()}
              style={styles.modalCard}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={styles.modalTitle}>Item Properties</h3>
                <button
                  onClick={() => setShowPropertiesModal(false)}
                  style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={styles.propertiesList}>
                <div style={styles.propRow}>
                  <span style={styles.propLabel}>Name:</span>
                  <span style={styles.propVal} title={propertiesItem.name}>{propertiesItem.name}</span>
                </div>
                <div style={styles.propRow}>
                  <span style={styles.propLabel}>Type:</span>
                  <span style={styles.propVal}>
                    {propertiesItem.isFolder ? "Virtual File Folder" : propertiesItem.mimeType}
                  </span>
                </div>
                <div style={styles.propRow}>
                  <span style={styles.propLabel}>Size:</span>
                  <span style={styles.propVal}>
                    {propertiesItem.isFolder ? "Calculated dynamically" : formatSize(propertiesItem.size)}
                  </span>
                </div>
                <div style={styles.propRow}>
                  <span style={styles.propLabel}>Encryption:</span>
                  <span style={{ ...styles.propVal, color: "#10b981", fontWeight: "600" }}>
                    AES-256-CBC Secure Stream
                  </span>
                </div>
                <div style={styles.propRow}>
                  <span style={styles.propLabel}>Last Modified:</span>
                  <span style={styles.propVal}>
                    {new Date(propertiesItem.updatedAt).toLocaleString()}
                  </span>
                </div>
                <div style={styles.propRow}>
                  <span style={styles.propLabel}>Unique ID:</span>
                  <span style={{ ...styles.propVal, fontFamily: "monospace", fontSize: "0.75rem" }}>
                    {propertiesItem._id}
                  </span>
                </div>
              </div>

              <button onClick={() => setShowPropertiesModal(false)} className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  progressCard: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "260px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    border: "1px solid var(--primary)",
    zIndex: 9999,
  },
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  progressTrack: {
    height: "6px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "var(--primary)",
    borderRadius: "3px",
    transition: "width 0.1s ease",
  },
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  modalCard: {
    width: "100%",
    maxWidth: "360px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  modalTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#fff",
    margin: 0,
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  propertiesList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    margin: "8px 0",
  },
  propRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
    paddingBottom: "6px",
  },
  propLabel: {
    color: "var(--text-secondary)",
  },
  propVal: {
    color: "#fff",
    textAlign: "right",
    maxWidth: "200px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
