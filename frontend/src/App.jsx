import React, { useState, useEffect } from 'react';
import { api } from './utils/api';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FileBrowser from './components/FileBrowser';
import RecycleBin from './components/RecycleBin';
import ActivityLogs from './components/ActivityLogs';
import PreviewModal from './components/PreviewModal';
import Auth from './components/Auth';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Navigation
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // Active preview file
  const [previewFile, setPreviewFile] = useState(null);
  
  // State synchronization trigger for Sidebar stats
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const data = await api.getMe();
      setUsername(data.username);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Session validation failed:', err.message);
      api.logout();
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (name) => {
    setUsername(name);
    setIsAuthenticated(true);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setUsername('');
  };

  const triggerStatsRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 className="spinner" size={48} color="#9d4edd" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        username={username}
        onLogout={handleLogout}
        refreshTrigger={refreshTrigger}
      />

      {/* Main panel view dynamic router */}
      <div style={styles.mainWrapper}>
        {currentTab === 'dashboard' && (
          <Dashboard setCurrentTab={setCurrentTab} />
        )}
        
        {currentTab === 'files' && (
          <FileBrowser 
            onActionSuccess={triggerStatsRefresh}
            onPreviewSelect={setPreviewFile}
          />
        )}
        
        {currentTab === 'trash' && (
          <RecycleBin 
            onActionSuccess={triggerStatsRefresh}
          />
        )}
        
        {currentTab === 'logs' && (
          <ActivityLogs />
        )}
      </div>

      {/* Media Preview Modal Overlay */}
      {previewFile && (
        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainWrapper: {
    flexGrow: 1,
    height: '100vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
};
