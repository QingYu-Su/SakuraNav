/**
 * 编辑模式管理 Hook
 * 管理编辑模式状态和相关操作
 */

"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/app-context";

export function useEditMode() {
  const { isAuthenticated } = useAuth();
  const [editMode, setEditMode] = useState(false);

  const toggleEditMode = useCallback(() => {
    if (!isAuthenticated) return;
    setEditMode((prev) => !prev);
  }, [isAuthenticated]);

  const enterEditMode = useCallback(() => {
    if (!isAuthenticated) return;
    setEditMode(true);
  }, [isAuthenticated]);

  const exitEditMode = useCallback(() => {
    setEditMode(false);
  }, []);

  return {
    editMode,
    setEditMode,
    toggleEditMode,
    enterEditMode,
    exitEditMode,
    canEdit: isAuthenticated,
  };
}
