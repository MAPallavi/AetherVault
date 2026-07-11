import React from "react";
import { Grid, List, ArrowUpDown } from "lucide-react";

export default function FilterBar({
  filterType,
  setFilterType,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode
}) {
  const fileTypes = [
    "ALL",
    "FAVORITES",
    "TAGGED",
    "IMAGES",
    "DOCUMENTS",
    "VIDEOS",
    "AUDIO",
    "PDF",
    "ARCHIVES",
    "FOLDERS"
  ];
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "size", label: "Size" },
    { value: "date", label: "Date" }
  ];

  return (
    <div style={styles.container}>
      {/* File Category Filter */}
      <div style={styles.filterGroup}>
        <select
          className="input-field"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={styles.dropdown}
        >
          {fileTypes.map(type => (
            <option key={type} value={type} style={{ background: "#1a1d24" }}>
              {type === "ALL" ? "All Files" : 
               type === "FAVORITES" ? "Favorites" : 
               type === "TAGGED" ? "Tagged" : 
               type === "IMAGES" ? "Images" : 
               type === "DOCUMENTS" ? "Documents" : 
               type === "VIDEOS" ? "Videos" : 
               type === "AUDIO" ? "Audio" : 
               type === "PDF" ? "PDF" : 
               type === "ARCHIVES" ? "Archives" : 
               type === "FOLDERS" ? "Folders" : 
               type}
            </option>
          ))}
        </select>
      </div>

      {/* Sorting selectors */}
      <div style={styles.sortGroup}>
        <select
          className="input-field"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={styles.dropdown}
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value} style={{ background: "#1a1d24" }}>
              Sort by {opt.label}
            </option>
          ))}
        </select>

        {/* Sort order toggle icon */}
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="btn btn-secondary btn-icon"
          title="Toggle sort direction"
          style={styles.sortToggle}
        >
          <ArrowUpDown size={14} />
        </button>
      </div>

      {/* Grid/List Toggle buttons */}
      <div style={styles.viewModeGroup}>
        <button
          onClick={() => setViewMode("grid")}
          className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
          style={{
            ...styles.viewBtn,
            ...(viewMode === "grid" ? styles.viewBtnActive : {})
          }}
          title="Grid View"
        >
          <Grid size={16} />
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`view-btn ${viewMode === "list" ? "active" : ""}`}
          style={{
            ...styles.viewBtn,
            ...(viewMode === "list" ? styles.viewBtnActive : {})
          }}
          title="List View"
        >
          <List size={16} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  filterGroup: {
    minWidth: "130px",
  },
  sortGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    minWidth: "170px",
  },
  dropdown: {
    padding: "6px 12px",
    fontSize: "0.85rem",
    borderRadius: "10px",
    cursor: "pointer",
  },
  sortToggle: {
    width: "32px",
    height: "32px",
  },
  viewModeGroup: {
    display: "flex",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "8px",
    padding: "2px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  viewBtn: {
    background: "transparent",
    border: "none",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--text-secondary)",
    transition: "all 0.2s ease",
  },
  viewBtnActive: {
    background: "rgba(255, 255, 255, 0.1)",
    color: "#fff",
  },
};
