/**
 * 标签过滤状态管理 Hook
 * 管理当前选中的标签和过滤逻辑
 */

"use client";

import { useState, useCallback } from "react";
import { useTags } from "@/contexts/app-context";

export function useTagFilter() {
  const { tags } = useTags();
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  // 获取当前标签名称
  const activeTagName = activeTagId
    ? tags.find((tag) => tag.id === activeTagId)?.name ?? "全部网站"
    : "全部网站";

  // 切换标签
  const toggleTag = useCallback((tagId: string | null) => {
    setActiveTagId((current) => (current === tagId ? null : tagId));
  }, []);

  // 清除标签过滤
  const clearTagFilter = useCallback(() => {
    setActiveTagId(null);
  }, []);

  // 验证标签是否存在
  const isTagValid = useCallback(
    (tagId: string) => {
      return tags.some((tag) => tag.id === tagId);
    },
    [tags]
  );

  return {
    activeTagId,
    setActiveTagId,
    activeTagName,
    toggleTag,
    clearTagFilter,
    isTagValid,
  };
}
