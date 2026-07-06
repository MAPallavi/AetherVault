import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Loader2, FolderClosed, FileText, RotateCcw, Trash2, AlertTriangle, Trash } from "lucide-react";
import { toast } from "react-hot-toast";
import { RowSkeleton } from "./Skeleton";
import EmptyState from "./EmptyState";

export default function RecycleBin({ onActionSuccess }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    fetchBinItems();
  }, []);

  const fetchBinItems = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listFiles(null, "", true); // Load with trash=true
      setItems(data);
    } catch (err) {
      setError("Failed to fetch deleted items.");
      toast.error("Failed to load Recycle Bin");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    setError("");
    setActioningId(id);
    const toastId = toast.loading("Restoring item from Recycle Bin...");
    try {
      await api.restoreFromTrash(id);
      setItems(items.filter((item) => item._id !== id));
      toast.success("Item restored successfully", { id: toastId });
      if (onActionSuccess) onActionSuccess(); // Notify to refresh sidebar stats
    } catch (err) {
      toast.error(err.message || "Failed to restore item.", { id: toastId });
      setError(err.message || "Failed to restore item.");
    } finally {
      setActioningId(null);
    }
  };

  const handlePurge = async (id, name, isFolder) => {
    const confirmation = window.confirm(
      `Are you sure you want to permanently delete "${name}"? ${
        isFolder ? "All subdirectories and files will be permanently erased." : "This action cannot be undone."
      }`
    );
    if (!confirmation) return;

    setError("");
    setActioningId(id);
    const toastId = toast.loading("Permanently deleting file bytes...");
    try {
      await api.purgeItem(id);
      setItems(items.filter((item) => item._id !== id));
      toast.success(`"${name}" permanently deleted`, { id: toastId });
      if (onActionSuccess) onActionSuccess(); // Notify to refresh sidebar stats
    } catch (err) {
      toast.error(err.message || "Failed to purge item.", { id: toastId });
      setError(err.message || "Failed to purge item.");
    } finally {
      setActioningId(null);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div style={styles.tablePanel} className="glass-panel">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="main-content animate-fade-in" style={{ width: "100%" }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Recycle Bin</h1>
          <p style={styles.pageSubtitle}>Recover soft-deleted items or permanently erase them from storage</p>
        </div>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      {items.length > 0 && (
        <div style={styles.warningAlert}>
          <AlertTriangle size={18} color="#ffd740" style={{ flexShrink: 0 }} />
          <span>Permanently deleting items will destroy their AES-256 decryption keys and delete their binary files from disk.</span>
        </div>
      )}

      <div className="glass-panel" style={styles.tablePanel}>
        <div style={styles.tableWrapper}>
          {items.length === 0 ? (
            <EmptyState
              icon={Trash}
              title="Your Recycle Bin is empty"
              description="Soft-deleted files and folders will appear here for recovery before permanent erasure."
            />
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Name</th>
                  <th style={{ ...styles.th, width: "120px" }}>Type</th>
                  <th style={{ ...styles.th, width: "120px" }}>Size</th>
                  <th style={{ ...styles.th, width: "180px" }}>Deleted On</th>
                  <th style={{ ...styles.th, width: "150px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} style={styles.tr}>
                    <td style={{ ...styles.td, color: "#fff", fontWeight: "500" }}>
                      <div style={styles.nameCell}>
                        {item.isFolder ? (
                          <FolderClosed size={18} color="#9d4edd" />
                        ) : (
                          <FileText size={18} color="#3b82f6" />
                        )}
                        <span style={styles.itemName} title={item.name}>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ ...styles.td, color: "var(--text-secondary)" }}>
                      {item.isFolder ? "Folder" : item.mimeType.split("/")[1] || "File"}
                    </td>
                    <td style={{ ...styles.td, color: "var(--text-secondary)" }}>
                      {item.isFolder ? "—" : formatSize(item.size)}
                    </td>
                    <td style={{ ...styles.td, color: "var(--text-muted)" }}>
                      {new Date(item.updatedAt).toLocaleDateString() + " " + new Date(item.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <div style={styles.actionCell}>
                        <button
                          onClick={() => handleRestore(item._id)}
                          className="btn-icon"
                          title="Restore item"
                          disabled={actioningId !== null}
                        >
                          {actioningId === item._id ? (
                            <Loader2 className="spinner" size={16} />
                          ) : (
                            <RotateCcw size={16} color="#ffd740" />
                          )}
                        </button>
                        <button
                          onClick={() => handlePurge(item._id, item.name, item.isFolder)}
                          className="btn-icon"
                          title="Permanently delete"
                          disabled={actioningId !== null}
                        >
                          {actioningId === item._id ? (
                            <Loader2 className="spinner" size={16} />
                          ) : (
                            <Trash2 size={16} color="#ef4444" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  pageTitle: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#fff",
    margin: 0,
  },
  pageSubtitle: {
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    marginTop: "4px",
    marginBottom: 0,
  },
  errorAlert: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "10px",
    padding: "12px",
    color: "#fca5a5",
    fontSize: "0.85rem",
    marginBottom: "10px",
  },
  warningAlert: {
    background: "rgba(255, 215, 64, 0.05)",
    border: "1px solid rgba(255, 215, 64, 0.15)",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#ffe082",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    lineHeight: "1.4",
    marginBottom: "16px",
  },
  tablePanel: {
    padding: "16px",
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  tableWrapper: {
    overflow: "auto",
    flexGrow: 1,
    height: "100%",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  thRow: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  th: {
    padding: "12px 16px",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontWeight: "600",
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
  },
  td: {
    padding: "12px 16px",
    fontSize: "0.9rem",
    verticalAlign: "middle",
  },
  nameCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    maxWidth: "300px",
  },
  itemName: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  actionCell: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  },
};
