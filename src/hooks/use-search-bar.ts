/**
 * 搜索栏共用逻辑 Hook
 * @description 封装主页搜索栏和悬浮搜索栏共享的搜索引擎切换、搜索建议、站内搜索、AI 推荐等全部状态和逻辑。
 * 两个组件在结果展示层面各自独立（主页使用分页 API + DnD，悬浮搜索使用独立请求），但搜索交互层面完全共用。
 */

import { useEffect, useRef, useState } from "react";
import { DEFAULT_SEARCH_ENGINE_CONFIGS } from "@/lib/config/config";
import { type SearchEngineConfig, type Site } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import { useAiRecommend } from "./use-ai-recommend";

/* ---------- 类型 ---------- */

export type SearchSuggestion = {
  value: string;
  kind: "query" | "site" | "tag";
};

export type SuggestionInteractionMode = "keyboard" | "pointer";

/* ---------- 工具函数 ---------- */

export function buildClientFallbackSuggestions(query: string): SearchSuggestion[] {
  const candidates = [query, `${query} 官网`, `${query} 教程`, `${query} 下载`, `${query} github`];
  const seen = new Set<string>();
  return candidates
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .map((value) => ({ value, kind: "query" as const }));
}

/** 将搜索引擎配置的 searchUrl（含 %s 占位符）解析为实际搜索 URL */
export function resolveSearchUrl(searchUrl: string, query: string): string {
  if (!searchUrl) return "";
  if (searchUrl.includes("%s")) {
    return searchUrl.replace("%s", encodeURIComponent(query));
  }
  // 兼容旧的前缀格式
  return `${searchUrl}${encodeURIComponent(query)}`;
}

/* ---------- Hook 选项 ---------- */

export interface UseSearchBarOptions {
  /**
   * 搜索栏是否处于激活状态。
   * - 主页搜索栏：始终为 `true`
   * - 悬浮搜索栏：跟随对话框 `open` prop
   *
   * 控制搜索建议是否获取、以及失活时的状态重置。
   * @default true
   */
  active?: boolean;
  /** 可编辑的搜索引擎配置列表 */
  engines?: SearchEngineConfig[];
}

/* ---------- Hook 返回值类型 ---------- */

export interface UseSearchBarReturn {
  /* ---- 状态 ---- */
  searchEngine: string;
  query: string;
  searchMenuOpen: boolean;
  searchSuggestions: SearchSuggestion[];
  searchSuggestionsOpen: boolean;
  searchSuggestionsBusy: boolean;
  activeSuggestionIndex: number;
  hoveredSuggestionIndex: number;
  suggestionInteractionMode: SuggestionInteractionMode;
  localSearchActive: boolean;
  localSearchQuery: string;
  aiResults: Array<{ site: Site; reason: string }>;
  aiResultsBusy: boolean;
  aiReasoning: string;

  /* ---- Refs ---- */
  searchFormRef: React.RefObject<HTMLFormElement | null>;
  aiRequestIdRef: React.RefObject<number>;

  /* ---- 派生计算 ---- */
  highlightedSuggestionIndex: number;
  engineMeta: SearchEngineConfig | null;
  engineList: SearchEngineConfig[];

  /* ---- 额外 Setter（供 onKeyDown 等场景使用） ---- */
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setSearchMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveSuggestionIndex: React.Dispatch<React.SetStateAction<number>>;
  setHoveredSuggestionIndex: React.Dispatch<React.SetStateAction<number>>;
  setSuggestionInteractionMode: React.Dispatch<React.SetStateAction<SuggestionInteractionMode>>;
  handleQueryChange: (value: string) => void;
  handleSuggestionFocus: () => void;
  cycleSearchEngine: () => void;
  stepSearchEngine: (direction: 1 | -1) => void;
  selectEngine: (engineId: string) => void;
  submitSearch: () => void;
  applySuggestion: (value: string) => void;
  closeSuggestionMenus: () => void;
  /** 手动关闭搜索推荐下拉框（标记已关闭，再次聚焦输入框才重新出现） */
  dismissSuggestions: () => void;
  /** 清除输入框内容并关闭所有推荐菜单 */
  clearInput: () => void;

  /** 激活站内搜索（捕获当前 query） */
  activateLocalSearch: () => void;
  /** 关闭站内搜索（清除 localSearch / ai 状态，消费者可在此基础上包装额外清理） */
  closeLocalSearch: () => void;
  /** 触发 AI 智能推荐 */
  triggerAiRecommend: () => void;
  /** 关闭 AI 推荐面板（丢弃进行中的请求） */
  closeAiPanel: () => void;
  /** 搜索栏键盘事件处理 */
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

/* ---------- Hook 实现 ---------- */

export function useSearchBar(options?: UseSearchBarOptions): UseSearchBarReturn {
  const active = options?.active ?? true;
  const engineConfigs = options?.engines ?? DEFAULT_SEARCH_ENGINE_CONFIGS;

  /* ---- 状态 ---- */

  const [searchEngine, setSearchEngine] = useState<string>(
    () => engineConfigs[0]?.id ?? "google",
  );
  const [query, setQuery] = useState("");
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [searchSuggestionsBusy, setSearchSuggestionsBusy] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);
  const [suggestionInteractionMode, setSuggestionInteractionMode] =
    useState<SuggestionInteractionMode>("keyboard");
  /* ---- AI 推荐 & 站内搜索（委托给专用 hook） ---- */

  const {
    localSearchActive,
    localSearchQuery,
    aiResults,
    aiResultsBusy,
    aiReasoning,
    aiRequestIdRef,
    activateLocalSearch,
    closeLocalSearch,
    triggerAiRecommend,
    closeAiPanel,
  } = useAiRecommend({ active, query });

  /* ---- Refs ---- */

  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const suggestionRequestIdRef = useRef(0);
  const suggestionDismissedRef = useRef(false);

  /* ---- 派生计算 ---- */

  const highlightedSuggestionIndex =
    suggestionInteractionMode === "pointer" && hoveredSuggestionIndex >= 0
      ? hoveredSuggestionIndex
      : activeSuggestionIndex;

  const engineMeta = engineConfigs.find((e) => e.id === searchEngine) ?? null;
  const engineList = engineConfigs;

  /* ---- 引擎配置变化时校验当前引擎 ---- */

  useEffect(() => {
    setSearchEngine((current) => {
      if (engineConfigs.some((e) => e.id === current)) return current;
      return engineConfigs[0]?.id ?? "google";
    });
  }, [engineConfigs]);

  /* ---- 搜索建议获取 ---- */

  useEffect(() => {
    if (!active || !query.trim()) {
      setSearchSuggestions([]);
      setSearchSuggestionsOpen(false);
      setSearchSuggestionsBusy(false);
      setActiveSuggestionIndex(-1);
      setHoveredSuggestionIndex(-1);
      setSuggestionInteractionMode("keyboard");
      return;
    }

    const requestId = ++suggestionRequestIdRef.current;
    setSearchSuggestionsBusy(true);

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({
            engine: searchEngine,
            q: query.trim(),
          });
          const data = await requestJson<{ items: SearchSuggestion[] }>(
            `/api/search/suggest?${params.toString()}`,
          );
          if (requestId !== suggestionRequestIdRef.current) return;
          const items =
            searchEngine === "google" && data.items.length === 0
              ? buildClientFallbackSuggestions(query.trim())
              : data.items;
          setSearchSuggestions(items);
          if (!suggestionDismissedRef.current) setSearchSuggestionsOpen(items.length > 0);
          setActiveSuggestionIndex(items.length ? 0 : -1);
          setHoveredSuggestionIndex(-1);
          setSuggestionInteractionMode("keyboard");
        } catch {
          if (requestId !== suggestionRequestIdRef.current) return;
          const fallbackItems =
            searchEngine === "google" ? buildClientFallbackSuggestions(query.trim()) : [];
          setSearchSuggestions(fallbackItems);
          if (!suggestionDismissedRef.current) setSearchSuggestionsOpen(fallbackItems.length > 0);
          setActiveSuggestionIndex(fallbackItems.length ? 0 : -1);
          setHoveredSuggestionIndex(-1);
          setSuggestionInteractionMode("keyboard");
        } finally {
          if (requestId === suggestionRequestIdRef.current) {
            setSearchSuggestionsBusy(false);
          }
        }
      })();
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [active, query, searchEngine]);

  /* ---- 失活时重置（搜索建议相关状态） ---- */

  useEffect(() => {
    if (!active) {
      suggestionDismissedRef.current = false;
      setSearchMenuOpen(false);
      setSearchSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      setHoveredSuggestionIndex(-1);
      setSuggestionInteractionMode("keyboard");
    }
  }, [active]);

  /* ---- 操作函数 ---- */

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");
  }

  function handleSuggestionFocus() {
    suggestionDismissedRef.current = false;
    if (searchSuggestions.length) {
      setSearchSuggestionsOpen(true);
    }
  }

  function cycleSearchEngine() {
    setSearchMenuOpen((current) => !current);
  }

  function stepSearchEngine(direction: 1 | -1) {
    setSearchEngine((current) => {
      const currentIndex = engineConfigs.findIndex((e) => e.id === current);
      const nextIndex = (currentIndex + direction + engineConfigs.length) % engineConfigs.length;
      return engineConfigs[nextIndex]?.id ?? current;
    });
    setSearchMenuOpen(false);
    setSearchSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");
  }

  function selectEngine(engineId: string) {
    setSearchEngine(engineId);
    setSearchMenuOpen(false);
    setSearchSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");
  }

  function submitSearch() {
    setSearchMenuOpen(false);
    setSearchSuggestionsOpen(false);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");

    const engine = engineConfigs.find((e) => e.id === searchEngine);
    if (!engine || !engine.searchUrl) return;

    const trimmed = query.trim();
    if (trimmed) {
      window.open(resolveSearchUrl(engine.searchUrl, trimmed), "_blank", "noopener,noreferrer");
    } else {
      try {
        const url = engine.searchUrl.includes("%s")
          ? new URL(engine.searchUrl.split("%s")[0]).origin
          : new URL(engine.searchUrl).origin;
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        // URL 解析失败则不跳转
      }
    }
  }

  function applySuggestion(value: string) {
    setSearchSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");

    const engine = engineConfigs.find((e) => e.id === searchEngine);
    if (!engine || !engine.searchUrl) return;
    window.open(resolveSearchUrl(engine.searchUrl, value), "_blank", "noopener,noreferrer");
  }

  function closeSuggestionMenus() {
    setSearchMenuOpen(false);
    setSearchSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");
  }

  function dismissSuggestions() {
    suggestionDismissedRef.current = true;
    setSearchSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");
  }

  function clearInput() {
    ++suggestionRequestIdRef.current;
    setQuery("");
    setSearchSuggestionsOpen(false);
    setSearchMenuOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      stepSearchEngine(event.shiftKey ? -1 : 1);
      return;
    }
    if (!searchSuggestionsOpen || !searchSuggestions.length) {
      if (event.key === "Escape") closeSuggestionMenus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const base = highlightedSuggestionIndex >= 0 ? highlightedSuggestionIndex : activeSuggestionIndex;
      setSuggestionInteractionMode("keyboard");
      setHoveredSuggestionIndex(-1);
      setActiveSuggestionIndex(base < 0 ? 0 : (base + 1) % searchSuggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const base = highlightedSuggestionIndex >= 0 ? highlightedSuggestionIndex : activeSuggestionIndex;
      setSuggestionInteractionMode("keyboard");
      setHoveredSuggestionIndex(-1);
      setActiveSuggestionIndex(base <= 0 ? searchSuggestions.length - 1 : base - 1);
      return;
    }
    if (event.key === "Enter" && highlightedSuggestionIndex >= 0) {
      event.preventDefault();
      const s = searchSuggestions[highlightedSuggestionIndex];
      if (s) applySuggestion(s.value);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeSuggestionMenus();
    }
  }

  return {
    // State
    searchEngine,
    query,
    searchMenuOpen,
    searchSuggestions,
    searchSuggestionsOpen,
    searchSuggestionsBusy,
    activeSuggestionIndex,
    hoveredSuggestionIndex,
    suggestionInteractionMode,
    localSearchActive,
    localSearchQuery,
    aiResults,
    aiResultsBusy,
    aiReasoning,

    // Refs
    searchFormRef,
    aiRequestIdRef,

    // Computed
    highlightedSuggestionIndex,
    engineMeta,
    engineList,

    // Extra setters
    setQuery,
    setSearchMenuOpen,
    setActiveSuggestionIndex,
    setHoveredSuggestionIndex,
    setSuggestionInteractionMode,

    // Functions
    handleQueryChange,
    handleSuggestionFocus,
    cycleSearchEngine,
    stepSearchEngine,
    selectEngine,
    submitSearch,
    applySuggestion,
    closeSuggestionMenus,
    dismissSuggestions,
    clearInput,
    activateLocalSearch,
    closeLocalSearch,
    triggerAiRecommend,
    closeAiPanel,
    handleKeyDown,
  };
}
