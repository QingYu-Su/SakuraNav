/**
 * 搜索引擎配置持久化 Hook
 * @description 管理搜索引擎配置的 localStorage 读写，提供配置状态和更新方法
 */

"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SEARCH_ENGINE_CONFIGS } from "@/lib/config/config";
import type { SearchEngineConfig } from "@/lib/base/types";

export function useSearchEngineConfig() {
  const [engineConfigs, setEngineConfigs] = useState<SearchEngineConfig[]>(() => {
    if (typeof window === "undefined") return DEFAULT_SEARCH_ENGINE_CONFIGS;
    try {
      const stored = window.localStorage.getItem("sakura-search-engines");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_SEARCH_ENGINE_CONFIGS;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("sakura-search-engines", JSON.stringify(engineConfigs));
    } catch {
      /* ignore */
    }
  }, [engineConfigs]);

  return { engineConfigs, setEngineConfigs } as const;
}
