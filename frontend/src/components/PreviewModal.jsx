import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import { X, Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";

export default function PreviewModal({ file, onClose, onActionSuccess }) {
  const [textContents, setTextContents] = useState("");
  const [loadingText, setLoadingText] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fileName, setFileName] = useState(file.name);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(file.name);

  const previewUrl = api.getPreviewUrl(file._id);
  const downloadUrl = api.getDownloadUrl(file._id);
  const mime = file.mimeType.toLowerCase();

  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const isPdf = mime === "application/pdf";
  const isMarkdown = file.name.toLowerCase().endsWith(".md");
  const isText =
    mime.startsWith("text/") ||
    isMarkdown ||
    mime === "application/json" ||
    mime === "application/javascript" ||
    mime === "application/xml";

  useEffect(() => {
    if (isText) {
      fetchTextContents();
    }
  }, [file]);

  const fetchTextContents = async () => {
    setLoadingText(true);
    try {
      const res = await fetch(previewUrl);
      if (res.ok) {
        const text = await res.text();
        setTextContents(text);
      } else {
        setTextContents("Failed to load text preview contents.");
      }
    } catch (err) {
      setTextContents("Error loading file preview.");
    } finally {
      setLoadingText(false);
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    const toastId = toast.loading("Renaming file...");
    try {
      await api.renameItem(file._id, renameValue.trim());
      setFileName(renameValue.trim());
      setRenaming(false);
      toast.success("File renamed successfully", { id: toastId });
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      toast.error(err.message || "Failed to rename file", { id: toastId });
    }
  };

  const handleDeleteClick = async () => {
    const confirmation = window.confirm(`Move "${fileName}" to the Recycle Bin?`);
    if (!confirmation) return;
    const toastId = toast.loading("Moving file to Recycle Bin...");
    try {
      await api.moveToTrash(file._id);
      toast.success(`"${fileName}" moved to Recycle Bin`, { id: toastId });
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to delete file", { id: toastId });
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const parseMarkdown = (md) => {
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/\`\`\`([\s\S]*?)\`\`\`/gim, '<pre style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 6px; overflow-x: auto;"><code>$1</code></pre>');
    html = html.replace(/\`(.*?)\`/gim, '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px;">$1</code>');
    html = html.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>').replace(/<\/ul>\s*<ul>/g, "");
    html = html.replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>').replace(/<\/ul>\s*<ul>/g, "");
    html = html.replace(/\n\n/g, '<br/>');
    return html;
  };

  const renderContent = () => {
    if (isImage) {
      return (
        <div style={{ ...styles.mediaContainer, overflow: "auto" }}>
          <img
            src={previewUrl}
            alt={fileName}
            style={{
              ...styles.imagePreview,
              transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
              transition: "transform 0.1s ease",
            }}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div style={styles.mediaContainer}>
          <video src={previewUrl} controls autoPlay style={styles.videoPreview}>
            Your browser does not support HTML5 video preview.
          </video>
        </div>
      );
    }

    if (isAudio) {
      return (
        <div style={styles.audioContainer}>
          <audio src={previewUrl} controls autoPlay style={styles.audioPreview}>
            Your browser does not support HTML5 audio preview.
          </audio>
        </div>
      );
    }

    if (isPdf) {
      return (
        <div style={styles.pdfContainer}>
          <iframe src={previewUrl} title={fileName} style={styles.pdfIframe}></iframe>
        </div>
      );
    }

    if (isMarkdown) {
      if (loadingText) {
        return (
          <div style={styles.centerLoading}>
            <Loader2 className="spinner" size={32} color="#7c3aed" />
          </div>
        );
      }
      return (
        <div style={{ ...styles.textContainer, padding: "24px", color: "#e5e7eb", lineHeight: "1.6", overflowY: "auto", height: "100%" }} dangerouslySetInnerHTML={{ __html: parseMarkdown(textContents) }} />
      );
    }

    if (isText) {
      if (loadingText) {
        return (
          <div style={styles.centerLoading}>
            <Loader2 className="spinner" size={32} color="#7c3aed" />
          </div>
        );
      }
      return (
        <div style={styles.textContainer}>
          <pre style={styles.preCode}>
            <code>{textContents}</code>
          </pre>
        </div>
      );
    }

    // Default Fallback
    return (
      <div style={styles.fallbackContainer}>
        <div style={styles.fallbackIcon}>
          <FileText size={64} color="var(--text-secondary)" />
        </div>
        <h3 style={styles.fallbackTitle}>{fileName}</h3>
        <p style={styles.fallbackMeta}>
          {formatSize(file.size)} • {file.mimeType}
        </p>
        <p style={styles.fallbackText}>
          No preview is available for this file type. You can download it to view locally.
        </p>
        <a href={downloadUrl} className="btn-purple" style={{ ...styles.actionBtn, marginTop: "16px" }}>
          <Download size={18} />
          <span>Download File</span>
        </a>
      </div>
    );
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div className="glass-panel" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <span style={styles.fileName}>{fileName}</span>
            <span style={styles.fileSize}>({formatSize(file.size)})</span>
          </div>
          <button onClick={onClose} className="btn-icon" title="Close" style={{ minWidth: 0, padding: "8px" }}>
            <X size={18} />
          </button>
        </div>

        {/* Two-Pane Workspace Layout */}
        <div style={styles.mainContainer}>
          {/* Left Canvas Panel */}
          <div style={styles.leftPane}>
            {(isImage || isPdf || isVideo) && (
              <div style={styles.zoomBar}>
                {isImage && (
                  <>
                    <button
                      onClick={() => setZoomScale((s) => Math.max(s - 0.25, 0.5))}
                      className="btn-gray"
                      style={styles.zoomBtn}
                    >
                      -
                    </button>
                    <span style={{ fontSize: "0.8rem", color: "#fff", fontWeight: "600" }}>
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomScale((s) => Math.min(s + 0.25, 3))}
                      className="btn-gray"
                      style={styles.zoomBtn}
                    >
                      +
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="btn-gray"
                      style={styles.zoomBtn}
                    >
                      Rotate
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="btn-gray"
                  style={styles.zoomBtn}
                >
                  Fullscreen
                </button>
                <button 
                  onClick={() => {
                    setZoomScale(1);
                    setRotation(0);
                  }} 
                  className="btn-gray" 
                  style={styles.zoomBtn}
                >
                  Reset
                </button>
              </div>
            )}
            <div style={styles.contentWrapper}>{renderContent()}</div>
          </div>

          {/* Right Info Details Panel */}
          <div style={styles.rightPane}>
            <div style={styles.metaSection}>
              <h4 style={styles.sectionTitle}>File Information</h4>

              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Name:</span>
                {renaming ? (
                  <form onSubmit={handleRenameSubmit} style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
                    <input
                      type="text"
                      className="input-field"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button type="submit" className="btn-purple" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenaming(false)}
                        className="btn-gray"
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <span
                    style={{ ...styles.metaValue, cursor: "pointer", borderBottom: "1px dashed var(--primary)" }}
                    onClick={() => setRenaming(true)}
                    title="Click to rename"
                  >
                    {fileName}
                  </span>
                )}
              </div>

              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Mime Type:</span>
                <span style={styles.metaValue}>{file.mimeType}</span>
              </div>

              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Encryption Cipher:</span>
                <span style={{ ...styles.metaValue, color: "var(--success)", fontWeight: "600" }}>
                  AES-256-CBC Rests
                </span>
              </div>

              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>File Size:</span>
                <span style={styles.metaValue}>{formatSize(file.size)}</span>
              </div>

              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Uploaded:</span>
                <span style={styles.metaValue}>{new Date(file.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div style={styles.actionSection}>
              <h4 style={styles.sectionTitle}>Operations</h4>
              <div style={styles.actionButtonsCol}>
                <a href={downloadUrl} className="btn-purple" style={styles.actionBtn}>
                  <Download size={14} />
                  <span>Download file</span>
                </a>
                <button onClick={() => setRenaming(true)} className="btn-gray" style={styles.actionBtn}>
                  <span>Rename file</span>
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="btn-gray"
                  style={{ ...styles.actionBtn, color: "var(--danger)" }}
                >
                  <span>Move to Trash</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isFullscreen && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "#000",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out"
          }}
          onClick={() => setIsFullscreen(false)}
        >
          {isImage ? (
            <img 
              src={previewUrl} 
              alt={fileName} 
              style={{ 
                maxHeight: "100vh", 
                maxWidth: "100vw", 
                transform: `rotate(${rotation}deg)` 
              }} 
            />
          ) : isVideo ? (
            <video src={previewUrl} controls autoPlay style={{ maxHeight: "100vh", maxWidth: "100vw" }} />
          ) : (
            <iframe src={previewUrl} title={fileName} style={{ width: "100%", height: "100%", border: "none" }} />
          )}
          <button 
            onClick={() => setIsFullscreen(false)} 
            style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", padding: "10px 15px", borderRadius: "8px", cursor: "pointer" }}
          >
            Exit Fullscreen
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(5, 5, 8, 0.85)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    padding: "20px",
  },
  modal: {
    width: "100%",
    maxWidth: "1000px",
    height: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  headerTitle: {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    maxWidth: "70%",
    overflow: "hidden",
  },
  fileName: {
    fontSize: "1.05rem",
    fontWeight: "600",
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  fileSize: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
  },
  mainContainer: {
    display: "flex",
    flexGrow: 1,
    overflow: "hidden",
    height: "calc(100% - 56px)",
  },
  leftPane: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
    position: "relative",
  },
  rightPane: {
    width: "280px",
    borderLeft: "1px solid rgba(255, 255, 255, 0.05)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    overflowY: "auto",
    background: "rgba(255, 255, 255, 0.01)",
  },
  zoomBar: {
    position: "absolute",
    top: "12px",
    left: "12px",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(0, 0, 0, 0.6)",
    padding: "6px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  zoomBtn: {
    padding: "4px 8px",
    fontSize: "0.75rem",
    height: "auto",
    minWidth: 0,
    marginTop: 0,
    background: "rgba(255, 255, 255, 0.05)",
  },
  contentWrapper: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
    height: "100%",
  },
  mediaContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  imagePreview: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    borderRadius: "8px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
  },
  videoPreview: {
    maxWidth: "90%",
    maxHeight: "90%",
    borderRadius: "8px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
  },
  audioContainer: {
    width: "100%",
    maxWidth: "400px",
    padding: "30px",
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  audioPreview: {
    width: "100%",
  },
  pdfContainer: {
    width: "100%",
    height: "100%",
  },
  pdfIframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  textContainer: {
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    padding: "16px",
    overflow: "auto",
  },
  preCode: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.85rem",
    color: "#a78bfa",
    lineHeight: "1.5",
    textAlign: "left",
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  centerLoading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  fallbackContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    maxWidth: "400px",
    padding: "30px",
  },
  fallbackIcon: {
    width: "80px",
    height: "80px",
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.03)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  fallbackTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#fff",
    marginBottom: "8px",
    margin: 0,
  },
  fallbackMeta: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    marginBottom: "16px",
  },
  fallbackText: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    lineHeight: "1.5",
    margin: 0,
  },
  sectionTitle: {
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: "0 0 12px 0",
    borderBottom: "1px dashed rgba(255,255,255,0.08)",
    paddingBottom: "6px",
  },
  metaSection: {
    display: "flex",
    flexDirection: "column",
  },
  metaRow: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    marginBottom: "12px",
  },
  metaLabel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
  },
  metaValue: {
    fontSize: "0.8rem",
    color: "#fff",
    fontWeight: "500",
    wordBreak: "break-all",
  },
  actionSection: {
    marginTop: "auto",
  },
  actionButtonsCol: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "8px 12px",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "0.8rem",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    border: "none",
  },
};
