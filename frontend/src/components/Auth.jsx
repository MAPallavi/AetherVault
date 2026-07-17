import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Lock, Shield, User, Loader2, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function Auth({ onAuthSuccess }) {
  const { login, register } = useAuth();
  
  const [isSetup, setIsSetup] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");

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
    setForgotSuccess("");
    setLoading(true);

    try {
      let data;
      if (isForgotMode) {
        data = await api.forgotPassword(username, forgotEmail);
        setForgotSuccess("A recovery link has been dispatched/logged successfully.");
      } else if (!isSetup) {
        data = await api.setupAdmin(username, password);
        onAuthSuccess(data.username);
      } else if (isRegistering) {
        data = await register(username, password);
        onAuthSuccess(data.username);
      } else {
        data = await login(username, password, rememberMe);
        onAuthSuccess(data.username);
      }
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
            {isForgotMode
              ? "Reset your secure vault password"
              : !isSetup
              ? "Initialize your secure personal file manager account"
              : isRegistering
              ? "Create a new secure vault account"
              : "Sign in to access your encrypted vault"}
          </p>
        </div>

        {error && <div className="auth-error-alert">{error}</div>}
        {forgotSuccess && <div className="auth-success-alert" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.1)", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "15px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>{forgotSuccess}</div>}

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

          {isForgotMode && (
            <div className="auth-input-group">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: "40px" }}
                  placeholder="Enter email address"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {!isForgotMode && (
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
          )}

          {!isForgotMode && !isRegistering && isSetup && (
            <div className="remember-me-container" style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px 0" }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="rememberMe" style={{ color: "var(--text-secondary)", fontSize: "0.85rem", cursor: "pointer" }}>
                Remember Me
              </label>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spinner" size={18} />
            ) : isForgotMode ? (
              "Request Reset Link"
            ) : !isSetup ? (
              "Set Up Account"
            ) : isRegistering ? (
              "Create Account"
            ) : (
              "Unlock Vault"
            )}
          </button>
        </form>

        {isSetup && (
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
            {!isForgotMode && (
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError("");
                  setForgotSuccess("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  textDecoration: "underline"
                }}
              >
                {isRegistering ? "Already have an account? Sign In" : "Need an account? Register here"}
              </button>
            )}

            {!isRegistering && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(!isForgotMode);
                  setError("");
                  setForgotSuccess("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  textDecoration: "underline"
                }}
              >
                {isForgotMode ? "Back to Sign In" : "Forgot Password?"}
              </button>
            )}
          </div>
        )}

        <div className="auth-footer">
          <p className="auth-footer-text">
            🔒 End-to-end AES-256 encrypted file storage at rest.
          </p>
        </div>
      </div>
    </div>
  );
}
