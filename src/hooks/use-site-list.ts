/**
 * 站点列表管理 Hook
 * @description 管理站点分页加载、无限滚动、搜索防抖等逻辑
 */

"use client";

import { useDeferredValue, useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import type { PaginatedSites } from "@/lib/types";
import { requestJson } from "@/lib/api";

export type ListState = "loading" | "refreshing" | "ready" | "loading-more" | "error";

export interface UseSiteListOptions {
  activeTagId: string | null;
  isAuthenticated: boolean;
  localSearchActive: boolean;
  localSearchQuery: string;
  refreshNonce: number;
  onError: (message: string) => void;
}

export interface UseSiteListReturn {
  siteList: PaginatedSites;
  setSiteList: React.Dispatch<React.SetStateAction<PaginatedSites>>;
  listState: ListState;
  viewEpoch: number;
  localSearchClosing: boolean;
  deferredQuery: string;
  debouncedQuery: string;
  setDebouncedQuery: React.Dispatch<React.SetStateAction<string>>;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  requestIdRef: React.RefObject<number>;
  closeLocalSearch: () => void;
}

export function useSiteList({
  activeTagId,
  isAuthenticated,
  localSearchActive,
  localSearchQuery,
  refreshNonce,
  onError,
}: UseSiteListOptions): UseSiteListReturn {
  const [siteList, setSiteList] = useState<PaginatedSites>({ items: [], nextCursor: null, total: 0 });
  const [listState, setListState] = useState<ListState>("loading");
  const [viewEpoch, setViewEpoch] = useState(0);
  const [localSearchClosing, setLocalSearchClosing] = useState(false);
  const deferredQuery = useDeferredValue((localSearchActive ? localSearchQuery : "").trim());
  const [debouncedQuery, setDebouncedQuery] = useState(deferredQuery);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const nextCursorRef = useRef<string | null>(null);
  const loadedCountRef = useRef(0);
  const [, startTransition] = useTransition();

  /* ---- 站点列表防抖 ---- */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(deferredQuery), 300);
    return () => window.clearTimeout(timeoutId);
  }, [deferredQuery]);

  /* ---- 已加载数量追踪 ---- */
  useEffect(() => {
    loadedCountRef.current = siteList.items.length;
  }, [siteList.items.length]);

  /* ---- 获取站点页面 ---- */
  const fetchSitesPage = useEffectEvent(async (cursor: string | null) => {
    const params = new URLSearchParams();
    params.set("scope", activeTagId ? "tag" : "all");
    if (activeTagId) params.set("tagId", activeTagId);
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (cursor) params.set("cursor", cursor);
    return requestJson<PaginatedSites>(`/api/navigation/sites?${params.toString()}`);
  });

  /* ---- 首次/刷新加载 ---- */
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 立即显示加载状态再异步请求
    setListState(loadedCountRef.current ? "refreshing" : "loading");
    nextCursorRef.current = null;
    void (async () => {
      try {
        const page = await fetchSitesPage(null);
        if (requestId !== requestIdRef.current) return;
        nextCursorRef.current = page.nextCursor;
        startTransition(() => {
          setSiteList(page);
          setViewEpoch((c) => c + 1);
          setListState("ready");
          setLocalSearchClosing(false);
        });
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        onError(error instanceof Error ? error.message : "加载失败");
        setListState("error");
      }
    })();
  }, [activeTagId, debouncedQuery, isAuthenticated, refreshNonce, onError]);

  /* ---- 加载更多（无限滚动） ---- */
  const loadMoreSites = useEffectEvent(async () => {
    if (!nextCursorRef.current || listState === "loading-more" || listState === "loading") return;
    const cursor = nextCursorRef.current;
    setListState("loading-more");
    try {
      const page = await fetchSitesPage(cursor);
      nextCursorRef.current = page.nextCursor;
      startTransition(() => {
        setSiteList((c) => ({ items: [...c.items, ...page.items], nextCursor: page.nextCursor, total: page.total }));
        setListState("ready");
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "加载更多失败");
      setListState("error");
    }
  });

  useEffect(() => {
    if (!sentinelRef.current || !siteList.nextCursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreSites();
      },
      { rootMargin: "220px 0px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [siteList.nextCursor]);

  /* ---- 关闭站内搜索 ---- */
  function closeLocalSearch() {
    ++requestIdRef.current;
    setLocalSearchClosing(true);
    setDebouncedQuery("");
  }

  return {
    siteList,
    setSiteList,
    listState,
    viewEpoch,
    localSearchClosing,
    deferredQuery,
    debouncedQuery,
    setDebouncedQuery,
    sentinelRef,
    requestIdRef,
    closeLocalSearch,
  };
}
