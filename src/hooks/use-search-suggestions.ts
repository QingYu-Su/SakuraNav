"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchEngine } from "@/lib/types";
import { siteConfig } from "@/lib/config";

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

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? "请求失败");
  }

  return data as T;
}

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
