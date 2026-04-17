/**
 * 站点列表管理 Hook
 * @description 封装网站列表的分页获取、无限滚动加载、搜索防抖等逻辑
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { PaginatedSites } from "@/lib/types";
import { requestJson } from "@/lib/api";

export function useSakuraSiteList(deps: {
  activeTagId: string | null;
  isAuthenticated: boolean;
  refreshNonce: number;
  localSearchActive: boolean;
  localSearchQuery: string;
  onError: (msg: string) => void;
}) {
  const {
    activeTagId,
    isAuthenticated,
    refreshNonce,
    localSearchActive,
    localSearchQuery,
    onError,
  } = deps;

  const [siteList, setSiteList] = useState<PaginatedSites>({
    items: [],
    nextCursor: null,
    total: 0,
  });
  const [listState, setListState] = useState<
    "loading" | "refreshing" | "ready" | "loading-more" | "error"
  >("loading");
  const [viewEpoch, setViewEpoch] = useState(0);
  const [localSearchClosing, setLocalSearchClosing] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const nextCursorRef = useRef<string | null>(null);
  const loadedCountRef = useRef(0);
  const listStateRef = useRef(listState);
  useEffect(() => { listStateRef.current = listState; });
  const [, startTransition] = useTransition();

  const effectiveQuery = localSearchActive ? localSearchQuery : "";

  useEffect(() => {
    loadedCountRef.current = siteList.items.length;
  }, [siteList.items.length]);

  const activeTagIdRef = useRef(activeTagId);
  useEffect(() => { activeTagIdRef.current = activeTagId; });
  const debouncedQueryRef = useRef(debouncedQuery);
  useEffect(() => { debouncedQueryRef.current = debouncedQuery; });

  const fetchSitesPage = useCallback(async (cursor: string | null) => {
    const params = new URLSearchParams();
    const tagId = activeTagIdRef.current;
    const query = debouncedQueryRef.current;
    params.set("scope", tagId ? "tag" : "all");
    if (tagId) params.set("tagId", tagId);
    if (query) params.set("q", query);
    if (cursor) params.set("cursor", cursor);

    return requestJson<PaginatedSites>(
      `/api/navigation/sites?${params.toString()}`,
    );
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedQuery(effectiveQuery),
      300,
    );
    return () => window.clearTimeout(timeoutId);
  }, [effectiveQuery]);

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
          setViewEpoch((current) => current + 1);
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

  const loadMoreSites = useCallback(async () => {
    if (
      !nextCursorRef.current ||
      listStateRef.current === "loading-more" ||
      listStateRef.current === "loading"
    ) {
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
      onError(error instanceof Error ? error.message : "加载更多失败");
      setListState("error");
    }
  }, [onError, setListState, setSiteList, fetchSitesPage]);

  useEffect(() => {
    if (!sentinelRef.current || !siteList.nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreSites();
        }
      },
      { rootMargin: "220px 0px" },
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [siteList.nextCursor, loadMoreSites]);

  return {
    siteList,
    setSiteList,
    listState,
    viewEpoch,
    sentinelRef,
    debouncedQuery,
    localSearchClosing,
    setLocalSearchClosing,
    requestIdRef,
    loadMoreSites,
  };
}
