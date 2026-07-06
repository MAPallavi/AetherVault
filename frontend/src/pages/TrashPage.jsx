import React from "react";
import MainLayout from "../layout/MainLayout";
import RecycleBin from "../components/RecycleBin";

export default function TrashPage({
  currentTab,
  setCurrentTab,
  username,
  onLogout,
  refreshTrigger,
  isSidebarOpen,
  toggleSidebar,
  onActionSuccess,
  onPreviewSelect,
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
        <RecycleBin onActionSuccess={onActionSuccess} />
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
