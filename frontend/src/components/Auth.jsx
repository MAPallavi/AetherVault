import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Lock, Shield, User, Loader2 } from "lucide-react";
import "../styles/auth.css";

export default function Auth({ onAuthSuccess }) {
  const [isSetup, setIsSetup] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const data = await api.getSetupStatus();
      setIsSetup(data.isSetup);
    } catch (err) {
      setError("Cannot connect to backend server. Please check if backend is running.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let data;
      if (!isSetup) {
        data = await api.setupAdmin(username, password);
      } else {
        data = await api.login(username, password);
      }
      onAuthSuccess(data.username);
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (isSetup === null) {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", background: "#0B1120" }}>
        <Loader2 className="spinner" size={48} color="#7C3AED" />
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card glass animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo-container">
            <Shield size={32} color="#7C3AED" />
          </div>
          <h1 className="auth-title">AetherVault</h1>
          <p className="auth-subtitle">
            {!isSetup
              ? "Initialize your secure personal file manager account"
              : "Sign in to access your encrypted vault"}
          </p>
        </div>

        {error && <div className="auth-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label className="auth-label">Username</label>
            <div className="auth-input-wrapper">
              <User size={18} className="auth-input-icon" />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: "40px" }}
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: "40px" }}
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
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spinner" size={18} />
            ) : !isSetup ? (
              "Set Up Account"
            ) : (
              "Unlock Vault"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-footer-text">
            🔒 End-to-end AES-256 encrypted file storage at rest.
          </p>
        </div>
      </div>
    </div>
  );
}
