import React from "react";
import MainLayout from "../layout/MainLayout";
import FileBrowser from "../components/FileBrowser";

export default function FilesPage({
  currentTab,
  setCurrentTab,
  username,
  onLogout,
  refreshTrigger,
  isSidebarOpen,
  toggleSidebar,
  onActionSuccess,
  onPreviewSelect
}) {
  return (
    <MainLayout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      username={username}
      onLogout={onLogout}
      refreshTrigger={refreshTrigger}
      isSidebarOpen={isSidebarOpen}
      toggleSidebar={toggleSidebar}
      onPreviewSelect={onPreviewSelect}
    >
      <div style={styles.container}>
        <FileBrowser
          onActionSuccess={onActionSuccess}
          onPreviewSelect={onPreviewSelect}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </MainLayout>
  );
}

const styles = {
  container: {
    padding: "0 24px",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  }
};
