import React from "react";
import MainLayout from "../layout/MainLayout";
import ActivityLogs from "../components/ActivityLogs";

export default function LogsPage({
  currentTab,
  setCurrentTab,
  username,
  onLogout,
  refreshTrigger,
  isSidebarOpen,
  toggleSidebar,
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
        <ActivityLogs />
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
