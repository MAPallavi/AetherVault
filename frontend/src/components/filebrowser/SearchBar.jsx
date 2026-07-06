import React from "react";
import { Search, X } from "lucide-react";

export default function SearchBar({ search, setSearch }) {
  return (
    <div style={styles.searchWrapper}>
      <Search size={15} style={styles.searchIcon} />
      <input
        type="text"
        className="input-field search-box"
        style={styles.searchInput}
        placeholder="Quick search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search && (
        <button
          onClick={() => setSearch("")}
          style={styles.clearBtn}
          title="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

const styles = {
  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
    maxWidth: "240px",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    color: "var(--text-secondary)",
    opacity: 0.6,
  },
  searchInput: {
    padding: "8px 32px 8px 36px",
    fontSize: "0.85rem",
    borderRadius: "10px",
    width: "100%",
    background: "rgba(0, 0, 0, 0.15)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    color: "#fff",
    outline: "none",
    transition: "all 0.2s ease",
  },
  clearBtn: {
    position: "absolute",
    right: "10px",
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px",
    borderRadius: "4px",
    transition: "color 0.2s ease",
    ":hover": {
      color: "#fff",
    }
  }
};
// Interactive classes are governed in filebrowser.css
