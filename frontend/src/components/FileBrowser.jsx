import React, { useEffect, useState, useRef } from 'react';
import { api } from '../utils/api';
import { FolderClosed, FileText, ArrowLeft, Plus, Upload, Grid, List, Search, Loader2, Download, Trash, Edit2, ChevronRight, FileImage, FileVideo, FileAudio, FileArchive, CornerDownRight } from 'lucide-react';

export default function FileBrowser({ onActionSuccess, onPreviewSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]); // Array of {id, name}
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [error, setError] = useState('');
  
  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Modals state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [actioningId, setActioningId] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
  }, [currentFolder, search]);

  const fetchFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listFiles(currentFolder?._id || null, search);
      setItems(data);
    } catch (err) {
      setError('Failed to fetch files.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setActioningId('create-folder');
    setError('');
    try {
      const newFolder = await api.createFolder(newFolderName.trim(), currentFolder?._id || null);
      setItems([newFolder, ...items].sort((a, b) => b.isFolder - a.isFolder || a.name.localeCompare(b.name)));
      setShowFolderModal(false);
      setNewFolderName('');
      if (onActionSuccess) onActionSuccess(); // Update stats
    } catch (err) {
      setError(err.message || 'Failed to create folder.');
    } finally {
      setActioningId(null);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameValue.trim() || !renameItem) return;

    setActioningId(renameItem._id);
    setError('');
    try {
      const updated = await api.renameItem(renameItem._id, renameValue.trim());
      setItems(items.map(item => item._id === renameItem._id ? updated : item));
      setShowRenameModal(false);
      setRenameItem(null);
      setRenameValue('');
      if (onActionSuccess) onActionSuccess(); // Update logs
    } catch (err) {
      setError(err.message || 'Failed to rename item.');
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmation = window.confirm(`Move "${name}" to the Recycle Bin?`);
    if (!confirmation) return;

    setActioningId(id);
    setError('');
    try {
      await api.moveToTrash(id);
      setItems(items.filter(item => item._id !== id));
      if (onActionSuccess) onActionSuccess(); // Update stats
    } catch (err) {
      setError(err.message || 'Failed to delete item.');
    } finally {
      setActioningId(null);
    }
  };

  const handleUpload = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    
    setUploading(true);
    setUploadPercent(0);
    setError('');
    try {
      const uploaded = await api.uploadFiles(filesList, currentFolder?._id || null, (percent) => {
        setUploadPercent(percent);
      });
      setItems([...uploaded, ...items].sort((a, b) => b.isFolder - a.isFolder || a.name.localeCompare(b.name)));
      if (onActionSuccess) onActionSuccess(); // Update stats
    } catch (err) {
      setError(err.message || 'Failed to upload files.');
    } finally {
      setUploading(false);
      setUploadPercent(0);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleUpload(e.dataTransfer.files);
    }
  };

  // Folder navigation
  const navigateIntoFolder = (folder) => {
    setFolderHistory([...folderHistory, currentFolder ? { _id: currentFolder._id, name: currentFolder.name } : { _id: null, name: 'Root' }]);
    setCurrentFolder(folder);
    setSearch('');
  };

  const navigateBack = () => {
    if (folderHistory.length === 0) return;
    const previous = folderHistory[folderHistory.length - 1];
    setFolderHistory(folderHistory.slice(0, -1));
    setCurrentFolder(previous._id ? { _id: previous._id, name: previous.name } : null);
    setSearch('');
  };

  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      // Navigate to root
      setFolderHistory([]);
      setCurrentFolder(null);
    } else {
      const destination = folderHistory[index];
      setFolderHistory(folderHistory.slice(0, index));
      setCurrentFolder(destination._id ? { _id: destination._id, name: destination.name } : null);
    }
    setSearch('');
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    const mime = mimeType.toLowerCase();
    if (mime.startsWith('image/')) return <FileImage size={24} color="#e040fb" />;
    if (mime.startsWith('video/')) return <FileVideo size={24} color="#ff5252" />;
    if (mime.startsWith('audio/')) return <FileAudio size={24} color="#ffd740" />;
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return <FileArchive size={24} color="#69f0ae" />;
    return <FileText size={24} color="#3b82f6" />;
  };

  return (
    <div 
      className="main-content animate-fade-in" 
      style={{ position: 'relative', height: 'calc(100vh - 40px)' }}
      onDragOver={handleDragOver}
    >
      {/* Fullscreen drag-over overlay */}
      {isDragOver && (
        <div 
          style={styles.dragOverlay}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div style={styles.dragOverlayCard}>
            <Upload size={64} className="spinner" color="#9d4edd" />
            <h2>Drop files to upload securely</h2>
            <p>Your files will be end-to-end AES-256 encrypted before writing to disk.</p>
          </div>
        </div>
      )}

      {/* Toolbar / Actions Row */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          {currentFolder && (
            <button onClick={navigateBack} className="btn-icon" title="Go Back" style={{ marginRight: '8px' }}>
              <ArrowLeft size={18} />
            </button>
          )}
          
          {/* Breadcrumbs navigation */}
          <div style={styles.breadcrumbs}>
            <span 
              onClick={() => navigateToBreadcrumb(-1)} 
              style={styles.breadcrumbLink}
            >
              Root
            </span>
            {folderHistory.slice(1).map((hist, index) => (
              <React.Fragment key={hist._id || index}>
                <ChevronRight size={14} color="var(--text-muted)" />
                <span 
                  onClick={() => navigateToBreadcrumb(index + 1)} 
                  style={styles.breadcrumbLink}
                >
                  {hist.name}
                </span>
              </React.Fragment>
            ))}
            {currentFolder && (
              <>
                <ChevronRight size={14} color="var(--text-muted)" />
                <span style={styles.breadcrumbActive}>{currentFolder.name}</span>
              </>
            )}
          </div>
        </div>

        <div style={styles.toolbarRight}>
          {/* Search bar */}
          <div style={styles.searchWrapper}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              className="input-field"
              style={styles.searchInput}
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Switch View Buttons */}
          <div style={styles.viewModeGroup}>
            <button 
              onClick={() => setViewMode('grid')} 
              style={{ ...styles.viewBtn, ...(viewMode === 'grid' ? styles.viewBtnActive : {}) }}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              style={{ ...styles.viewBtn, ...(viewMode === 'list' ? styles.viewBtnActive : {}) }}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>

          {/* File Operations */}
          <button onClick={() => setShowFolderModal(true)} className="btn btn-secondary" title="New Folder">
            <Plus size={18} />
            <span>New Folder</span>
          </button>

          <button onClick={() => fileInputRef.current.click()} className="btn btn-primary" title="Upload Files">
            <Upload size={18} />
            <span>Upload</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files)}
            multiple
          />
        </div>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      {/* Main Files Display */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <Loader2 className="spinner" size={48} color="#9d4edd" />
        </div>
      ) : items.length === 0 ? (
        <div style={styles.emptyContainer}>
          <FolderClosed size={64} color="var(--text-muted)" />
          <h3>This folder is empty</h3>
          <p>Drag and drop files here, or use the actions in the top-right toolbar.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div style={styles.gridContainer}>
          {items.map((item) => (
            <div 
              key={item._id} 
              className="glass-panel glass-panel-hover" 
              style={styles.gridCard}
              onDoubleClick={() => item.isFolder ? navigateIntoFolder(item) : onPreviewSelect(item)}
            >
              <div style={styles.gridCardTop}>
                {item.isFolder ? (
                  <FolderClosed size={48} color="#9d4edd" />
                ) : (
                  getFileIcon(item.mimeType)
                )}
                
                {/* Actions Dropdown */}
                <div style={styles.cardActions}>
                  {!item.isFolder && (
                    <a href={api.getDownloadUrl(item._id)} className="btn-icon" style={styles.cardActionBtn} title="Download">
                      <Download size={14} />
                    </a>
                  )}
                  {item.isFolder && (
                    <a href={api.getDownloadUrl(item._id)} className="btn-icon" style={styles.cardActionBtn} title="Download ZIP">
                      <Download size={14} />
                    </a>
                  )}
                  <button 
                    onClick={() => { setRenameItem(item); setRenameValue(item.name); setShowRenameModal(true); }} 
                    className="btn-icon" 
                    style={styles.cardActionBtn}
                    title="Rename"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item._id, item.name)} 
                    className="btn-icon" 
                    style={styles.cardActionBtn}
                    title="Delete"
                    disabled={actioningId === item._id}
                  >
                    {actioningId === item._id ? <Loader2 className="spinner" size={14} /> : <Trash size={14} />}
                  </button>
                </div>
              </div>

              <div style={styles.gridCardBottom}>
                <p style={styles.gridName} title={item.name}>{item.name}</p>
                <p style={styles.gridSize}>{item.isFolder ? 'Folder' : formatSize(item.size)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="glass-panel" style={styles.listPanel}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Name</th>
                <th style={{ ...styles.th, width: '150px' }}>Type</th>
                <th style={{ ...styles.th, width: '120px' }}>Size</th>
                <th style={{ ...styles.th, width: '180px' }}>Modified</th>
                <th style={{ ...styles.th, width: '180px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr 
                  key={item._id} 
                  style={styles.tr}
                  onDoubleClick={() => item.isFolder ? navigateIntoFolder(item) : onPreviewSelect(item)}
                >
                  <td style={styles.td}>
                    <div style={styles.listNameCell}>
                      {item.isFolder ? (
                        <FolderClosed size={20} color="#9d4edd" />
                      ) : (
                        getFileIcon(item.mimeType)
                      )}
                      <span style={styles.listName} title={item.name}>{item.name}</span>
                    </div>
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                    {item.isFolder ? 'Folder' : item.mimeType.split('/')[1] || 'File'}
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                    {item.isFolder ? '—' : formatSize(item.size)}
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-muted)' }}>
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={styles.listActions}>
                      <button 
                        onClick={() => item.isFolder ? navigateIntoFolder(item) : onPreviewSelect(item)}
                        className="btn-icon" 
                        title={item.isFolder ? "Open folder" : "Preview file"}
                      >
                        {item.isFolder ? <CornerDownRight size={14} /> : <CornerDownRight size={14} />}
                      </button>
                      <a href={api.getDownloadUrl(item._id)} className="btn-icon" title="Download">
                        <Download size={14} />
                      </a>
                      <button 
                        onClick={() => { setRenameItem(item); setRenameValue(item.name); setShowRenameModal(true); }} 
                        className="btn-icon"
                        title="Rename"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item._id, item.name)} 
                        className="btn-icon"
                        title="Delete"
                        disabled={actioningId === item._id}
                      >
                        {actioningId === item._id ? <Loader2 className="spinner" size={14} /> : <Trash size={14} color="#ef4444" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Upload Progress Overlay */}
      {uploading && (
        <div className="glass-panel animate-fade-in" style={styles.progressCard}>
          <div style={styles.progressHeader}>
            <Loader2 className="spinner" size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Uploading files...</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{uploadPercent}%</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${uploadPercent}%` }}></div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* Folder Creation Modal */}
      {showFolderModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowFolderModal(false)}>
          <div className="glass-panel" style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
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
                disabled={actioningId === 'create-folder'}
              />
              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowFolderModal(false)} 
                  className="btn btn-secondary"
                  disabled={actioningId === 'create-folder'}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={actioningId === 'create-folder'}
                >
                  {actioningId === 'create-folder' ? <Loader2 className="spinner" size={16} /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div style={styles.modalBackdrop} onClick={() => { setShowRenameModal(false); setRenameItem(null); }}>
          <div className="glass-panel" style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
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
                  onClick={() => { setShowRenameModal(false); setRenameItem(null); }} 
                  className="btn btn-secondary"
                  disabled={actioningId !== null}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={actioningId !== null}
                >
                  {actioningId === renameItem?._id ? <Loader2 className="spinner" size={16} /> : 'Rename'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.95rem',
  },
  breadcrumbLink: {
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'color 0.2s ease',
    ':hover': {
      color: '#fff',
    }
  },
  breadcrumbActive: {
    color: '#fff',
    fontWeight: '600',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)',
  },
  searchInput: {
    width: '200px',
    padding: '8px 12px 8px 36px',
    fontSize: '0.85rem',
    borderRadius: '8px',
  },
  viewModeGroup: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '3px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  viewBtn: {
    background: 'transparent',
    border: 'none',
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    transition: 'all 0.2s ease',
  },
  viewBtnActive: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '10px',
    padding: '12px',
    color: '#fca5a5',
    fontSize: '0.85rem',
  },
  loadingContainer: {
    display: 'flex',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
  },
  emptyContainer: {
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: '12px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '20px',
    overflowY: 'auto',
    flexGrow: 1,
  },
  gridCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  gridCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
  },
  cardActions: {
    display: 'flex',
    gap: '4px',
    opacity: 0,
    transition: 'opacity 0.2s ease',
    // We target CSS class manually inside the inline DOM style hover trigger if needed, 
    // but in modern React we can toggle state, or write standard global hover targets inside index.css!
    // Let's configure list panel hover and card hover inside css!
  },
  cardActionBtn: {
    width: '28px',
    height: '28px',
  },
  gridCardBottom: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  gridName: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  gridSize: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  listPanel: {
    padding: '16px',
    overflow: 'auto',
    flexGrow: 1,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  th: {
    padding: '12px 16px',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  td: {
    padding: '12px 16px',
    fontSize: '0.9rem',
    verticalAlign: 'middle',
  },
  listNameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '300px',
  },
  listName: {
    color: '#fff',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  listActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '6px',
  },
  progressCard: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    width: '280px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    border: '1px solid var(--primary)',
    zIndex: 100,
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  progressTrack: {
    height: '6px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--primary)',
    borderRadius: '3px',
    transition: 'width 0.1s ease',
  },
  dragOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(13, 14, 18, 0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px',
    border: '2px dashed var(--primary)',
    zIndex: 99,
  },
  dragOverlayCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    textAlign: 'center',
    maxWidth: '400px',
    padding: '20px',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modalCard: {
    width: '100%',
    maxWidth: '360px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#fff',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
};
