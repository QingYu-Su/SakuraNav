/**
 * 搜索栏共用逻辑 Hook
 * @description 封装主页搜索栏和悬浮搜索栏共享的搜索引擎切换、搜索建议、站内搜索、AI 推荐等全部状态和逻辑。
 * 两个组件在结果展示层面各自独立（主页使用分页 API + DnD，悬浮搜索使用独立请求），但搜索交互层面完全共用。
 */

import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/config";
import { type SearchEngine, type Site } from "@/lib/types";
import { postJson, requestJson } from "@/lib/api";

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
}

/* ---------- Hook 返回值类型 ---------- */

export interface UseSearchBarReturn {
  /* ---- 状态 ---- */
  searchEngine: SearchEngine;
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
  engineMeta: { label: string; accent: string; searchUrl: string };
  externalEngines: SearchEngine[];

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
  selectEngine: (engine: SearchEngine) => void;
  submitSearch: () => void;
  applySuggestion: (value: string) => void;
  closeSuggestionMenus: () => void;

  /** 激活站内搜索（捕获当前 query） */
  activateLocalSearch: () => void;
  /** 关闭站内搜索（清除 localSearch / ai 状态，消费者可在此基础上包装额外清理） */
  closeLocalSearch: () => void;
  /** 触发 AI 智能推荐 */
  triggerAiRecommend: () => void;
  /** 关闭 AI 推荐面板（丢弃进行中的请求） */
  closeAiPanel: () => void;
}

/* ---------- Hook 实现 ---------- */

export function useSearchBar(options?: UseSearchBarOptions): UseSearchBarReturn {
  const active = options?.active ?? true;

  /* ---- 状态 ---- */

  const [searchEngine, setSearchEngine] = useState<SearchEngine>(
    siteConfig.defaultSearchEngine === "local"
      ? (siteConfig.supportedSearchEngines.find((e) => e !== "local") ?? "google")
      : siteConfig.defaultSearchEngine,
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
  const [localSearchActive, setLocalSearchActive] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [aiResults, setAiResults] = useState<Array<{ site: Site; reason: string }>>([]);
  const [aiResultsBusy, setAiResultsBusy] = useState(false);
  const [aiReasoning, setAiReasoning] = useState("");

  /* ---- Refs ---- */

  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const suggestionRequestIdRef = useRef(0);
  const aiRequestIdRef = useRef(0);

  /* ---- 派生计算 ---- */

  const highlightedSuggestionIndex =
    suggestionInteractionMode === "pointer" && hoveredSuggestionIndex >= 0
      ? hoveredSuggestionIndex
      : activeSuggestionIndex;

  const engineMeta = siteConfig.searchEngines[searchEngine];
  const externalEngines = siteConfig.supportedSearchEngines.filter((e) => e !== "local") as SearchEngine[];

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
          setSearchSuggestionsOpen(items.length > 0);
          setActiveSuggestionIndex(items.length ? 0 : -1);
          setHoveredSuggestionIndex(-1);
          setSuggestionInteractionMode("keyboard");
        } catch {
          if (requestId !== suggestionRequestIdRef.current) return;
          const fallbackItems =
            searchEngine === "google" ? buildClientFallbackSuggestions(query.trim()) : [];
          setSearchSuggestions(fallbackItems);
          setSearchSuggestionsOpen(fallbackItems.length > 0);
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

  /* ---- 失活时重置 ---- */

  useEffect(() => {
    if (!active) {
      ++aiRequestIdRef.current;
      setSearchMenuOpen(false);
      setSearchSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      setHoveredSuggestionIndex(-1);
      setSuggestionInteractionMode("keyboard");
      setLocalSearchActive(false);
      setLocalSearchQuery("");
      setAiResults([]);
      setAiReasoning("");
      setAiResultsBusy(false);
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
    if (searchSuggestions.length) {
      setSearchSuggestionsOpen(true);
    }
  }

  function cycleSearchEngine() {
    setSearchMenuOpen((current) => !current);
  }

  function stepSearchEngine(direction: 1 | -1) {
    const engines = siteConfig.supportedSearchEngines.filter((e) => e !== "local") as SearchEngine[];
    setSearchEngine((current) => {
      const currentIndex = engines.indexOf(current);
      const nextIndex = (currentIndex + direction + engines.length) % engines.length;
      return engines[nextIndex] ?? current;
    });
    setSearchMenuOpen(false);
    setSearchSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");
  }

  function selectEngine(engine: SearchEngine) {
    setSearchEngine(engine);
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

    const trimmed = query.trim();
    if (!trimmed) return;

    const searchUrl = siteConfig.searchEngines[searchEngine].searchUrl;
    window.open(`${searchUrl}${encodeURIComponent(trimmed)}`, "_blank", "noopener,noreferrer");
  }

  function applySuggestion(value: string) {
    setSearchSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");

    window.open(
      `${siteConfig.searchEngines[searchEngine].searchUrl}${encodeURIComponent(value)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function closeSuggestionMenus() {
    setSearchMenuOpen(false);
    setSearchSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");
  }

  function activateLocalSearch() {
    if (!query.trim()) return;
    setLocalSearchActive(true);
    setLocalSearchQuery(query.trim());
    setAiResults([]);
    setAiReasoning("");
  }

  function closeLocalSearch() {
    ++aiRequestIdRef.current;
    setLocalSearchActive(false);
    setLocalSearchQuery("");
    setAiResults([]);
    setAiReasoning("");
    setAiResultsBusy(false);
  }

  function triggerAiRecommend() {
    if (!localSearchQuery) return;
    const aiRequestId = ++aiRequestIdRef.current;
    setAiResults([]);
    setAiReasoning("");
    setAiResultsBusy(true);
    void requestJson<{
      items: Array<{ site: Site; reason: string }>;
      reasoning: string;
    }>("/api/ai/recommend", postJson({ query: localSearchQuery }))
      .then((data) => {
        if (aiRequestId !== aiRequestIdRef.current) return;
        setAiResults(data.items);
        setAiReasoning(data.reasoning);
      })
      .catch(() => {
        if (aiRequestId !== aiRequestIdRef.current) return;
        setAiResults([]);
        setAiReasoning("");
      })
      .finally(() => {
        if (aiRequestId === aiRequestIdRef.current) setAiResultsBusy(false);
      });
  }

  function closeAiPanel() {
    ++aiRequestIdRef.current;
    setAiResults([]);
    setAiReasoning("");
    setAiResultsBusy(false);
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
    externalEngines,

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
    activateLocalSearch,
    closeLocalSearch,
    triggerAiRecommend,
    closeAiPanel,
  };
}
