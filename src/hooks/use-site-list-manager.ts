/**
 * 站点列表管理 Hook
 * @description 封装站点列表的分页加载、搜索、无限滚动等逻辑
 */

import { useEffect, useEffectEvent, useDeferredValue, useRef, useState, useTransition } from "react";
import type { PaginatedSites } from "@/lib/types";
import { requestJson } from "@/lib/api";

export function useSiteList(options: {
  activeTagId: string | null;
  debouncedQuery: string;
  isAuthenticated: boolean;
  refreshNonce: number;
}) {
  const { activeTagId, debouncedQuery, isAuthenticated, refreshNonce } = options;

  const [siteList, setSiteList] = useState<PaginatedSites>({ items: [], nextCursor: null, total: 0 });
  const [listState, setListState] = useState<"loading" | "refreshing" | "ready" | "loading-more" | "error">("loading");
  const [viewEpoch, setViewEpoch] = useState(0);
  const [localSearchClosing, setLocalSearchClosing] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const nextCursorRef = useRef<string | null>(null);
  const loadedCountRef = useRef(0);
  const [, startTransition] = useTransition();

  useEffect(() => { loadedCountRef.current = siteList.items.length; }, [siteList.items.length]);

  const fetchSitesPage = useEffectEvent(async (cursor: string | null) => {
    const params = new URLSearchParams();
    params.set("scope", activeTagId ? "tag" : "all");
    if (activeTagId) params.set("tagId", activeTagId);
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (cursor) params.set("cursor", cursor);
    return requestJson<PaginatedSites>(`/api/navigation/sites?${params.toString()}`);
  });

  const setErrorMessage = useEffectEvent((msg: string) => { /* no-op, caller handles */ });

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setListState(loadedCountRef.current ? "refreshing" : "loading");
    nextCursorRef.current = null;
    void (async () => {
      try {
        const page = await fetchSitesPage(null);
        if (requestId !== requestIdRef.current) return;
        nextCursorRef.current = page.nextCursor;
        startTransition(() => { setSiteList(page); setViewEpoch((c) => c + 1); setListState("ready"); setLocalSearchClosing(false); });
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setListState("error");
      }
    })();
  }, [activeTagId, debouncedQuery, isAuthenticated, refreshNonce]);

  const loadMoreSites = useEffectEvent(async () => {
    if (!nextCursorRef.current || listState === "loading-more" || listState === "loading") return;
    const cursor = nextCursorRef.current; setListState("loading-more");
    try {
      const page = await fetchSitesPage(cursor); nextCursorRef.current = page.nextCursor;
      startTransition(() => { setSiteList((c) => ({ items: [...c.items, ...page.items], nextCursor: page.nextCursor, total: page.total })); setListState("ready"); });
    } catch { setListState("error"); }
  });

  useEffect(() => {
    if (!sentinelRef.current || !siteList.nextCursor) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) void loadMoreSites(); }, { rootMargin: "220px 0px" });
    observer.observe(sentinelRef.current); return () => observer.disconnect();
  }, [siteList.nextCursor]);

  return {
    siteList,
    setSiteList,
    listState,
    setListState,
    viewEpoch,
    localSearchClosing,
    setLocalSearchClosing,
    sentinelRef,
    requestIdRef,
    loadedCountRef,
    refreshSiteList: () => { /* trigger via refreshNonce */ },
  };
}
