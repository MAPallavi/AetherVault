import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Lock, Shield, User, Loader2 } from 'lucide-react';

export default function Auth({ onAuthSuccess }) {
  const [isSetup, setIsSetup] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const data = await api.getSetupStatus();
      setIsSetup(data.isSetup);
    } catch (err) {
      setError('Cannot connect to backend server. Please check if backend is running.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (!isSetup) {
        // Run administrator setup
        data = await api.setupAdmin(username, password);
      } else {
        // Run standard login
        data = await api.login(username, password);
      }
      onAuthSuccess(data.username);
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (isSetup === null) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="spinner" size={48} color="#9d4edd" />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div className="glass-panel animate-fade-in" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <Shield size={32} color="#9d4edd" />
          </div>
          <h1 style={styles.title}>AetherVault</h1>
          <p style={styles.subtitle}>
            {!isSetup 
              ? 'Initialize your secure personal file manager account' 
              : 'Sign in to access your encrypted vault'}
          </p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <div style={styles.inputWrapper}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '40px' }}
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: '40px' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spinner" size={18} />
            ) : !isSetup ? (
              'Set Up Account'
            ) : (
              'Unlock Vault'
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            🔒 End-to-end AES-256 encrypted file storage at rest.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px 30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  logoContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'rgba(157, 78, 221, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(157, 78, 221, 0.2)',
    boxShadow: '0 0 20px rgba(157, 78, 221, 0.15)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    background: 'linear-gradient(to right, #f3f4f6, #9d4edd)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-muted)',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '1rem',
    marginTop: '8px',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '10px',
    padding: '12px',
    color: '#fca5a5',
    fontSize: '0.85rem',
    lineHeight: '1.4',
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '20px',
  },
  footerText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
};
