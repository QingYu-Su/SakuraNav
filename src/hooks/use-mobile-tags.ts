/**
 * 移动端标签栏状态管理 Hook
 * 管理移动端标签栏的显示/隐藏状态
 */

"use client";

import { useState, useCallback } from "react";

export function useMobileTags() {
  const [mobileTagsOpen, setMobileTagsOpen] = useState(false);

  const toggleMobileTags = useCallback(() => {
    setMobileTagsOpen((prev) => !prev);
  }, []);

  const openMobileTags = useCallback(() => {
    setMobileTagsOpen(true);
  }, []);

  const closeMobileTags = useCallback(() => {
    setMobileTagsOpen(false);
  }, []);

  return {
    mobileTagsOpen,
    setMobileTagsOpen,
    toggleMobileTags,
    openMobileTags,
    closeMobileTags,
  };
}
