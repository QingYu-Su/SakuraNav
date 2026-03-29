/**
 * 侧边栏折叠状态管理 Hook
 * 管理侧边栏的折叠/展开状态
 */

"use client";

import { useState, useCallback } from "react";

export function useSidebarCollapse() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const collapseSidebar = useCallback(() => {
    setSidebarCollapsed(true);
  }, []);

  const expandSidebar = useCallback(() => {
    setSidebarCollapsed(false);
  }, []);

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebarCollapse,
    collapseSidebar,
    expandSidebar,
  };
}
