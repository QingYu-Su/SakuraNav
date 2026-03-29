/**
 * @description useSiteList - 网站列表管理 Hook
 * 用于获取、分页加载和筛选网站列表，支持无限滚动加载
 */

"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition, useDeferredValue } from "react";
import type { PaginatedSites } from "@/lib/types";
import { decodeCursor, encodeCursor } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import { requestJson } from "@/lib/api";

/**
 * 网站列表 Hook
 * @param options.isAuthenticated - 用户是否已认证
 * @param options.activeTagId - 当前选中的标签ID
 * @param options.query - 搜索查询字符串
 * @param options.searchEngine - 当前搜索引擎
 * @param options.refreshNonce - 刷新计数器，用于触发重新加载
 * @returns 网站列表数据、加载状态和哨兵元素引用
 */
export function useSiteList(options: {
  isAuthenticated: boolean;
  activeTagId: string | null;
  query: string;
  searchEngine: string;
  refreshNonce: number;
}) {
  const { isAuthenticated, activeTagId, query, searchEngine, refreshNonce } = options;
  
  const [siteList, setSiteList] = useState<PaginatedSites>({
    items: [],
    nextCursor: null,
    total: 0,
  });
  const [listState, setListState] = useState<
    "loading" | "refreshing" | "ready" | "loading-more" | "error"
  >("loading");
  
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const nextCursorRef = useRef<string | null>(null);
  const loadedCountRef = useRef(0);
  const [, startTransition] = useTransition();
  
  const deferredQuery = useDeferredValue(query.trim());
  const effectiveQuery = searchEngine === "local" ? deferredQuery : "";

  useEffect(() => {
    loadedCountRef.current = siteList.items.length;
  }, [siteList.items.length]);

  const fetchSitesPage = useEffectEvent(async (cursor: string | null) => {
    const params = new URLSearchParams();
    params.set("scope", activeTagId ? "tag" : "all");
    if (activeTagId) params.set("tagId", activeTagId);
    if (effectiveQuery) params.set("q", effectiveQuery);
    if (cursor) params.set("cursor", cursor);

    return requestJson<PaginatedSites>(`/api/navigation/sites?${params.toString()}`);
  });

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setListState(loadedCountRef.current ? "refreshing" : "loading");
    nextCursorRef.current = null;

    void (async () => {
      try {
        const page = await fetchSitesPage(null);
        if (requestId !== requestIdRef.current) return;

        nextCursorRef.current = page.nextCursor;
        startTransition(() => {
          setSiteList(page);
          setListState("ready");
        });
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setListState("error");
      }
    })();
  }, [activeTagId, effectiveQuery, isAuthenticated, refreshNonce]);

  const loadMoreSites = useEffectEvent(async () => {
    if (!nextCursorRef.current || listState === "loading-more" || listState === "loading") {
      return;
    }

    const cursor = nextCursorRef.current;
    setListState("loading-more");

    try {
      const page = await fetchSitesPage(cursor);
      nextCursorRef.current = page.nextCursor;
      startTransition(() => {
        setSiteList((current) => ({
          items: [...current.items, ...page.items],
          nextCursor: page.nextCursor,
          total: page.total,
        }));
        setListState("ready");
      });
    } catch (error) {
      setListState("error");
    }
  });

  useEffect(() => {
    if (!sentinelRef.current || !siteList.nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreSites();
        }
      },
      { rootMargin: "220px 0px" }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [siteList.nextCursor]);

  return {
    siteList,
    listState,
    sentinelRef,
    setSiteList,
  };
}
