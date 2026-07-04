import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Loader2, HardDrive, Files, Folder, Trash, FileImage, FileVideo, FileAudio, FileText, FileArchive, HelpCircle, ArrowRight } from 'lucide-react';

export default function Dashboard({ setCurrentTab }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [analytics, logs] = await Promise.all([
        api.getAnalytics(),
        api.getLogs(),
      ]);
      setData(analytics);
      setRecentLogs(logs.slice(0, 5)); // Keep only top 5 recent logs for dashboard
    } catch (err) {
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 className="spinner" size={48} color="#9d4edd" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ marginTop: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  // Calculate statistics
  const { totalSize, fileCount, folderCount, trashCount, categories } = data;
  const categoriesList = [
    { key: 'images', label: 'Images', color: '#e040fb', icon: FileImage, ...categories.images },
    { key: 'video', label: 'Videos', color: '#ff5252', icon: FileVideo, ...categories.video },
    { key: 'audio', label: 'Audio', color: '#ffd740', icon: FileAudio, ...categories.audio },
    { key: 'documents', label: 'Documents', color: '#18ffff', icon: FileText, ...categories.documents },
    { key: 'archives', label: 'Archives', color: '#69f0ae', icon: FileArchive, ...categories.archives },
    { key: 'others', label: 'Others', color: '#b0bec5', icon: HelpCircle, ...categories.others },
  ].filter(cat => cat.count > 0); // Show only category types that actually have files

  // Generate SVG Pie/Donut calculations
  let cumAngle = 0;
  const donutSegments = categoriesList.map((cat) => {
    const sizeRatio = totalSize > 0 ? cat.size / totalSize : 0;
    const angle = sizeRatio * 360;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    // Convert polar coordinates to Cartesian for SVG path
    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
      };
    };

    const describeArc = (x, y, radius, startAngle, endAngle) => {
      const start = polarToCartesian(x, y, radius, endAngle);
      const end = polarToCartesian(x, y, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
      return [
        'M', start.x, start.y,
        'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
      ].join(' ');
    };

    return {
      path: describeArc(100, 100, 70, startAngle, endAngle),
      color: cat.color,
      label: cat.label,
      percent: Math.round(sizeRatio * 100),
    };
  });

  return (
    <div className="main-content animate-fade-in">
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Dashboard</h1>
          <p style={styles.pageSubtitle}>Real-time secure vault analytics and usage status</p>
        </div>
      </div>

      {/* Grid of stats boxes */}
      <div style={styles.statsGrid}>
        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.statIconContainer, background: 'rgba(157, 78, 221, 0.1)' }}>
            <HardDrive size={24} color="#9d4edd" />
          </div>
          <div>
            <p style={styles.statLabel}>Storage Used</p>
            <p style={styles.statValue}>{formatSize(totalSize)}</p>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.statIconContainer, background: 'rgba(59, 130, 246, 0.1)' }}>
            <Files size={24} color="#3b82f6" />
          </div>
          <div>
            <p style={styles.statLabel}>Total Files</p>
            <p style={styles.statValue}>{fileCount}</p>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.statIconContainer, background: 'rgba(16, 185, 129, 0.1)' }}>
            <Folder size={24} color="#10b981" />
          </div>
          <div>
            <p style={styles.statLabel}>Folders Created</p>
            <p style={styles.statValue}>{folderCount}</p>
          </div>
        </div>

        <div className="glass-panel" style={styles.statCard}>
          <div style={{ ...styles.statIconContainer, background: 'rgba(239, 68, 68, 0.1)' }}>
            <Trash size={24} color="#ef4444" />
          </div>
          <div>
            <p style={styles.statLabel}>In Recycle Bin</p>
            <p style={styles.statValue}>{trashCount}</p>
          </div>
        </div>
      </div>

      <div style={styles.bottomGrid}>
        {/* Storage distribution analysis panel */}
        <div className="glass-panel" style={styles.distributionPanel}>
          <h2 style={styles.panelTitle}>Storage Distribution</h2>
          
          {totalSize === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ color: 'var(--text-muted)' }}>No files uploaded yet.</p>
              <button onClick={() => setCurrentTab('files')} className="btn btn-primary" style={{ marginTop: '14px' }}>
                Upload Files
              </button>
            </div>
          ) : (
            <div style={styles.chartWrapper}>
              <div style={styles.chartContainer}>
                <svg width="200" height="200" viewBox="0 0 200 200">
                  {donutSegments.map((seg, i) => (
                    <path
                      key={i}
                      d={seg.path}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                  ))}
                  {/* Center donut text */}
                  <circle cx="100" cy="100" r="58" fill="rgb(20, 22, 34)" />
                  <text x="100" y="95" textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontWeight="500">
                    USED SPACE
                  </text>
                  <text x="100" y="118" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700">
                    {formatSize(totalSize)}
                  </text>
                </svg>
              </div>

              <div style={styles.legendContainer}>
                {categoriesList.map((cat) => {
                  const CatIcon = cat.icon;
                  const ratio = Math.round((cat.size / totalSize) * 100);
                  return (
                    <div key={cat.label} style={styles.legendItem}>
                      <div style={styles.legendLeft}>
                        <div style={{ ...styles.colorIndicator, background: cat.color }}></div>
                        <CatIcon size={16} color="var(--text-secondary)" style={{ marginRight: '6px' }} />
                        <span style={styles.legendName}>{cat.label}</span>
                      </div>
                      <div style={styles.legendRight}>
                        <span style={styles.legendPercent}>{ratio}%</span>
                        <span style={styles.legendSize}>({formatSize(cat.size)})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Activity feed panel */}
        <div className="glass-panel" style={styles.activityPanel}>
          <div style={styles.activityHeader}>
            <h2 style={styles.panelTitle}>Recent Activities</h2>
            <button 
              onClick={() => setCurrentTab('logs')} 
              style={styles.viewAllBtn}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={styles.logList}>
            {recentLogs.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ color: 'var(--text-muted)' }}>No activities logged yet.</p>
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log._id} style={styles.logItem}>
                  <div style={styles.logLeft}>
                    <div style={styles.logActionTag(log.action)}>
                      {log.action}
                    </div>
                    <span style={styles.logDetails}>{log.details}</span>
                  </div>
                  <span style={styles.logTime}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#fff',
  },
  pageSubtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    marginTop: '4px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  statCard: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#fff',
    marginTop: '4px',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '20px',
    flexGrow: 1,
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr',
    },
  },
  distributionPanel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  activityPanel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  panelTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    padding: '40px 0',
  },
  chartWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: '24px',
    flexGrow: 1,
  },
  chartContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: '220px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    padding: '4px 0',
  },
  legendLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  colorIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginRight: '10px',
  },
  legendName: {
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  legendRight: {
    display: 'flex',
    gap: '6px',
  },
  legendPercent: {
    color: '#fff',
    fontWeight: '600',
  },
  legendSize: {
    color: 'var(--text-muted)',
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--primary)',
    fontSize: '0.85rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background 0.2s ease',
    ':hover': {
      background: 'rgba(157, 78, 221, 0.05)',
    }
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    overflowY: 'auto',
    maxHeight: '300px',
  },
  logItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  logLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    overflow: 'hidden',
  },
  logActionTag: (action) => {
    let color = '#3b82f6';
    let bg = 'rgba(59, 130, 246, 0.1)';
    if (action === 'UPLOAD') { color = '#10b981'; bg = 'rgba(16, 185, 129, 0.1)'; }
    if (action === 'DELETE' || action === 'PURGE') { color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.1)'; }
    if (action === 'RESTORE') { color = '#ffd740'; bg = 'rgba(255, 215, 64, 0.1)'; }
    
    return {
      fontSize: '0.7rem',
      fontWeight: '700',
      padding: '3px 8px',
      borderRadius: '5px',
      color,
      backgroundColor: bg,
      letterSpacing: '0.5px',
    };
  },
  logDetails: {
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '240px',
  },
  logTime: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
};
