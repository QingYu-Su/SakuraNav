/**
 * 查询状态管理 Hook
 * 管理搜索查询字符串
 */

"use client";

import { useState, useCallback } from "react";

export function useQuery() {
  const [query, setQuery] = useState("");

  // 更新查询
  const updateQuery = useCallback((value: string) => {
    setQuery(value);
  }, []);

  // 清除查询
  const clearQuery = useCallback(() => {
    setQuery("");
  }, []);

  // 获取 trim 后的查询
  const trimmedQuery = query.trim();

  return {
    query,
    setQuery,
    updateQuery,
    clearQuery,
    trimmedQuery,
  };
}
