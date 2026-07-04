import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { X, Download, FileText, Loader2 } from 'lucide-react';

export default function PreviewModal({ file, onClose }) {
  const [textContents, setTextContents] = useState('');
  const [loadingText, setLoadingText] = useState(false);

  const previewUrl = api.getPreviewUrl(file._id);
  const downloadUrl = api.getDownloadUrl(file._id);
  const mime = file.mimeType.toLowerCase();

  const isImage = mime.startsWith('image/');
  const isVideo = mime.startsWith('video/');
  const isAudio = mime.startsWith('audio/');
  const isPdf = mime === 'application/pdf';
  const isText = mime.startsWith('text/') || 
                 mime === 'application/json' || 
                 mime === 'application/javascript' || 
                 mime === 'application/xml';

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
        setTextContents('Failed to load text preview contents.');
      }
    } catch (err) {
      setTextContents('Error loading file preview.');
    } finally {
      setLoadingText(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderContent = () => {
    if (isImage) {
      return (
        <div style={styles.mediaContainer}>
          <img src={previewUrl} alt={file.name} style={styles.imagePreview} />
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
          <iframe src={previewUrl} title={file.name} style={styles.pdfIframe}></iframe>
        </div>
      );
    }

    if (isText) {
      if (loadingText) {
        return (
          <div style={styles.centerLoading}>
            <Loader2 className="spinner" size={32} color="#9d4edd" />
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
        <h3 style={styles.fallbackTitle}>{file.name}</h3>
        <p style={styles.fallbackMeta}>
          {formatSize(file.size)} • {file.mimeType}
        </p>
        <p style={styles.fallbackText}>
          No preview is available for this file type. You can download it to view locally.
        </p>
        <a href={downloadUrl} className="btn btn-primary" style={{ marginTop: '16px' }}>
          <Download size={18} />
          <span>Download File</span>
        </a>
      </div>
    );
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div className="glass-panel" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <span style={styles.fileName}>{file.name}</span>
            <span style={styles.fileSize}>({formatSize(file.size)})</span>
          </div>
          <div style={styles.headerActions}>
            <a href={downloadUrl} className="btn-icon" title="Download">
              <Download size={18} />
            </a>
            <button onClick={onClose} className="btn-icon" title="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        
        <div style={styles.body}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(5, 5, 8, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '900px',
    height: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    maxWidth: '70%',
    overflow: 'hidden',
  },
  fileName: {
    fontSize: '1.05rem',
    fontWeight: '600',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileSize: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
  },
  body: {
    flexGrow: 1,
    padding: '24px',
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  mediaContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  imagePreview: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  videoPreview: {
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  audioContainer: {
    width: '100%',
    maxWidth: '500px',
    padding: '40px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPreview: {
    width: '100%',
  },
  pdfContainer: {
    width: '100%',
    height: '100%',
  },
  pdfIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '8px',
  },
  textContainer: {
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '16px',
    overflow: 'auto',
  },
  preCode: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.85rem',
    color: '#a78bfa',
    lineHeight: '1.5',
    textAlign: 'left',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  centerLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  fallbackContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '400px',
    padding: '30px',
  },
  fallbackIcon: {
    width: '96px',
    height: '96px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.03)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  fallbackTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '8px',
  },
  fallbackMeta: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginBottom: '16px',
  },
  fallbackText: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  },
};
