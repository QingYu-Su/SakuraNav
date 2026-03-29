/**
 * @description useSearchSuggestions - 搜索建议管理 Hook
 * 用于管理搜索输入时的建议列表，支持键盘导航和指针悬停交互
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchEngine } from "@/lib/types";
import { siteConfig } from "@/lib/config";
import { requestJson } from "@/lib/api";

/**
 * 搜索建议类型
 * @property value - 建议文本
 * @property kind - 建议类型：query(查询词) | site(网站) | tag(标签)
 */
export type SearchSuggestion = {
  value: string;
  kind: "query" | "site" | "tag";
};

type SuggestionInteractionMode = "keyboard" | "pointer";

function buildClientFallbackSuggestions(query: string): SearchSuggestion[] {
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

/**
 * 搜索建议 Hook
 * @param options.query - 当前搜索查询字符串
 * @param options.searchEngine - 当前搜索引擎
 * @param options.isAuthenticated - 用户是否已认证
 * @returns 搜索建议列表及相关操作方法
 */
export function useSearchSuggestions(options: {
  query: string;
  searchEngine: SearchEngine;
  isAuthenticated: boolean;
}) {
  const { query, searchEngine, isAuthenticated } = options;
  
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [searchSuggestionsBusy, setSearchSuggestionsBusy] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);
  const [suggestionInteractionMode, setSuggestionInteractionMode] =
    useState<SuggestionInteractionMode>("keyboard");
  const suggestionRequestIdRef = useRef(0);

  const highlightedSuggestionIndex =
    suggestionInteractionMode === "pointer" && hoveredSuggestionIndex >= 0
      ? hoveredSuggestionIndex
      : activeSuggestionIndex;

  useEffect(() => {
    if (searchEngine === "local" || !query.trim()) {
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
            `/api/search/suggest?${params.toString()}`
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
  }, [query, searchEngine]);

  const resetSuggestions = () => {
    setSearchSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");
  };

  return {
    searchSuggestions,
    searchSuggestionsOpen,
    searchSuggestionsBusy,
    activeSuggestionIndex,
    hoveredSuggestionIndex,
    highlightedSuggestionIndex,
    suggestionInteractionMode,
    setSearchSuggestionsOpen,
    setActiveSuggestionIndex,
    setHoveredSuggestionIndex,
    setSuggestionInteractionMode,
    resetSuggestions,
  };
}
