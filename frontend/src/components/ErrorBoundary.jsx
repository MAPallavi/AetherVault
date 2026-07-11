import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0e12", color: "#fff", padding: "20px" }}>
          <div className="glass-panel" style={{ maxWidth: "500px", width: "100%", padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", gap: "20px" }}>
            <AlertTriangle size={64} color="var(--danger)" style={{ margin: "0 auto" }} />
            <div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "700", margin: 0 }}>System Encountered an Error</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "8px" }}>
                {this.state.error?.message || "An unexpected runtime exception crashed the interface."}
              </p>
            </div>
            
            <button onClick={this.handleRetry} className="btn btn-primary" style={{ display: "inline-flex", gap: "8px", alignSelf: "center" }}>
              <RefreshCw size={16} />
              <span>Retry and Reload</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
