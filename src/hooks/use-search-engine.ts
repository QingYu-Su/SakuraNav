/**
 * 搜索引擎状态管理 Hook
 * 管理搜索引擎选择和切换逻辑
 */

"use client";

import { useState, useCallback } from "react";
import { siteConfig } from "@/lib/config";
import type { SearchEngine } from "@/lib/types";

export function useSearchEngine() {
  const [searchEngine, setSearchEngine] = useState<SearchEngine>(
    siteConfig.defaultSearchEngine
  );
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);

  // 获取当前搜索引擎元数据
  const engineMeta = siteConfig.searchEngines[searchEngine];

  // 切换搜索引擎
  const selectSearchEngine = useCallback((engine: SearchEngine) => {
    setSearchEngine(engine);
    setSearchMenuOpen(false);
  }, []);

  // 切换菜单显示
  const toggleSearchMenu = useCallback(() => {
    setSearchMenuOpen((prev) => !prev);
  }, []);

  // 关闭菜单
  const closeSearchMenu = useCallback(() => {
    setSearchMenuOpen(false);
  }, []);

  // 步进切换搜索引擎（用于键盘导航）
  const stepSearchEngine = useCallback((direction: 1 | -1) => {
    const engines = siteConfig.supportedSearchEngines;
    const currentIndex = engines.indexOf(searchEngine);
    const nextIndex =
      (currentIndex + direction + engines.length) % engines.length;
    setSearchEngine(engines[nextIndex] ?? siteConfig.defaultSearchEngine);
    setSearchMenuOpen(false);
  }, [searchEngine]);

  return {
    searchEngine,
    setSearchEngine,
    searchMenuOpen,
    setSearchMenuOpen,
    engineMeta,
    selectSearchEngine,
    toggleSearchMenu,
    closeSearchMenu,
    stepSearchEngine,
    supportedEngines: siteConfig.supportedSearchEngines,
    enginesConfig: siteConfig.searchEngines,
  };
}
