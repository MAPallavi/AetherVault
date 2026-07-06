import React from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function MainLayout({
  children,
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
    <div className="app-container">
      {/* Stateful Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        username={username}
        onLogout={onLogout}
        refreshTrigger={refreshTrigger}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      {/* Main content body wrapper */}
      <div className="main-wrapper">
        <Navbar
          toggleSidebar={toggleSidebar}
          username={username}
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onPreviewSelect={onPreviewSelect}
          onProfileClick={() => setCurrentTab("settings")}
        />

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}