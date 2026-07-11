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
  Tag,
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
  const cancelRef = useRef(false);

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

  const [tagsMap, setTagsMap] = useState(() => {
    try {
      const saved = localStorage.getItem("aethervault_tags");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Sync tags map to localStorage
  useEffect(() => {
    localStorage.setItem("aethervault_tags", JSON.stringify(tagsMap));
  }, [tagsMap]);

  // Search debouncer
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const saveTags = async (itemId, tagsArray) => {
    try {
      const updatedItem = await api.updateTags(itemId, tagsArray);
      setTagsMap((prev) => ({
        ...prev,
        [itemId]: updatedItem.tags,
      }));
      setItems((prev) => prev.map(item => item._id === itemId ? { ...item, tags: updatedItem.tags } : item));
      toast.success("Tags updated");
    } catch (err) {
      toast.error(err.message || "Failed to update tags");
    }
  };

  const getTagColor = (tag) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 50%, 35%)`;
  };

  const parseSizeStringToBytes = (str) => {
    const num = parseFloat(str);
    if (isNaN(num)) return 0;
    if (str.endsWith("gb")) return num * 1024 * 1024 * 1024;
    if (str.endsWith("mb")) return num * 1024 * 1024;
    if (str.endsWith("kb")) return num * 1024;
    return num;
  };

  const toggleStar = async (id) => {
    try {
      const updatedItem = await api.toggleFavorite(id);
      setStarredIds((prev) => {
        const isStarred = prev.includes(id);
        if (isStarred) {
          toast.success("Removed from Favorites");
          return prev.filter((x) => x !== id);
        } else {
          toast.success("Added to Favorites");
          return [...prev, id];
        }
      });
      setItems((prev) => prev.map(item => item._id === id ? { ...item, isFavorite: updatedItem.isFavorite } : item));
    } catch (err) {
      toast.error(err.message || "Failed to update favorite status");
    }
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
  const [inlineRenameId, setInlineRenameId] = useState(null);
  const [inlineRenameValue, setInlineRenameValue] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [clipboard, setClipboard] = useState(null); // { type: 'copy' | 'cut', itemIds: [], sourceFolderId: null }
  const [uploadQueue, setUploadQueue] = useState([]);
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);

  // Metadata Properties modal state
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [propertiesItem, setPropertiesItem] = useState(null);

  // Tag Modal states
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [tagsItem, setTagsItem] = useState(null);
  const [tagsInputValue, setTagsInputValue] = useState("");
  const [activeTag, setActiveTag] = useState(null);

  // Version 1.4: Share, Version, Comments, Notes states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const [shareExpiry, setShareExpiry] = useState("never");
  const [sharePasscode, setSharePasscode] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionItem, setVersionItem] = useState(null);
  const [versionsList, setVersionsList] = useState([]);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsItem, setCommentsItem] = useState(null);
  const [commentsList, setCommentsList] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");

  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [personalNotes, setPersonalNotes] = useState(() => {
    return localStorage.getItem("aethervault_notes") || "# Personal Notes\nAdd notes here securely...";
  });

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
    // Strip query operators for highlighting
    let cleaned = query.trim().toLowerCase();
    if (cleaned.startsWith("tag:") || cleaned.startsWith("ext:") || cleaned.startsWith("type:") || cleaned.startsWith("size>") || cleaned.startsWith("size<") || cleaned.startsWith("date:") || cleaned === "is:starred" || cleaned === "is:favorite") {
      return name;
    }
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

      const starred = data.filter(f => f.isFavorite).map(f => f._id);
      setStarredIds(starred);

      const tags = {};
      data.forEach(item => {
        if (item.tags) {
          tags[item._id] = item.tags;
        }
      });
      setTagsMap(prev => ({ ...prev, ...tags }));
    } catch (err) {
      setError("Failed to fetch files.");
    } finally {
      setLoading(false);
    }
  };

  const traverseDirectory = async (entry, path = "") => {
    if (entry.isFile) {
      const file = await new Promise((resolve) => entry.file(resolve));
      file.relativePath = path + file.name;
      return [file];
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readAll = async () => {
        let results = [];
        let chunk;
        do {
          chunk = await new Promise((resolve) => dirReader.readEntries(resolve));
          results = results.concat(chunk);
        } while (chunk.length > 0);
        return results;
      };
      const entries = await readAll();
      let files = [];
      for (const child of entries) {
        const sub = await traverseDirectory(child, path + entry.name + "/");
        files = files.concat(sub);
      }
      return files;
    }
    return [];
  };

  const getOrCreateFolderByPath = async (pathSegments, currentParentId) => {
    let activeParentId = currentParentId;
    for (const segment of pathSegments) {
      if (!segment) continue;
      const currentFolderItems = await api.listFiles(activeParentId);
      let folder = currentFolderItems.find(
        (item) => item.isFolder && item.name.toLowerCase() === segment.toLowerCase()
      );
      if (!folder) {
        folder = await api.createFolder(segment, activeParentId);
      }
      activeParentId = folder._id;
    }
    return activeParentId;
  };

  const handleUploadHierarchical = async (filesList) => {
    const newItems = filesList.map((file) => {
      const uniqueId = Math.random().toString(36).substring(7);
      return {
        id: uniqueId,
        file,
        name: file.name,
        relativePath: file.relativePath || "",
        progress: 0,
        status: "queued",
        size: file.size,
        xhr: null,
      };
    });
    setUploadQueue((prev) => [...prev, ...newItems]);
    setShowQueuePanel(true);
  };

  const handleUpload = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    handleUploadHierarchical(Array.from(filesList));
  };

  useEffect(() => {
    const nextQueued = uploadQueue.find((item) => item.status === "queued");
    if (!nextQueued) return;

    setUploadQueue((prev) =>
      prev.map((item) => (item.id === nextQueued.id ? { ...item, status: "uploading" } : item))
    );

    const performUpload = async () => {
      let targetFolderId = currentFolder?._id || null;
      if (nextQueued.relativePath && nextQueued.relativePath.includes("/")) {
        const parts = nextQueued.relativePath.split("/");
        const directories = parts.slice(0, parts.length - 1);
        try {
          targetFolderId = await getOrCreateFolderByPath(directories, currentFolder?._id || null);
        } catch (err) {
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.id === nextQueued.id ? { ...item, status: "error", error: err.message } : item
            )
          );
          return;
        }
      }

      const xhrRefObject = { current: null };
      try {
        const onProgress = (percent) => {
          setUploadQueue((prev) =>
            prev.map((item) => (item.id === nextQueued.id ? { ...item, progress: percent } : item))
          );
        };

        const promise = api.uploadFiles([nextQueued.file], targetFolderId, onProgress, xhrRefObject);
        
        setUploadQueue((prev) =>
          prev.map((item) => (item.id === nextQueued.id ? { ...item, xhr: xhrRefObject.current } : item))
        );

        const uploaded = await promise;
        
        setUploadQueue((prev) =>
          prev.map((item) => (item.id === nextQueued.id ? { ...item, status: "done", progress: 100 } : item))
        );
        
        if (uploaded && uploaded.length > 0) {
          setItems(prevItems => {
            const combined = [...uploaded, ...prevItems];
            const unique = combined.filter((v, i, a) => a.findIndex(t => t._id === v._id) === i);
            return unique;
          });
          uploaded.forEach((f) => {
            addToRecents(f, "uploaded");
            logFileVersion(f);
          });
        }
        
        if (onActionSuccess) onActionSuccess();
      } catch (err) {
        setUploadQueue((prev) =>
          prev.map((item) => {
            if (item.id === nextQueued.id) {
              const isAborted = xhrRefObject.current?.status === 0;
              return {
                ...item,
                status: isAborted ? "paused" : "error",
                error: isAborted ? "Aborted" : err.message,
              };
            }
            return item;
          })
        );
      }
    };

    performUpload();
  }, [uploadQueue, currentFolder]);

  const logFileVersion = (file) => {
    // No-op client-side
  };

  const loadVersionHistory = (item) => {
    setVersionsList(item.versions || []);
  };

  const loadComments = (item) => {
    setCommentsList(item.comments || []);
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !commentsItem) return;
    try {
      const updatedFile = await api.addComment(commentsItem._id, newCommentText.trim());
      setNewCommentText("");
      setCommentsList(updatedFile.comments || []);
      setItems((prev) => prev.map(item => item._id === commentsItem._id ? updatedFile : item));
      toast.success("Comment added");
    } catch (err) {
      toast.error(err.message || "Failed to add comment");
    }
  };

  const handleGenerateShareLink = async () => {
    if (!shareItem) return;
    const trimmedPasscode = sharePasscode.trim();
    if (shareExpiry) {
      const selectedDate = new Date(shareExpiry);
      if (selectedDate < new Date()) {
        toast.error("Expiry date cannot be in the past.");
        return;
      }
    }
    try {
      const data = await api.createShareLink(shareItem._id, trimmedPasscode, shareExpiry || null);
      const shareUrl = `${window.location.origin}/shared/${data.urlCode}`;
      setGeneratedLink(shareUrl);
      toast.success("Shared Link generated successfully");
      setItems(prev => prev.map(item => {
        if (item._id === shareItem._id) {
          return {
            ...item,
            sharedLinks: [...(item.sharedLinks || []), data]
          };
        }
        return item;
      }));
    } catch (err) {
      toast.error(err.message || "Failed to create shared link");
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

  const checkDuplicateName = (newName, excludeId) => {
    return items.some(item => 
      item._id !== excludeId && 
      item.name.toLowerCase() === newName.trim().toLowerCase() &&
      (item.parentFolder === (currentFolder?._id || null) || (!item.parentFolder && !currentFolder))
    );
  };

  const handleInlineRenameSubmit = async (itemId, newName) => {
    if (!newName.trim()) {
      setInlineRenameId(null);
      return;
    }
    
    if (checkDuplicateName(newName, itemId)) {
      const confirmProceed = window.confirm(`An item named "${newName.trim()}" already exists in this directory. Do you want to proceed anyway?`);
      if (!confirmProceed) {
        setInlineRenameId(null);
        return;
      }
    }
    
    const toastId = toast.loading("Renaming...");
    try {
      const updated = await api.renameItem(itemId, newName.trim());
      setItems(items.map((item) => (item._id === itemId ? updated : item)));
      setInlineRenameId(null);
      toast.success("Renamed successfully", { id: toastId });
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      toast.error(err.message || "Failed to rename", { id: toastId });
      setInlineRenameId(null);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameValue.trim() || !renameItem) return;

    if (checkDuplicateName(renameValue, renameItem._id)) {
      const proceed = window.confirm(`An item named "${renameValue.trim()}" already exists in this folder. Do you want to proceed?`);
      if (!proceed) return;
    }

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
    if (index === -2) {
      const savedFolder = localStorage.getItem("aethervault_search_folder");
      if (savedFolder) {
        try {
          const parsed = JSON.parse(savedFolder);
          setFolderHistory((prev) => [...prev, currentFolder ? { _id: currentFolder._id, name: currentFolder.name } : { _id: null, name: "Root" }]);
          setCurrentFolder(parsed);
        } catch (e) {
          console.error(e);
        }
      }
    } else if (index === -1) {
      setFolderHistory([]);
      setCurrentFolder(null);
    } else {
      const destination = folderHistory[index];
      setFolderHistory((prev) => prev.slice(0, index));
      setCurrentFolder(destination._id ? { _id: destination._id, name: destination.name } : null);
    }
    setSearch("");
  }, [folderHistory, currentFolder]);

  useEffect(() => {
    const handleRefreshEvent = () => {
      navigateToBreadcrumb(-2);
    };
    window.addEventListener("refresh_files", handleRefreshEvent);
    return () => window.removeEventListener("refresh_files", handleRefreshEvent);
  }, [navigateToBreadcrumb]);

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
  }, [currentFolder, debouncedSearch, refreshTrigger]);

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

  // Client-side filtering and sorting
  const processedItems = useMemo(() => {
    let result = [...items];

    if (filterType !== "ALL") {
      result = result.filter((item) => {
        if (filterType === "FAVORITES") {
          return starredIds.includes(item._id);
        }
        if (filterType === "TAGGED") {
          return (tagsMap[item._id] || []).length > 0;
        }
        if (filterType === "UNTAGGED") {
          return (tagsMap[item._id] || []).length === 0;
        }
        if (filterType === "FOLDERS") {
          return item.isFolder;
        }
        if (filterType === "PDF") {
          return !item.isFolder && (item.mimeType.toLowerCase().includes("pdf") || item.name.toLowerCase().endsWith(".pdf"));
        }

        // For other format filters, keep folders so users can navigate
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

    if (activeTag) {
      result = result.filter((item) => {
        const itemTags = tagsMap[item._id] || [];
        return itemTags.some((t) => t.toLowerCase() === activeTag.toLowerCase());
      });
    }

    const finalSearch = debouncedSearch.trim().toLowerCase();
    if (finalSearch) {
      if (finalSearch.startsWith("tag:")) {
        const targetTag = finalSearch.replace("tag:", "").trim();
        result = result.filter(item => {
          const itemTags = tagsMap[item._id] || [];
          return itemTags.some(t => t.toLowerCase() === targetTag);
        });
      } else if (finalSearch === "is:starred" || finalSearch === "is:favorite") {
        result = result.filter(item => starredIds.includes(item._id));
      } else if (finalSearch.startsWith("ext:")) {
        const ext = finalSearch.replace("ext:", "").trim();
        result = result.filter(item => {
          if (item.isFolder) return false;
          return item.name.toLowerCase().endsWith(ext.startsWith(".") ? ext : `.${ext}`);
        });
      } else if (finalSearch.startsWith("type:")) {
        const type = finalSearch.replace("type:", "").trim();
        result = result.filter(item => {
          if (item.isFolder) return type === "folder";
          return item.mimeType.toLowerCase().includes(type);
        });
      } else if (finalSearch.startsWith("size>")) {
        const sizeStr = finalSearch.replace("size>", "").trim();
        const bytes = parseSizeStringToBytes(sizeStr);
        result = result.filter(item => !item.isFolder && item.size > bytes);
      } else if (finalSearch.startsWith("size<")) {
        const sizeStr = finalSearch.replace("size<", "").trim();
        const bytes = parseSizeStringToBytes(sizeStr);
        result = result.filter(item => !item.isFolder && item.size < bytes);
      } else if (finalSearch.startsWith("date:")) {
        const dateQuery = finalSearch.replace("date:", "").trim();
        if (dateQuery === "today") {
          result = result.filter(item => {
            const diff = new Date() - new Date(item.updatedAt);
            return diff < 24 * 60 * 60 * 1000;
          });
        } else {
          result = result.filter(item => item.updatedAt.toLowerCase().includes(dateQuery));
        }
      } else {
        result = result.filter(item => {
          const nameMatch = item.name.toLowerCase().includes(finalSearch);
          const extMatch = !item.isFolder && item.name.toLowerCase().endsWith("." + finalSearch);
          const itemTags = tagsMap[item._id] || [];
          const tagMatch = itemTags.some(t => t.toLowerCase().includes(finalSearch));
          return nameMatch || extMatch || tagMatch;
        });
      }
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
  }, [items, filterType, sortBy, sortOrder, starredOnly, starredIds, debouncedSearch, tagsMap, activeTag]);

  const [visibleLimit, setVisibleLimit] = useState(80);
  const virtualItems = useMemo(() => {
    return processedItems.slice(0, visibleLimit);
  }, [processedItems, visibleLimit]);

  useEffect(() => {
    setVisibleLimit(80);
  }, [processedItems]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120) {
        setVisibleLimit((prev) => Math.min(prev + 80, processedItems.length));
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [processedItems.length]);

  const handleKeyDownItem = (e, item) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (item.isFolder) {
        navigateIntoFolder(item);
      } else {
        addToRecents(item, "viewed");
        onPreviewSelect(item);
      }
    } else if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      setSelectedItem(item);
      setLastSelectedId(item._id);
      setSelectedIds(prev => 
        prev.includes(item._id) ? prev.filter(x => x !== item._id) : [...prev, item._id]
      );
    }
  };

  // Handle keyboard shortcut hooks
  useEffect(() => {
    const handleShortcutUpload = () => {
      fileInputRef.current?.click();
    };
    const handleShortcutNewFolder = () => {
      setShowFolderModal(true);
      setNewFolderName("");
    };
    const handleShortcutDelete = async () => {
      if (selectedIds.length > 0) {
        cancelRef.current = false;
        setBulkProgress({ active: true, current: 0, total: selectedIds.length, actionName: "Trashing items" });
        try {
          for (let i = 0; i < selectedIds.length; i++) {
            if (cancelRef.current) break;
            const targetId = selectedIds[i];
            await api.trashItem(targetId);
            setBulkProgress(prev => prev ? { ...prev, current: i + 1 } : null);
          }
          setSelectedIds([]);
          setBulkProgress(null);
          toast.success("Items moved to Trash");
          if (onActionSuccess) onActionSuccess();
          fetchFiles();
        } catch (err) {
          toast.error("Failed to delete items: " + err.message);
          setBulkProgress(null);
        }
      } else if (selectedItem) {
        handleDelete(selectedItem._id, selectedItem.name);
      }
    };

    const handleShortcutPermanentDelete = async () => {
      if (selectedIds.length > 0) {
        const confirm = window.confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected items? This action cannot be undone.`);
        if (!confirm) return;

        cancelRef.current = false;
        setBulkProgress({ active: true, current: 0, total: selectedIds.length, actionName: "Purging items" });
        try {
          for (let i = 0; i < selectedIds.length; i++) {
            if (cancelRef.current) break;
            const targetId = selectedIds[i];
            await api.purgeItem(targetId);
            setBulkProgress(prev => prev ? { ...prev, current: i + 1 } : null);
          }
          setSelectedIds([]);
          setBulkProgress(null);
          toast.success("Items permanently deleted");
          if (onActionSuccess) onActionSuccess();
          fetchFiles();
        } catch (err) {
          toast.error("Failed to permanently delete items: " + err.message);
          setBulkProgress(null);
        }
      } else if (selectedItem) {
        const confirm = window.confirm(`Are you sure you want to permanently delete "${selectedItem.name}"? This action cannot be undone.`);
        if (!confirm) return;

        try {
          await api.purgeItem(selectedItem._id);
          setSelectedItem(null);
          toast.success("Item permanently deleted");
          if (onActionSuccess) onActionSuccess();
          fetchFiles();
        } catch (err) {
          toast.error("Failed to permanently delete: " + err.message);
        }
      }
    };
    const handleShortcutEsc = () => {
      setSelectedItem(null);
      setContextMenu((prev) => ({ ...prev, visible: false }));
      setShowFolderModal(false);
      setShowRenameModal(false);
      setShowPropertiesModal(false);
      setShowTagsModal(false);
      setInlineRenameId(null);
    };

    const handleShortcutSelectAll = () => {
      setSelectedIds(processedItems.map(x => x._id));
    };

    const handleShortcutRename = () => {
      if (selectedItem) {
        setInlineRenameId(selectedItem._id);
        setInlineRenameValue(selectedItem.name);
      }
    };

    const handleShortcutCopy = () => {
      if (selectedIds.length > 0) {
        setClipboard({ type: "copy", itemIds: selectedIds, sourceFolderId: currentFolder?._id || null });
        toast.success("Copied to clipboard");
      }
    };

    const handleShortcutCut = () => {
      if (selectedIds.length > 0) {
        setClipboard({ type: "cut", itemIds: selectedIds, sourceFolderId: currentFolder?._id || null });
        toast.success("Cut to clipboard");
      }
    };

    const handleShortcutPaste = async () => {
      if (!clipboard) return;
      const action = clipboard.type;
      const itemsToPaste = clipboard.itemIds;
      cancelRef.current = false;
      setBulkProgress({ active: true, current: 0, total: itemsToPaste.length, actionName: action === "copy" ? "Copying items" : "Moving items" });
      try {
        for (let i = 0; i < itemsToPaste.length; i++) {
          if (cancelRef.current) break;
          const targetId = itemsToPaste[i];
          if (action === "copy") {
            await api.copyItem(targetId, currentFolder?._id || null);
          } else {
            await api.moveItem(targetId, currentFolder?._id || null);
          }
          setBulkProgress(prev => prev ? { ...prev, current: i + 1 } : null);
        }
        setClipboard(null);
        setSelectedIds([]);
        setBulkProgress(null);
        if (onActionSuccess) onActionSuccess();
        fetchFiles();
      } catch (err) {
        toast.error(`Paste failed: ` + err.message);
        setBulkProgress(null);
      }
    };

    window.addEventListener("aethervault_shortcut_upload", handleShortcutUpload);
    window.addEventListener("aethervault_shortcut_new_folder", handleShortcutNewFolder);
    window.addEventListener("aethervault_shortcut_delete", handleShortcutDelete);
    window.addEventListener("aethervault_shortcut_permanent_delete", handleShortcutPermanentDelete);
    window.addEventListener("aethervault_shortcut_esc", handleShortcutEsc);
    window.addEventListener("aethervault_shortcut_select_all", handleShortcutSelectAll);
    window.addEventListener("aethervault_shortcut_rename", handleShortcutRename);
    window.addEventListener("aethervault_shortcut_copy", handleShortcutCopy);
    window.addEventListener("aethervault_shortcut_cut", handleShortcutCut);
    window.addEventListener("aethervault_shortcut_paste", handleShortcutPaste);

    return () => {
      window.removeEventListener("aethervault_shortcut_upload", handleShortcutUpload);
      window.removeEventListener("aethervault_shortcut_new_folder", handleShortcutNewFolder);
      window.removeEventListener("aethervault_shortcut_delete", handleShortcutDelete);
      window.removeEventListener("aethervault_shortcut_permanent_delete", handleShortcutPermanentDelete);
      window.removeEventListener("aethervault_shortcut_esc", handleShortcutEsc);
      window.removeEventListener("aethervault_shortcut_select_all", handleShortcutSelectAll);
      window.removeEventListener("aethervault_shortcut_rename", handleShortcutRename);
      window.removeEventListener("aethervault_shortcut_copy", handleShortcutCopy);
      window.removeEventListener("aethervault_shortcut_cut", handleShortcutCut);
      window.removeEventListener("aethervault_shortcut_paste", handleShortcutPaste);
    };
  }, [selectedItem, processedItems, selectedIds, clipboard, currentFolder]);

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

    const handleDrop = async (e) => {
      e.preventDefault();
      setIsDragOver(false);
      
      if (e.dataTransfer.items) {
        const entries = [];
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const item = e.dataTransfer.items[i];
          if (item.kind === "file") {
            const entry = item.webkitGetAsEntry();
            if (entry) {
              entries.push(entry);
            }
          }
        }

        if (entries.length > 0) {
          let allFiles = [];
          for (const entry of entries) {
            const parsed = await traverseDirectory(entry, "");
            allFiles = allFiles.concat(parsed);
          }
          if (allFiles.length > 0) {
            handleUploadHierarchical(allFiles);
          }
        }
      } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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

          <button onClick={() => setShowNotesPanel(true)} className="btn btn-secondary" title="Personal Notes" style={{ background: "rgba(244, 114, 182, 0.15)", borderColor: "rgba(244, 114, 182, 0.4)", color: "#f472b6" }}>
            <FileText size={16} />
            <span>Notes</span>
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

      {/* Smart Filter Badges */}
      {(starredOnly || filterType !== "ALL" || activeTag) && (
        <div className="active-filters-row" style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "12px 0", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Active Filters:</span>
          {starredOnly && (
            <span 
              className="filter-badge glass"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "16px",
                fontSize: "0.78rem"
              }}
            >
              <span>Favorites</span>
              <button 
                onClick={() => setStarredOnly(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", padding: 0, color: "var(--text-secondary)" }}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filterType !== "ALL" && (
            <span 
              className="filter-badge glass"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "16px",
                fontSize: "0.78rem"
              }}
            >
              <span>{filterType.charAt(0) + filterType.slice(1).toLowerCase()}</span>
              <button 
                onClick={() => setFilterType("ALL")}
                style={{ background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", padding: 0, color: "var(--text-secondary)" }}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {activeTag && (
            <span 
              className="filter-badge glass"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: getTagColor(activeTag),
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "16px",
                fontSize: "0.78rem"
              }}
            >
              <span>{activeTag}</span>
              <button 
                onClick={() => setActiveTag(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", padding: 0, color: "#fff" }}
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button 
            onClick={() => {
              setStarredOnly(false);
              setFilterType("ALL");
              setActiveTag(null);
            }}
            style={{ 
              background: "transparent", 
              border: "none", 
              color: "var(--primary)", 
              fontSize: "0.75rem", 
              cursor: "pointer", 
              textDecoration: "underline" 
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {error && <div className="error-alert">{error}</div>}

      {/* Bulk Action & Clipboard paste toolbar */}
      {(selectedIds.length > 0 || clipboard) && (
        <div 
          className="bulk-actions-toolbar glass animate-fade-in"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(124, 58, 237, 0.15)",
            border: "1px solid var(--primary)",
            borderRadius: "12px",
            padding: "12px 20px",
            margin: "12px 0",
            gap: "15px",
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>
              {selectedIds.length} {selectedIds.length === 1 ? "item" : "items"} selected
            </span>
            {selectedIds.length > 0 && (
              <button 
                onClick={() => setSelectedIds([])}
                className="btn-gray" 
                style={{ fontSize: "0.75rem", padding: "4px 8px", minHeight: 0, height: "auto" }}
              >
                Deselect All
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={async () => {
                    const nextStarred = [...starredIds];
                    selectedIds.forEach(id => {
                      if (!nextStarred.includes(id)) nextStarred.push(id);
                    });
                    setStarredIds(nextStarred);
                    setSelectedIds([]);
                    toast.success("Added selected to Favorites");
                  }}
                  className="btn btn-secondary"
                  style={{ height: "32px", padding: "0 10px", fontSize: "0.8rem" }}
                >
                  Favorite
                </button>
                <button
                  onClick={() => {
                    const firstId = selectedIds[0];
                    const dummyItem = items.find(x => x._id === firstId);
                    if (dummyItem) {
                      setTagsItem(dummyItem);
                      setTagsInputValue("");
                      setShowTagsModal(true);
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ height: "32px", padding: "0 10px", fontSize: "0.8rem" }}
                >
                  Tag Selection
                </button>
                <button
                  onClick={async () => {
                    setClipboard({ type: "copy", itemIds: selectedIds, sourceFolderId: currentFolder?._id || null });
                    toast.success("Copied to clipboard");
                  }}
                  className="btn btn-secondary"
                  style={{ height: "32px", padding: "0 10px", fontSize: "0.8rem" }}
                >
                  Copy
                </button>
                <button
                  onClick={async () => {
                    setClipboard({ type: "cut", itemIds: selectedIds, sourceFolderId: currentFolder?._id || null });
                    toast.success("Cut to clipboard");
                  }}
                  className="btn btn-secondary"
                  style={{ height: "32px", padding: "0 10px", fontSize: "0.8rem" }}
                >
                  Cut
                </button>
                <button
                  onClick={async () => {
                    const confirmDelete = window.confirm(`Move ${selectedIds.length} items to Recycle Bin?`);
                    if (!confirmDelete) return;
                    
                    cancelRef.current = false;
                    setBulkProgress({ active: true, current: 0, total: selectedIds.length, actionName: "Moving to Recycle Bin" });
                    
                    try {
                      for (let i = 0; i < selectedIds.length; i++) {
                        if (cancelRef.current) break;
                        await api.moveToTrash(selectedIds[i]);
                        setBulkProgress(prev => prev ? { ...prev, current: i + 1 } : null);
                      }
                      setSelectedIds([]);
                      setBulkProgress(null);
                      if (onActionSuccess) onActionSuccess();
                      fetchFiles();
                    } catch (err) {
                      toast.error("Failed to delete: " + err.message);
                      setBulkProgress(null);
                    }
                  }}
                  className="btn btn-secondary text-danger"
                  style={{ height: "32px", padding: "0 10px", fontSize: "0.8rem" }}
                >
                  Delete Selected
                </button>
                <button
                  onClick={async () => {
                    cancelRef.current = false;
                    setBulkProgress({ active: true, current: 0, total: selectedIds.length, actionName: "Downloading files" });
                    try {
                      for (let i = 0; i < selectedIds.length; i++) {
                        if (cancelRef.current) break;
                        const link = document.createElement("a");
                        link.href = api.getDownloadUrl(selectedIds[i]);
                        link.download = "";
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setBulkProgress(prev => prev ? { ...prev, current: i + 1 } : null);
                        await new Promise(r => setTimeout(r, 400));
                      }
                      setSelectedIds([]);
                      setBulkProgress(null);
                    } catch (err) {
                      toast.error("Downloads failed: " + err.message);
                      setBulkProgress(null);
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ height: "32px", padding: "0 10px", fontSize: "0.8rem" }}
                >
                  Download
                </button>
              </>
            )}

            {clipboard && (
              <>
                <button
                  onClick={async () => {
                    const action = clipboard.type;
                    const itemsToPaste = clipboard.itemIds;
                    
                    cancelRef.current = false;
                    setBulkProgress({ active: true, current: 0, total: itemsToPaste.length, actionName: action === "copy" ? "Copying items" : "Moving items" });
                    
                    try {
                      for (let i = 0; i < itemsToPaste.length; i++) {
                        if (cancelRef.current) break;
                        const targetId = itemsToPaste[i];
                        if (action === "copy") {
                          await api.copyItem(targetId, currentFolder?._id || null);
                        } else {
                          await api.moveItem(targetId, currentFolder?._id || null);
                        }
                        setBulkProgress(prev => prev ? { ...prev, current: i + 1 } : null);
                      }
                      setClipboard(null);
                      setSelectedIds([]);
                      setBulkProgress(null);
                      if (onActionSuccess) onActionSuccess();
                      fetchFiles();
                    } catch (err) {
                      toast.error(`Paste failed: ` + err.message);
                      setBulkProgress(null);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ height: "32px", padding: "0 12px", fontSize: "0.8rem" }}
                >
                  Paste ({clipboard.type})
                </button>
                <button
                  onClick={() => setClipboard(null)}
                  className="btn-gray"
                  style={{ fontSize: "0.75rem", padding: "4px 8px", minHeight: 0, height: "auto" }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <FileBrowserSkeleton viewMode={viewMode} />
      ) : processedItems.length === 0 ? (
        <EmptyState
          icon={FolderClosed}
          title={
            search 
              ? "No search matches found" 
              : starredOnly || filterType === "FAVORITES"
              ? "No favorite items found"
              : filterType === "TAGGED" || activeTag
              ? "No files with matching tags"
              : filterType !== "ALL"
              ? "No files match this format"
              : "This folder is empty"
          }
          description={
            search 
              ? `We couldn't find any folders or files matching "${search}".` 
              : starredOnly || filterType === "FAVORITES"
              ? "Add items to favorites to see them here."
              : filterType === "TAGGED" || activeTag
              ? "Manage tags using item right-click context menu."
              : filterType !== "ALL"
              ? `There are no items matching format category "${filterType}".`
              : "This vault directory is currently empty. Drop files anywhere or secure them."
          }
          actionText={search || starredOnly || filterType !== "ALL" || activeTag ? "" : "Upload Files"}
          onAction={search || starredOnly || filterType !== "ALL" || activeTag ? null : () => fileInputRef.current.click()}
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
          {virtualItems.map((item) => (
            <motion.div
              key={item._id}
              variants={{
                hidden: { opacity: 0, y: 15 },
                show: { opacity: 1, y: 0 },
              }}
              tabIndex={0}
              role="button"
              aria-label={item.isFolder ? `Folder ${item.name}` : `File ${item.name}`}
              onKeyDown={(e) => handleKeyDownItem(e, item)}
              className={`file-card glass ${selectedIds.includes(item._id) ? "selected-item" : ""}`}
              onClick={(e) => {
                // If Shift key is pressed, select range
                if (e.shiftKey && lastSelectedId) {
                  const idxStart = processedItems.findIndex(x => x._id === lastSelectedId);
                  const idxEnd = processedItems.findIndex(x => x._id === item._id);
                  if (idxStart !== -1 && idxEnd !== -1) {
                    const min = Math.min(idxStart, idxEnd);
                    const max = Math.max(idxStart, idxEnd);
                    const idsToSelect = processedItems.slice(min, max + 1).map(x => x._id);
                    setSelectedIds(prev => {
                      const base = prev.filter(id => !idsToSelect.includes(id));
                      return [...base, ...idsToSelect];
                    });
                  }
                } else {
                  // Toggle selection or standard focus
                  setSelectedItem(item);
                  setLastSelectedId(item._id);
                  setSelectedIds(prev => 
                    prev.includes(item._id) ? prev.filter(x => x !== item._id) : [...prev, item._id]
                  );
                }
              }}
              onDoubleClick={() => (item.isFolder ? navigateIntoFolder(item) : (addToRecents(item, "viewed"), onPreviewSelect(item)))}
              onContextMenu={(e) => handleContextMenu(e, item)}
              whileHover={{ y: -4 }}
            >
              <div className="file-card-top" style={{ position: "relative" }}>
                <input 
                  type="checkbox"
                  checked={selectedIds.includes(item._id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    setLastSelectedId(item._id);
                    setSelectedIds(prev => 
                      prev.includes(item._id) ? prev.filter(x => x !== item._id) : [...prev, item._id]
                    );
                  }}
                  style={{ position: "absolute", top: "10px", left: "10px", zIndex: 10, cursor: "pointer" }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div style={{ marginLeft: "28px", display: "flex", alignItems: "center" }}>
                  {item.isFolder ? <FolderClosed size={44} color="var(--primary)" /> : getFileIcon(item.mimeType)}
                </div>

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
                {inlineRenameId === item._id ? (
                  <input
                    type="text"
                    value={inlineRenameValue}
                    onChange={(e) => setInlineRenameValue(e.target.value)}
                    onBlur={() => handleInlineRenameSubmit(item._id, inlineRenameValue)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleInlineRenameSubmit(item._id, inlineRenameValue);
                      } else if (e.key === "Escape") {
                        setInlineRenameId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="input-field"
                    style={{ fontSize: "0.8rem", padding: "4px 8px", width: "100%", margin: "4px 0" }}
                    autoFocus
                  />
                ) : (
                  <p className="file-name" title={item.name}>
                    {renderHighlightedName(item.name, search)}
                  </p>
                )}
                {/* Tag badges row */}
                {(tagsMap[item._id] || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", margin: "4px 0 8px 0" }}>
                    {(tagsMap[item._id] || []).slice(0, 3).map((tag, idx) => (
                      <span 
                        key={idx} 
                        className={`tag-badge ${activeTag === tag ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTag(prev => prev === tag ? null : tag);
                        }}
                        style={{ 
                          background: getTagColor(tag), 
                          color: "#fff", 
                          padding: "2px 6px", 
                          borderRadius: "6px", 
                          fontSize: "0.65rem", 
                          fontWeight: "600",
                          cursor: "pointer",
                          border: activeTag === tag ? "1.5px solid #fff" : "none"
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {(tagsMap[item._id] || []).length > 3 && (
                      <span 
                        className="tag-badge-more"
                        style={{ 
                          background: "rgba(255, 255, 255, 0.1)", 
                          color: "var(--text-secondary)", 
                          padding: "2px 6px", 
                          borderRadius: "6px", 
                          fontSize: "0.65rem", 
                          fontWeight: "600" 
                        }}
                      >
                        +{(tagsMap[item._id] || []).length - 3} more
                      </span>
                    )}
                  </div>
                )}
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
                <th style={{ width: "40px", paddingLeft: "12px" }}>
                  <input 
                    type="checkbox" 
                    checked={processedItems.length > 0 && selectedIds.length === processedItems.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(processedItems.map(x => x._id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th>Name</th>
                <th style={{ width: "130px" }}>Format</th>
                <th style={{ width: "120px" }}>Size</th>
                <th style={{ width: "160px" }}>Last Modified</th>
                <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {virtualItems.map((item) => (
                <tr
                  key={item._id}
                  tabIndex={0}
                  role="row"
                  aria-label={item.isFolder ? `Folder ${item.name}` : `File ${item.name}`}
                  onKeyDown={(e) => handleKeyDownItem(e, item)}
                  onClick={(e) => {
                    if (e.shiftKey && lastSelectedId) {
                      const idxStart = processedItems.findIndex(x => x._id === lastSelectedId);
                      const idxEnd = processedItems.findIndex(x => x._id === item._id);
                      if (idxStart !== -1 && idxEnd !== -1) {
                        const min = Math.min(idxStart, idxEnd);
                        const max = Math.max(idxStart, idxEnd);
                        const idsToSelect = processedItems.slice(min, max + 1).map(x => x._id);
                        setSelectedIds(prev => {
                          const base = prev.filter(id => !idsToSelect.includes(id));
                          return [...base, ...idsToSelect];
                        });
                      }
                    } else {
                      setSelectedItem(item);
                      setLastSelectedId(item._id);
                      setSelectedIds(prev => 
                        prev.includes(item._id) ? prev.filter(x => x !== item._id) : [...prev, item._id]
                      );
                    }
                  }}
                  onDoubleClick={() => (item.isFolder ? navigateIntoFolder(item) : (addToRecents(item, "viewed"), onPreviewSelect(item)))}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  className={selectedIds.includes(item._id) ? "selected-item-row" : ""}
                >
                  <td style={{ paddingLeft: "12px" }}>
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(item._id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setLastSelectedId(item._id);
                        setSelectedIds(prev => 
                          prev.includes(item._id) ? prev.filter(x => x !== item._id) : [...prev, item._id]
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
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
                      {inlineRenameId === item._id ? (
                        <input
                          type="text"
                          value={inlineRenameValue}
                          onChange={(e) => setInlineRenameValue(e.target.value)}
                          onBlur={() => handleInlineRenameSubmit(item._id, inlineRenameValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleInlineRenameSubmit(item._id, inlineRenameValue);
                            } else if (e.key === "Escape") {
                              setInlineRenameId(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="input-field"
                          style={{ fontSize: "0.8rem", padding: "2px 6px", width: "200px", display: "inline-block", margin: "0 8px" }}
                          autoFocus
                        />
                      ) : (
                        <span className="list-name-text" title={item.name}>
                          {renderHighlightedName(item.name, search)}
                        </span>
                      )}
                      {/* List row tag chips */}
                      {(tagsMap[item._id] || []).length > 0 && (
                        <div style={{ display: "inline-flex", flexWrap: "wrap", gap: "4px", marginLeft: "12px" }}>
                          {(tagsMap[item._id] || []).slice(0, 3).map((tag, idx) => (
                            <span 
                              key={idx} 
                              className={`tag-badge ${activeTag === tag ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTag(prev => prev === tag ? null : tag);
                              }}
                              style={{ 
                                background: getTagColor(tag), 
                                color: "#fff", 
                                padding: "1px 5px", 
                                borderRadius: "4px", 
                                fontSize: "0.65rem", 
                                fontWeight: "600",
                                cursor: "pointer",
                                border: activeTag === tag ? "1.5px solid #fff" : "none"
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {(tagsMap[item._id] || []).length > 3 && (
                            <span 
                              style={{ 
                                background: "rgba(255, 255, 255, 0.1)", 
                                color: "var(--text-secondary)", 
                                padding: "1px 5px", 
                                borderRadius: "4px", 
                                fontSize: "0.65rem", 
                                fontWeight: "600" 
                              }}
                            >
                              +{(tagsMap[item._id] || []).length - 3} more
                            </span>
                          )}
                        </div>
                      )}
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

      {/* Floating Upload Queue Manager Panel */}
      {showQueuePanel && uploadQueue.length > 0 && (
        <div 
          className="progress-card glass animate-fade-in" 
          style={{
            ...styles.progressCard,
            width: "360px",
            maxHeight: "400px",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            overflow: "hidden",
            padding: "0"
          }}
        >
          {/* Header */}
          <div 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              padding: "12px 16px", 
              background: "rgba(124, 58, 237, 0.2)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Upload size={14} color="var(--primary)" />
              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>
                Uploads ({uploadQueue.filter(x => x.status === "done").length}/{uploadQueue.length})
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => {
                  setUploadQueue(prev => prev.filter(x => x.status !== "done"));
                }}
                style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "0.72rem", cursor: "pointer" }}
              >
                Clear Completed
              </button>
              <button 
                onClick={() => setShowQueuePanel(false)}
                className="btn-icon"
                style={{ padding: "4px", minWidth: 0, height: "auto" }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Queue Items List */}
          <div style={{ flexGrow: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {uploadQueue.map((item) => (
              <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyGroup: "space-between", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", maxWidth: "200px" }}>
                    <span 
                      style={{ fontSize: "0.78rem", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      title={item.relativePath || item.name}
                    >
                      {item.name}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                      {formatSize(item.size)} • {item.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {item.status === "uploading" && (
                      <button 
                        onClick={() => {
                          if (item.xhr) item.xhr.abort();
                          setUploadQueue(prev => prev.map(x => x.id === item.id ? { ...x, status: "paused" } : x));
                        }}
                        className="btn-gray"
                        style={{ fontSize: "0.65rem", padding: "2px 6px", height: "auto", minHeight: 0 }}
                      >
                        Pause
                      </button>
                    )}
                    {item.status === "paused" && (
                      <button 
                        onClick={() => {
                          setUploadQueue(prev => prev.map(x => x.id === item.id ? { ...x, status: "queued", progress: 0 } : x));
                        }}
                        className="btn-purple"
                        style={{ fontSize: "0.65rem", padding: "2px 6px", height: "auto", minHeight: 0 }}
                      >
                        Resume
                      </button>
                    )}
                    {item.status === "error" && (
                      <button 
                        onClick={() => {
                          setUploadQueue(prev => prev.map(x => x.id === item.id ? { ...x, status: "queued", progress: 0 } : x));
                        }}
                        className="btn-purple"
                        style={{ fontSize: "0.65rem", padding: "2px 6px", height: "auto", minHeight: 0 }}
                      >
                        Retry
                      </button>
                    )}
                    {item.status !== "done" && (
                      <button 
                        onClick={() => {
                          if (item.xhr) item.xhr.abort();
                          setUploadQueue(prev => prev.filter(x => x.id !== item.id));
                        }}
                        style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", padding: "4px" }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                  <div 
                    style={{ 
                      height: "100%", 
                      width: `${item.progress}%`, 
                      background: item.status === "error" ? "var(--danger)" : item.status === "paused" ? "var(--warning)" : "var(--primary)",
                      transition: "width 0.2s ease" 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Progress Dialog */}
      {bulkProgress && bulkProgress.active && (
        <div className="modal-backdrop" style={{ ...styles.modalBackdrop, zIndex: 10001 }}>
          <div className="modal-card glass" style={{ ...styles.modalCard, width: "320px" }}>
            <h3 style={styles.modalTitle}>{bulkProgress.actionName}</h3>
            <div style={{ margin: "16px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <span>Progress: {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                <span>{bulkProgress.current} / {bulkProgress.total}</span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                <div 
                  style={{ 
                    height: "100%", 
                    width: `${(bulkProgress.current / bulkProgress.total) * 100}%`, 
                    background: "var(--primary)",
                    transition: "width 0.2s ease" 
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={() => {
                  cancelRef.current = true;
                  setBulkProgress(null);
                  toast.success("Cancellation requested");
                }}
                className="btn btn-secondary"
                style={{ fontSize: "0.75rem", padding: "6px 12px" }}
              >
                Cancel
              </button>
            </div>
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
            onManageTags={() => {
              setTagsItem(contextMenu.item);
              setTagsInputValue("");
              setShowTagsModal(true);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            onShare={() => {
              setShareItem(contextMenu.item);
              setShareExpiry("never");
              setSharePasscode("");
              setGeneratedLink("");
              setShowShareModal(true);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            onVersionHistory={() => {
              setVersionItem(contextMenu.item);
              loadVersionHistory(contextMenu.item);
              setShowVersionModal(true);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            onComments={() => {
              setCommentsItem(contextMenu.item);
              loadComments(contextMenu.item._id);
              setShowCommentsModal(true);
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
      <AnimatePresence>
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
      </AnimatePresence>

      {/* Manage Tags Dialog */}
      <AnimatePresence>
        {showTagsModal && tagsItem && (
          <div className="modal-backdrop" onClick={() => setShowTagsModal(false)} style={styles.modalBackdrop}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="modal-card glass"
              onClick={(e) => e.stopPropagation()}
              style={styles.modalCard}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={styles.modalTitle}>Manage Tags</h3>
                <button
                  onClick={() => setShowTagsModal(false)}
                  style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                Active tags for <strong>{tagsItem.name}</strong>:
              </div>

              {/* Tags List */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
                {(tagsMap[tagsItem._id] || []).length === 0 ? (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    No tags assigned to this item.
                  </span>
                ) : (
                  (tagsMap[tagsItem._id] || []).map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="tag-badge"
                      style={{ 
                        background: getTagColor(tag), 
                        color: "#fff", 
                        padding: "4px 8px", 
                        borderRadius: "8px", 
                        fontSize: "0.72rem", 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "6px",
                        fontWeight: "600" 
                      }}
                    >
                      <span>{tag}</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          const currentTags = tagsMap[tagsItem._id] || [];
                          const filtered = currentTags.filter(t => t !== tag);
                          saveTags(tagsItem._id, filtered);
                          toast.success(`Removed tag "${tag}"`);
                        }}
                        style={{ background: "transparent", border: "none", cursor: "pointer", display: "inline-flex", color: "#fff", padding: 0 }}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add Tag Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = tagsInputValue.trim().toLowerCase();
                  if (!val) return;
                  if (val.length > 20) {
                    toast.error("Tag is too long (max 20 characters)");
                    return;
                  }
                  const currentTags = tagsMap[tagsItem._id] || [];
                  if (currentTags.includes(val)) {
                    toast.error(`"${val}" tag is already assigned`);
                    return;
                  }
                  const updated = [...currentTags, val];
                  saveTags(tagsItem._id, updated);
                  setTagsInputValue("");
                  toast.success(`Added tag "${val}"`);
                }}
                style={{ display: "flex", gap: "8px" }}
              >
                <input 
                  type="text" 
                  className="input-field" 
                  value={tagsInputValue} 
                  onChange={(e) => setTagsInputValue(e.target.value)} 
                  placeholder="Add new tag..."
                  style={{ flexGrow: 1 }}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" style={{ padding: "8px 16px" }}>
                  Add
                </button>
              </form>

              <button 
                onClick={() => setShowTagsModal(false)} 
                className="btn btn-secondary" 
                style={{ width: "100%", marginTop: "16px" }}
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Properties Modal */}
      <AnimatePresence>
        {showPropertiesModal && propertiesItem && (
          <div
            className="modal-backdrop"
            onClick={() => {
              setShowPropertiesModal(false);
              setPropertiesItem(null);
            }}
            style={styles.modalBackdrop}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="modal-card glass"
              onClick={(e) => e.stopPropagation()}
              style={styles.modalCard}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={styles.modalTitle}>Item Properties</h3>
                <button
                  onClick={() => {
                    setShowPropertiesModal(false);
                    setPropertiesItem(null);
                  }}
                  style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={styles.propertiesList}>
                <div style={styles.propRow}>
                  <span style={styles.propLabel}>Name:</span>
                  <span style={styles.propVal} title={propertiesItem.name}>
                    {propertiesItem.name}
                  </span>
                </div>
                <div style={styles.propRow}>
                  <span style={styles.propLabel}>Type:</span>
                  <span style={styles.propVal}>
                    {propertiesItem.isFolder ? "Folder" : propertiesItem.mimeType || "Unknown"}
                  </span>
                </div>
                {!propertiesItem.isFolder && (
                  <div style={styles.propRow}>
                    <span style={styles.propLabel}>Size:</span>
                    <span style={styles.propVal}>{formatSize(propertiesItem.size)}</span>
                  </div>
                )}
                <div style={styles.propRow}>
                  <span style={styles.propLabel}>Created At:</span>
                  <span style={styles.propVal}>
                    {new Date(propertiesItem.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={styles.propRow}>
                  <span style={styles.propLabel}>Modified At:</span>
                  <span style={styles.propVal}>
                    {new Date(propertiesItem.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowPropertiesModal(false);
                  setPropertiesItem(null);
                }}
                className="btn btn-secondary"
                style={{ width: "100%", marginTop: "16px" }}
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shared Links Modal */}
      <AnimatePresence>
        {showShareModal && shareItem && (
          <div className="modal-backdrop" onClick={() => setShowShareModal(false)} style={styles.modalBackdrop}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-card glass"
              onClick={(e) => e.stopPropagation()}
              style={{ ...styles.modalCard, maxWidth: "420px" }}
            >
              <h3 style={styles.modalTitle}>Share "{shareItem.name}"</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "10px 0" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Link Expiry</label>
                  <select 
                    value={shareExpiry} 
                    onChange={(e) => setShareExpiry(e.target.value)}
                    className="input-field"
                    style={{ width: "100%" }}
                  >
                    <option value="never">Never Expires</option>
                    <option value="1day">1 Day</option>
                    <option value="7days">7 Days</option>
                    <option value="30days">30 Days</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Passcode Protection (Optional)</label>
                  <input 
                    type="password" 
                    placeholder="Enter passcode"
                    value={sharePasscode}
                    onChange={(e) => setSharePasscode(e.target.value)}
                    className="input-field"
                    style={{ width: "100%" }}
                  />
                </div>

                <button onClick={handleGenerateShareLink} className="btn btn-primary" style={{ marginTop: "8px" }}>
                  Generate Link
                </button>

                {generatedLink && (
                  <div style={{ marginTop: "12px", background: "rgba(255,255,255,0.04)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Generated URL:</span>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <input 
                        type="text" 
                        readOnly 
                        value={generatedLink} 
                        className="input-field" 
                        style={{ flexGrow: 1, fontSize: "0.75rem", padding: "4px 8px" }}
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(generatedLink);
                          toast.success("Link copied!");
                        }}
                        className="btn btn-primary"
                        style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => { setShowShareModal(false); setShareItem(null); }} className="btn btn-secondary" style={{ width: "100%", marginTop: "8px" }}>
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Version History Modal */}
      <AnimatePresence>
        {showVersionModal && versionItem && (
          <div className="modal-backdrop" onClick={() => setShowVersionModal(false)} style={styles.modalBackdrop}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-card glass"
              onClick={(e) => e.stopPropagation()}
              style={{ ...styles.modalCard, maxWidth: "450px" }}
            >
              <h3 style={styles.modalTitle}>Version History: {versionItem.name}</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "12px 0", maxHeight: "250px", overflowY: "auto" }}>
                {versionsList.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "16px 0", fontSize: "0.85rem" }}>
                    No previous versions logged.
                  </div>
                ) : (
                  versionsList.map((ver, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>Version {versionsList.length - idx}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{new Date(ver.createdAt).toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatSize(ver.size)}</span>
                        <button 
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = api.getDownloadUrl(ver._id);
                            link.download = ver.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            toast.success("Downloading version...");
                          }}
                          className="btn-purple"
                          style={{ fontSize: "0.7rem", padding: "3px 8px" }}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button onClick={() => { setShowVersionModal(false); setVersionItem(null); }} className="btn btn-secondary" style={{ width: "100%" }}>
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <AnimatePresence>
        {showCommentsModal && commentsItem && (
          <div className="modal-backdrop" onClick={() => setShowCommentsModal(false)} style={styles.modalBackdrop}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-card glass"
              onClick={(e) => e.stopPropagation()}
              style={{ ...styles.modalCard, maxWidth: "450px" }}
            >
              <h3 style={styles.modalTitle}>Comments: {commentsItem.name}</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "12px 0", maxHeight: "250px", overflowY: "auto", paddingRight: "6px" }}>
                {commentsList.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px 0", fontSize: "0.85rem" }}>
                    No comments yet. Be the first to say something!
                  </div>
                ) : (
                  commentsList.map((c, idx) => (
                    <div key={idx} style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--primary-light)" }}>{c.username}</span>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{new Date(c.timestamp).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#e5e7eb", lineHeight: "1.4" }}>{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <input 
                  type="text"
                  placeholder="Write a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="input-field"
                  style={{ flexGrow: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddComment();
                  }}
                />
                <button onClick={handleAddComment} className="btn btn-primary">
                  Post
                </button>
              </div>

              <button onClick={() => { setShowCommentsModal(false); setCommentsItem(null); }} className="btn btn-secondary" style={{ width: "100%", marginTop: "12px" }}>
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Personal Notes Sidebar Panel / Drawer */}
      <AnimatePresence>
        {showNotesPanel && (
          <div className="modal-backdrop" onClick={() => setShowNotesPanel(false)} style={{ ...styles.modalBackdrop, zIndex: 10002 }}>
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="modal-card glass"
              onClick={(e) => e.stopPropagation()}
              style={{ 
                ...styles.modalCard, 
                position: "fixed", 
                right: 0, 
                top: 0, 
                height: "100vh", 
                width: "400px", 
                maxWidth: "100vw",
                borderRadius: "0", 
                zIndex: 10003,
                boxShadow: "-10px 0 30px rgba(0,0,0,0.5)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={styles.modalTitle}>Workspace Personal Notes</h3>
                <button onClick={() => setShowNotesPanel(false)} className="btn-icon">
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0 10px 0" }}>
                Write markdown text here. Saved automatically to local browser vault storage.
              </p>

              <textarea
                value={personalNotes}
                onChange={(e) => {
                  setPersonalNotes(e.target.value);
                  localStorage.setItem("aethervault_notes", e.target.value);
                }}
                className="input-field"
                style={{ 
                  flexGrow: 1, 
                  fontFamily: "monospace", 
                  fontSize: "0.85rem", 
                  lineHeight: "1.5", 
                  padding: "12px", 
                  background: "rgba(0,0,0,0.25)",
                  resize: "none"
                }}
                placeholder="# Scratchpad..."
              />

              <button onClick={() => setShowNotesPanel(false)} className="btn btn-primary" style={{ width: "100%", marginTop: "12px" }}>
                Close Notes
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
