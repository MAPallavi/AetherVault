import React from "react";
import { motion } from "framer-motion";
import { FolderOpen, Eye, Download, Edit2, Trash2, Info, Star, Tag, Share2, History, MessageSquare } from "lucide-react";

export default function ContextMenu({ 
  x, 
  y, 
  item, 
  onOpen, 
  onDownload, 
  onRename, 
  onDelete, 
  onProperties, 
  isStarred, 
  onStar, 
  onManageTags,
  onShare,
  onVersionHistory,
  onComments
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      style={{
        ...styles.menu,
        top: `${y}px`,
        left: `${x}px`,
      }}
      className="glass"
      onClick={(e) => e.stopPropagation()}
    >
      {item.isFolder ? (
        <button onClick={onOpen} style={styles.item} className="context-item">
          <FolderOpen size={14} color="#9d4edd" />
          <span>Open Folder</span>
        </button>
      ) : (
        <button onClick={onOpen} style={styles.item} className="context-item">
          <Eye size={14} color="#3b82f6" />
          <span>Preview</span>
        </button>
      )}

      <button onClick={onDownload} style={styles.item} className="context-item">
        <Download size={14} color="#10b981" />
        <span>Download</span>
      </button>

      <button onClick={onRename} style={styles.item} className="context-item">
        <Edit2 size={14} color="#ffd740" />
        <span>Rename</span>
      </button>

      <button onClick={onStar} style={styles.item} className="context-item">
        <Star size={14} color="#ffd740" fill={isStarred ? "#ffd740" : "transparent"} />
        <span>{isStarred ? "Remove Favorite" : "Add Favorite"}</span>
      </button>

      <button onClick={onManageTags} style={styles.item} className="context-item">
        <Tag size={14} color="#a855f7" />
        <span>Manage Tags</span>
      </button>

      <button onClick={onShare} style={styles.item} className="context-item">
        <Share2 size={14} color="#f472b6" />
        <span>Shared Links</span>
      </button>

      <button onClick={onVersionHistory} style={styles.item} className="context-item">
        <History size={14} color="#fbbf24" />
        <span>Version History</span>
      </button>

      <button onClick={onComments} style={styles.item} className="context-item">
        <MessageSquare size={14} color="#38bdf8" />
        <span>Comments</span>
      </button>

      <button onClick={onProperties} style={styles.item} className="context-item">
        <Info size={14} color="#18ffff" />
        <span>Properties</span>
      </button>

      <div style={styles.divider}></div>

      <button onClick={onDelete} style={{ ...styles.item, ...styles.danger }} className="context-item danger">
        <Trash2 size={14} color="#ef4444" />
        <span>Delete</span>
      </button>
    </motion.div>
  );
}

const styles = {
  menu: {
    position: "fixed",
    minWidth: "170px",
    background: "rgba(15, 18, 30, 0.95)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    boxShadow: "0 12px 36px rgba(0,0,0,0.6)",
    zIndex: 9999,
    backdropFilter: "blur(12px)",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    color: "#e5e7eb",
    textAlign: "left",
    borderRadius: "6px",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "background 0.2s ease, transform 0.1s ease",
  },
  danger: {
    color: "#fca5a5",
  },
  divider: {
    height: "1px",
    background: "rgba(255, 255, 255, 0.06)",
    margin: "4px 6px"
  }
};
