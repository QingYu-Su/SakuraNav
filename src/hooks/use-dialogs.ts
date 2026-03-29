/**
 * 对话框状态管理 Hook
 * 统一管理多个对话框的打开/关闭状态
 */

"use client";

import { useState, useCallback } from "react";

type DialogKey = 
  | "appearance"
  | "config"
  | "admin"
  | "wallpaperUrl"
  | "assetUrl"
  | "configConfirm"
  | "floatingSearch";

export function useDialogs() {
  const [openDialogs, setOpenDialogs] = useState<Set<DialogKey>>(new Set());

  const openDialog = useCallback((key: DialogKey) => {
    setOpenDialogs((prev) => new Set(prev).add(key));
  }, []);

  const closeDialog = useCallback((key: DialogKey) => {
    setOpenDialogs((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const toggleDialog = useCallback((key: DialogKey) => {
    setOpenDialogs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isDialogOpen = useCallback(
    (key: DialogKey) => openDialogs.has(key),
    [openDialogs]
  );

  return {
    openDialog,
    closeDialog,
    toggleDialog,
    isDialogOpen,
    
    // 便捷方法
    appearanceDrawerOpen: isDialogOpen("appearance"),
    setAppearanceDrawerOpen: (open: boolean) => 
      open ? openDialog("appearance") : closeDialog("appearance"),
    
    configDrawerOpen: isDialogOpen("config"),
    setConfigDrawerOpen: (open: boolean) => 
      open ? openDialog("config") : closeDialog("config"),
    
    drawerOpen: isDialogOpen("admin"),
    setDrawerOpen: (open: boolean) => 
      open ? openDialog("admin") : closeDialog("admin"),
    
    floatingSearchOpen: isDialogOpen("floatingSearch"),
    setFloatingSearchOpen: (open: boolean) => 
      open ? openDialog("floatingSearch") : closeDialog("floatingSearch"),
  };
}
