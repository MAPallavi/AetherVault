import React, { useState, useEffect } from "react";
import { Download, Lock, FileText, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";

export default function SharedLinkPage() {
  const [code] = useState(() => {
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1];
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fileInfo, setFileInfo] = useState(null);
  const [passcode, setPasscode] = useState("");
  const [passcodeRequired, setPasscodeRequired] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchSharedInfo = async (pw = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/files/shared/${code}?passcode=${encodeURIComponent(pw)}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setPasscodeRequired(true);
        } else {
          setError(data.message || "Failed to load shared link");
        }
        return;
      }
      setFileInfo(data);
      setPasscodeRequired(false);
    } catch (err) {
      setError(err.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedInfo();
  }, [code]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = `/api/files/shared/${code}/download?passcode=${encodeURIComponent(passcode)}`;
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileInfo?.name || "download");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } catch (err) {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0e12" }}>
        <Loader2 className="spinner" size={40} color="#7C3AED" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0e12", color: "#fff", padding: "20px" }}>
      <div className="glass-panel" style={{ maxWidth: "450px", width: "100%", padding: "30px", textAlign: "center", display: "flex", flexDirection: "column", gap: "20px" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "700", color: "#fff", margin: 0 }}>AetherVault Share</h2>
        
        {error && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
            <AlertTriangle size={48} color="var(--danger)" />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{error}</p>
          </div>
        )}

        {passcodeRequired && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <Lock size={40} color="var(--primary)" style={{ margin: "0 auto" }} />
            <div>
              <h4 style={{ margin: 0 }}>Passcode Required</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>This shared file is protected by a passcode.</p>
            </div>
            <input
              type="password"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="input-field"
              style={{ textAlign: "center" }}
            />
            <button onClick={() => fetchSharedInfo(passcode)} className="btn btn-primary">
              Unlock Link
            </button>
          </div>
        )}

        {fileInfo && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
            <FileText size={48} color="var(--primary)" />
            <div>
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{fileInfo.name}</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                Size: {(fileInfo.size / 1024 / 1024).toFixed(2)} MB • Type: {fileInfo.mimeType}
              </p>
            </div>

            <button onClick={handleDownload} disabled={downloading} className="btn btn-primary" style={{ width: "100%" }}>
              {downloading ? <Loader2 className="spinner" size={16} /> : <Download size={16} />}
              <span>Download File</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
