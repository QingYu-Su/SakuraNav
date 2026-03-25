"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  GripVertical,
  LoaderCircle,
  LogOut,
  MoonStar,
  PaintBucket,
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
  Plus,
  Search,
  SunMedium,
  Trash2,
  X,
} from "lucide-react";
import {
  type Dispatch,
  type SetStateAction,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { fontPresets, siteConfig } from "@/lib/config";
import {
  AdminBootstrap,
  FontPresetKey,
  PaginatedSites,
  SearchEngine,
  SessionUser,
  Site,
  Tag,
  ThemeAppearance,
  ThemeMode,
} from "@/lib/types";
import { clamp, cn } from "@/lib/utils";

type Props = {
  initialTags: Tag[];
  initialAppearances: Record<ThemeMode, ThemeAppearance>;
  initialSession: SessionUser | null;
};

type SiteFormState = {
  id?: string;
  name: string;
  url: string;
  description: string;
  iconUrl: string;
  tagIds: string[];
};

type TagFormState = {
  id?: string;
  name: string;
  isHidden: boolean;
};

type AppearanceDraft = Record<
  ThemeMode,
  {
    wallpaperAssetId: string | null;
    wallpaperUrl: string | null;
    fontPreset: FontPresetKey;
    overlayOpacity: number;
    textColor: string;
  }
>;

const defaultSiteForm: SiteFormState = {
  name: "",
  url: "",
  description: "",
  iconUrl: "",
  tagIds: [],
};

const defaultTagForm: TagFormState = {
  name: "",
  isHidden: false,
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? "请求失败");
  }

  return data as T;
}

export function SakuraNavApp({
  initialTags,
  initialAppearances,
  initialSession,
}: Props) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const rootTheme = document.documentElement.dataset.theme;
    if (rootTheme === "light" || rootTheme === "dark") {
      return rootTheme;
    }

    const storedTheme = window.localStorage.getItem("sakura-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(initialSession?.isAuthenticated),
  );
  const [tags, setTags] = useState(initialTags);
  const [appearances, setAppearances] = useState(initialAppearances);
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceDraft>({
    light: {
      wallpaperAssetId: initialAppearances.light.wallpaperAssetId,
      wallpaperUrl: initialAppearances.light.wallpaperUrl,
      fontPreset: initialAppearances.light.fontPreset,
      overlayOpacity: initialAppearances.light.overlayOpacity,
      textColor: initialAppearances.light.textColor,
    },
    dark: {
      wallpaperAssetId: initialAppearances.dark.wallpaperAssetId,
      wallpaperUrl: initialAppearances.dark.wallpaperUrl,
      fontPreset: initialAppearances.dark.fontPreset,
      overlayOpacity: initialAppearances.dark.overlayOpacity,
      textColor: initialAppearances.dark.textColor,
    },
  });
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [searchEngine, setSearchEngine] = useState<SearchEngine>(
    siteConfig.defaultSearchEngine,
  );
  const [query, setQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<"sites" | "tags" | "appearance">(
    "sites",
  );
  const [adminData, setAdminData] = useState<AdminBootstrap | null>(null);
  const [siteForm, setSiteForm] = useState<SiteFormState>(defaultSiteForm);
  const [tagForm, setTagForm] = useState<TagFormState>(defaultTagForm);
  const [siteList, setSiteList] = useState<PaginatedSites>({
    items: [],
    nextCursor: null,
    total: 0,
  });
  const [listState, setListState] = useState<
    "loading" | "refreshing" | "ready" | "loading-more" | "error"
  >("loading");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [, startTransition] = useTransition();
  const [uploadingTheme, setUploadingTheme] = useState<ThemeMode | null>(null);
  const [viewEpoch, setViewEpoch] = useState(0);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim());
  const effectiveQuery = searchEngine === "local" ? deferredQuery : "";
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const nextCursorRef = useRef<string | null>(null);
  const loadedCountRef = useRef(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const activeAppearance = appearances[themeMode];
  const activeFont = fontPresets[activeAppearance.fontPreset];
  const currentTitle = activeTagId
    ? tags.find((tag) => tag.id === activeTagId)?.name ?? "全部网站"
    : "全部网站";

  useEffect(() => {
    window.localStorage.setItem("sakura-theme", themeMode);
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    if (activeTagId && !tags.some((tag) => tag.id === activeTagId)) {
      setActiveTagId(null);
    }
  }, [activeTagId, tags]);

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

  function applyAdminBootstrap(data: AdminBootstrap) {
    setAdminData(data);
    setAppearanceDraft({
      light: {
        wallpaperAssetId: data.appearances.light.wallpaperAssetId,
        wallpaperUrl: data.appearances.light.wallpaperUrl,
        fontPreset: data.appearances.light.fontPreset,
        overlayOpacity: data.appearances.light.overlayOpacity,
        textColor: data.appearances.light.textColor,
      },
      dark: {
        wallpaperAssetId: data.appearances.dark.wallpaperAssetId,
        wallpaperUrl: data.appearances.dark.wallpaperUrl,
        fontPreset: data.appearances.dark.fontPreset,
        overlayOpacity: data.appearances.dark.overlayOpacity,
        textColor: data.appearances.dark.textColor,
      },
    });
  }

  useEffect(() => {
    if (!isAuthenticated) return;

    void (async () => {
      const data = await requestJson<AdminBootstrap>("/api/admin/bootstrap");
      applyAdminBootstrap(data);
    })();
  }, [isAuthenticated]);

  async function syncNavigationData() {
    const tagsResponse = await requestJson<{ items: Tag[] }>("/api/navigation/tags");
    setTags(tagsResponse.items);
    setRefreshNonce((value) => value + 1);
  }

  async function syncAdminBootstrap() {
    if (!isAuthenticated) {
      setAdminData(null);
      return;
    }

    const data = await requestJson<AdminBootstrap>("/api/admin/bootstrap");
    applyAdminBootstrap(data);
  }

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
        });
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setErrorMessage(error instanceof Error ? error.message : "加载失败");
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
      setErrorMessage(error instanceof Error ? error.message : "加载更多失败");
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
      { rootMargin: "220px 0px" },
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [siteList.nextCursor]);

  async function handleLogout() {
    await requestJson("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setDrawerOpen(false);
    setAdminData(null);
    setMessage("已退出登录，编辑权限已关闭。");
    await syncNavigationData();
  }

  function cycleSearchEngine() {
    setSearchMenuOpen((current) => !current);
  }

  function submitSearch() {
    setSearchMenuOpen(false);

    if (searchEngine === "local") {
      setRefreshNonce((value) => value + 1);
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) return;

    const searchUrl = siteConfig.searchEngines[searchEngine].searchUrl;
    window.open(`${searchUrl}${encodeURIComponent(trimmed)}`, "_blank", "noopener,noreferrer");
  }

  async function submitSiteForm() {
    setErrorMessage("");
    setMessage("");

    const payload = {
      ...siteForm,
      iconUrl: siteForm.iconUrl.trim() || null,
    };

    try {
      if (siteForm.id) {
        await requestJson("/api/sites", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson("/api/sites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setSiteForm(defaultSiteForm);
      setMessage("网站配置已保存。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存网站失败");
    }
  }

  async function submitTagForm() {
    setErrorMessage("");
    setMessage("");

    try {
      if (tagForm.id) {
        await requestJson("/api/tags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tagForm),
        });
      } else {
        await requestJson("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tagForm),
        });
      }

      setTagForm(defaultTagForm);
      setMessage("标签配置已保存。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存标签失败");
    }
  }

  async function saveAppearances() {
    setErrorMessage("");
    setMessage("");

    try {
      const saved = await requestJson<Record<ThemeMode, ThemeAppearance>>("/api/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          light: {
            wallpaperAssetId: appearanceDraft.light.wallpaperAssetId,
            fontPreset: appearanceDraft.light.fontPreset,
            overlayOpacity: appearanceDraft.light.overlayOpacity,
            textColor: appearanceDraft.light.textColor,
          },
          dark: {
            wallpaperAssetId: appearanceDraft.dark.wallpaperAssetId,
            fontPreset: appearanceDraft.dark.fontPreset,
            overlayOpacity: appearanceDraft.dark.overlayOpacity,
            textColor: appearanceDraft.dark.textColor,
          },
        }),
      });

      setAppearances(saved);
      setMessage("主题外观已更新。");
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存外观失败");
    }
  }

  async function uploadWallpaper(theme: ThemeMode, file: File) {
    setUploadingTheme(theme);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        body: formData,
      });

      setAppearanceDraft((current) => ({
        ...current,
        [theme]: {
          ...current[theme],
          wallpaperAssetId: asset.id,
          wallpaperUrl: asset.url,
        },
      }));
      setMessage(`${theme === "light" ? "明亮" : "暗黑"}主题壁纸已上传。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "壁纸上传失败");
    } finally {
      setUploadingTheme(null);
    }
  }

  async function deleteCurrentSite(siteId: string) {
    setErrorMessage("");
    setMessage("");

    try {
      await requestJson(`/api/sites?id=${encodeURIComponent(siteId)}`, {
        method: "DELETE",
      });
      if (siteForm.id === siteId) {
        setSiteForm(defaultSiteForm);
      }
      setMessage("网站已删除。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除网站失败");
    }
  }

  async function deleteCurrentTag(tagId: string) {
    setErrorMessage("");
    setMessage("");

    try {
      await requestJson(`/api/tags?id=${encodeURIComponent(tagId)}`, {
        method: "DELETE",
      });
      if (tagForm.id === tagId) {
        setTagForm(defaultTagForm);
      }
      setMessage("标签已删除。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除标签失败");
    }
  }

  async function handleTagSort(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id || !isAuthenticated) return;
    const oldIndex = tags.findIndex((tag) => tag.id === event.active.id);
    const newIndex = tags.findIndex((tag) => tag.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextTags = arrayMove(tags, oldIndex, newIndex).map((tag, index) => ({
      ...tag,
      sortOrder: index,
    }));
    setTags(nextTags);

    try {
      await requestJson("/api/tags/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: nextTags.map((tag) => tag.id) }),
      });
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "标签排序保存失败");
      await syncNavigationData();
    }
  }

  async function handleSiteSort(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id || !isAuthenticated || !adminData) return;
    if (effectiveQuery) return;

    const fullOrderedIds = activeTagId
      ? adminData.sites
          .filter((site) => site.tags.some((tag) => tag.id === activeTagId))
          .sort((left, right) => {
            const leftOrder = left.tags.find((tag) => tag.id === activeTagId)?.sortOrder ?? 0;
            const rightOrder = right.tags.find((tag) => tag.id === activeTagId)?.sortOrder ?? 0;
            return leftOrder - rightOrder;
          })
          .map((site) => site.id)
      : [...adminData.sites]
          .sort((left, right) => left.globalSortOrder - right.globalSortOrder)
          .map((site) => site.id);

    const oldIndex = fullOrderedIds.indexOf(String(event.active.id));
    const newIndex = fullOrderedIds.indexOf(String(event.over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedIds = arrayMove(fullOrderedIds, oldIndex, newIndex);
    const currentSiteMap = new Map(siteList.items.map((site) => [site.id, site]));
    const reorderedVisibleItems = reorderedIds
      .filter((siteId) => currentSiteMap.has(siteId))
      .map((siteId) => currentSiteMap.get(siteId) as Site);

    setSiteList((current) => ({
      ...current,
      items: reorderedVisibleItems,
    }));

    try {
      if (activeTagId) {
        await requestJson(`/api/tags/${activeTagId}/sites/reorder`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: reorderedIds }),
        });
      } else {
        await requestJson("/api/sites/reorder-global", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: reorderedIds }),
        });
      }

      setMessage(activeTagId ? "标签内顺序已更新。" : "全部网站顺序已更新。");
      await syncAdminBootstrap();
      await syncNavigationData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "网站排序保存失败");
      setRefreshNonce((value) => value + 1);
    }
  }

  const engineMeta = siteConfig.searchEngines[searchEngine];
  const emptyState =
    listState === "ready" && siteList.items.length === 0
      ? effectiveQuery
        ? "当前搜索没有匹配网站，试试换个关键词。"
        : activeTagId
          ? "这个标签下还没有网站。"
          : "这里还没有网站，登录后可以开始创建。"
      : "";

  const pageStyle = {
    fontFamily: activeFont.cssVariable,
    color: activeAppearance.textColor,
    backgroundImage: activeAppearance.wallpaperUrl
      ? `linear-gradient(180deg, rgba(8,15,29,${clamp(activeAppearance.overlayOpacity, 0, 1)}) 0%, rgba(8,15,29,${clamp(activeAppearance.overlayOpacity * 0.82, 0, 1)}) 100%), url(${activeAppearance.wallpaperUrl})`
      : themeMode === "light"
        ? "radial-gradient(circle at top left, rgba(255,207,150,0.8), transparent 28%), radial-gradient(circle at 80% 10%, rgba(95,134,255,0.4), transparent 32%), linear-gradient(135deg, #f4ede4 0%, #efe5d7 44%, #e2e5ef 100%)"
        : "radial-gradient(circle at top left, rgba(87,65,198,0.34), transparent 28%), radial-gradient(circle at 80% 10%, rgba(0,204,255,0.22), transparent 32%), linear-gradient(145deg, #08101e 0%, #11192a 42%, #101726 100%)",
    backgroundSize: activeAppearance.wallpaperUrl ? "cover" : "auto",
    backgroundPosition: "center",
  } as const;

  return (
    <main
      className={cn(
        "relative min-h-screen overflow-hidden transition-colors duration-500",
        themeMode === "dark" ? "text-slate-100" : "text-slate-900",
      )}
      data-theme={themeMode}
      style={pageStyle}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 mix-blend-soft-light" />
      <div className="relative flex min-h-screen w-full flex-col">
        <header className="sticky top-0 z-20 flex w-full items-center justify-between border-b border-white/18 bg-white/14 px-4 py-4 shadow-[0_16px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => {
              setActiveTagId(null);
              setQuery("");
              setSearchMenuOpen(false);
            }}
            className="flex items-center gap-3"
          >
            <img
              src={siteConfig.logoSrc}
              alt={`${siteConfig.appName} logo`}
              className="h-11 w-11 rounded-2xl border border-white/25 bg-white/35 p-2 shadow-lg"
            />
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.28em] opacity-70">
                Curated Startpage
              </p>
              <h1 className="text-lg font-semibold tracking-tight">{siteConfig.appName}</h1>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/14 px-4 py-2 text-sm font-medium transition hover:bg-white/22"
              >
                <PencilLine className="h-4 w-4" />
                编辑
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setThemeMode((current) => (current === "light" ? "dark" : "light"))}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/14 px-4 py-2 text-sm font-medium transition hover:bg-white/22"
            >
              {themeMode === "light" ? (
                <>
                  <MoonStar className="h-4 w-4" />
                  暗黑
                </>
              ) : (
                <>
                  <SunMedium className="h-4 w-4" />
                  明亮
                </>
              )}
            </button>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/14 px-4 py-2 text-sm font-medium transition hover:bg-white/22"
              >
                <LogOut className="h-4 w-4" />
                退出
              </button>
            ) : null}
          </div>
        </header>

        <section className="flex flex-1 max-lg:flex-col">
          <aside
            className={cn(
              "relative shrink-0 border-r border-white/18 bg-white/10 p-4 backdrop-blur-2xl transition-all duration-300",
              sidebarCollapsed ? "w-full lg:w-[92px]" : "w-full lg:w-[300px]",
            )}
          >
            <div className="mb-5 flex items-center justify-between">
              {!sidebarCollapsed ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] opacity-60">Labels</p>
                  <h2 className="mt-1 text-xl font-semibold">分类标签</h2>
                </div>
              ) : (
                <span className="text-xs uppercase tracking-[0.26em] opacity-60">Tag</span>
              )}
              <button
                type="button"
                onClick={() => setSidebarCollapsed((value) => !value)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/18 bg-white/18 transition hover:bg-white/28"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void handleTagSort(event)}
            >
              <SortableContext
                items={tags.map((tag) => tag.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <SortableTagRow
                      key={tag.id}
                      tag={tag}
                      active={tag.id === activeTagId}
                      collapsed={sidebarCollapsed}
                      draggable={isAuthenticated}
                      onSelect={() => {
                        setActiveTagId(tag.id);
                        setSearchMenuOpen(false);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-5 text-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="rounded-full border border-white/20 bg-white/16 px-3 py-1 text-xs uppercase tracking-[0.26em] opacity-70">
                    {activeTagId ? "标签视图" : "默认视图"}
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {currentTitle}
                  </h2>
                  <p className="text-sm opacity-72">
                    已展示 {siteList.items.length} / {siteList.total} 个网站
                  </p>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitSearch();
                  }}
                  className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 rounded-[30px] border border-white/20 bg-white/12 p-3 sm:flex-row sm:items-center"
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={cycleSearchEngine}
                      className="inline-flex min-w-[156px] items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
                      style={{ backgroundColor: engineMeta.accent }}
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/18 text-sm">
                        {engineMeta.label.charAt(0)}
                      </span>
                      {engineMeta.label}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          searchMenuOpen ? "rotate-180" : "",
                        )}
                      />
                    </button>
                    {searchMenuOpen ? (
                      <div className="absolute left-0 top-[calc(100%+10px)] z-20 w-56 overflow-hidden rounded-3xl border border-white/16 bg-[#0f172ae8] p-2 text-left text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                        {siteConfig.supportedSearchEngines.map((engine) => (
                          <button
                            key={engine}
                            type="button"
                            onClick={() => {
                              setSearchEngine(engine);
                              setSearchMenuOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm transition",
                              searchEngine === engine
                                ? "bg-white/16 text-white"
                                : "text-white/78 hover:bg-white/10",
                            )}
                          >
                            <span className="flex items-center gap-3">
                              <span
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                                style={{
                                  backgroundColor:
                                    siteConfig.searchEngines[engine].accent,
                                }}
                              >
                                {siteConfig.searchEngines[engine].label.charAt(0)}
                              </span>
                              {siteConfig.searchEngines[engine].label}
                            </span>
                            {searchEngine === engine ? <span>当前</span> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/18 bg-white/18 px-4 py-3">
                    <Search className="h-4 w-4 opacity-70" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={
                        searchEngine === "local"
                          ? "搜索站点名、描述或标签"
                          : "输入搜索内容"
                      }
                      className="w-full bg-transparent text-sm outline-none placeholder:opacity-60"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/18 transition hover:bg-white/26"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </form>

                {message ? (
                  <div className="rounded-2xl border border-emerald-200/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50 shadow-sm backdrop-blur">
                    {message}
                  </div>
                ) : null}
                {errorMessage ? (
                  <div className="rounded-2xl border border-rose-200/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-50 shadow-sm backdrop-blur">
                    {errorMessage}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-8 flex-1">
              {listState === "refreshing" ? (
                <div className="mx-auto mb-4 w-full max-w-[1440px]">
                  <div className="relative h-1 overflow-hidden rounded-full bg-white/12 animate-progress-sweep" />
                </div>
              ) : null}

              {listState === "loading" ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-52 animate-pulse rounded-[28px] border border-white/18 bg-white/12"
                    />
                  ))}
                </div>
              ) : emptyState ? (
                <div className="mx-auto flex h-full min-h-[340px] w-full max-w-[1440px] items-center justify-center rounded-[32px] border border-dashed border-white/20 bg-white/10 text-center">
                  <div className="max-w-md space-y-3 px-6">
                    <h3 className="text-xl font-semibold">还没有内容</h3>
                    <p className="text-sm leading-7 opacity-75">{emptyState}</p>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => void handleSiteSort(event)}
                >
                  <SortableContext items={siteList.items.map((site) => site.id)}>
                    <div
                      className={cn(
                        "mx-auto grid w-full max-w-[1440px] grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 transition duration-200",
                        listState === "refreshing" ? "opacity-72 saturate-75" : "",
                      )}
                    >
                      {siteList.items.map((site, index) => (
                        <SortableSiteCard
                          key={site.id}
                          site={site}
                          index={index}
                          viewEpoch={viewEpoch}
                          draggable={isAuthenticated && !effectiveQuery}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              <div ref={sentinelRef} className="mx-auto h-6 w-full max-w-[1440px]" />

              {listState === "loading-more" ? (
                <div className="mt-5 flex items-center justify-center gap-2 text-sm opacity-75">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  正在加载更多网站
                </div>
              ) : null}
            </div>
          </section>
        </section>
      </div>

      {drawerOpen && isAuthenticated ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/42 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-[640px] flex-col border-l border-white/12 bg-[#0f172af0] text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">Admin Drawer</p>
                <h2 className="mt-1 text-2xl font-semibold">管理导航页</h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 hover:bg-white/12"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-white/10 px-6 py-4">
              {[
                { key: "sites", label: "网站", icon: PencilLine },
                { key: "tags", label: "标签", icon: GripVertical },
                { key: "appearance", label: "外观", icon: PaintBucket },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAdminSection(tab.key as typeof adminSection)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition",
                    adminSection === tab.key
                      ? "bg-white text-slate-950"
                      : "border border-white/12 bg-white/6 text-white/80 hover:bg-white/12",
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {adminSection === "sites" ? (
                <SitesAdminPanel
                  adminData={adminData}
                  tags={tags}
                  siteForm={siteForm}
                  setSiteForm={setSiteForm}
                  onSubmit={() => void submitSiteForm()}
                  onDelete={(siteId) => void deleteCurrentSite(siteId)}
                />
              ) : null}
              {adminSection === "tags" ? (
                <TagsAdminPanel
                  adminData={adminData}
                  tags={tags}
                  tagForm={tagForm}
                  setTagForm={setTagForm}
                  onSubmit={() => void submitTagForm()}
                  onDelete={(tagId) => void deleteCurrentTag(tagId)}
                />
              ) : null}
              {adminSection === "appearance" ? (
                <AppearanceAdminPanel
                  appearanceDraft={appearanceDraft}
                  setAppearanceDraft={setAppearanceDraft}
                  uploadingTheme={uploadingTheme}
                  onUpload={(theme, file) => void uploadWallpaper(theme, file)}
                  onSubmit={() => void saveAppearances()}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SortableTagRow({
  tag,
  active,
  collapsed,
  draggable,
  onSelect,
}: {
  tag: Tag;
  active: boolean;
  collapsed: boolean;
  draggable: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: tag.id,
    disabled: !draggable,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-[24px] border px-3 py-3 text-left transition duration-200 active:scale-[0.985]",
        active
          ? "border-white/24 bg-white/24 shadow-lg"
          : "border-white/10 bg-white/8 hover:bg-white/16",
        collapsed ? "justify-center" : "justify-between",
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <span className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/14 text-sm font-semibold">
          {tag.name.charAt(0)}
        </span>
        {!collapsed ? (
          <span>
            <span className="block text-sm font-medium">{tag.name}</span>
            <span className="block text-xs opacity-65">{tag.siteCount} 个站点</span>
          </span>
        ) : null}
      </span>
      {!collapsed && draggable ? (
        <span
          className="rounded-2xl border border-white/12 bg-white/10 p-2"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 opacity-70" />
        </span>
      ) : null}
    </button>
  );
}

function SortableSiteCard({
  site,
  index,
  viewEpoch,
  draggable,
}: {
  site: Site;
  index: number;
  viewEpoch: number;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: site.id,
    disabled: !draggable,
  });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        animationDelay: `${Math.min(index * 45, 220)}ms`,
      }}
      data-view-epoch={viewEpoch}
      className="animate-card-enter group relative isolate overflow-hidden rounded-[30px] border border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] p-5 shadow-[0_18px_70px_rgba(15,23,42,0.14)] transition duration-200 will-change-transform hover:-translate-y-1 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.1))] active:scale-[0.985]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.12),transparent_34%,transparent_68%,rgba(255,255,255,0.06))] opacity-55" />
      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-start gap-4"
          >
            {site.iconUrl ? (
              <img
                src={site.iconUrl}
                alt={`${site.name} icon`}
                className="h-14 w-14 rounded-[20px] border border-white/18 bg-white/18 object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/18 bg-white/18 text-lg font-semibold">
                {site.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-xl font-semibold tracking-tight">{site.name}</h3>
              <p className="mt-2 text-sm leading-7 opacity-75">{site.description}</p>
            </div>
          </a>
          {draggable ? (
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/10 hover:bg-white/18"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 opacity-70" />
            </button>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          {site.tags.map((tag) => (
            <span
              key={tag.id}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                tag.isHidden
                  ? "border-amber-200/28 bg-amber-300/16 text-amber-50"
                  : "border-white/12 bg-white/10",
              )}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function SitesAdminPanel({
  adminData,
  tags,
  siteForm,
  setSiteForm,
  onSubmit,
  onDelete,
}: {
  adminData: AdminBootstrap | null;
  tags: Tag[];
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  onSubmit: () => void;
  onDelete: (siteId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{siteForm.id ? "编辑网站" : "新增网站"}</h3>
          {siteForm.id ? (
            <button
              type="button"
              className="text-sm text-white/70 hover:text-white"
              onClick={() => setSiteForm(defaultSiteForm)}
            >
              取消编辑
            </button>
          ) : null}
        </div>
        <div className="grid gap-3">
          <input
            value={siteForm.name}
            onChange={(event) =>
              setSiteForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="网站名称"
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
          />
          <input
            value={siteForm.url}
            onChange={(event) =>
              setSiteForm((current) => ({ ...current, url: event.target.value }))
            }
            placeholder="https://example.com"
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
          />
          <input
            value={siteForm.iconUrl}
            onChange={(event) =>
              setSiteForm((current) => ({ ...current, iconUrl: event.target.value }))
            }
            placeholder="图标 URL（可空）"
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
          />
          <textarea
            value={siteForm.description}
            onChange={(event) =>
              setSiteForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="网站描述"
            rows={3}
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
          />
          <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
            <p className="mb-3 text-sm font-medium">关联标签</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(adminData?.tags ?? tags).map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={siteForm.tagIds.includes(tag.id)}
                    onChange={(event) =>
                      setSiteForm((current) => ({
                        ...current,
                        tagIds: event.target.checked
                          ? [...current.tagIds, tag.id]
                          : current.tagIds.filter((id) => id !== tag.id),
                      }))
                    }
                  />
                  <span>{tag.name}</span>
                  {tag.isHidden ? (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                      隐藏
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            {siteForm.id ? "保存修改" : "创建网站"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {(adminData?.sites ?? []).map((site) => (
          <div
            key={site.id}
            className="rounded-[26px] border border-white/10 bg-white/6 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-lg font-semibold">{site.name}</h4>
                <p className="text-sm text-white/70">{site.description}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {site.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 hover:bg-white/14"
                  onClick={() =>
                    setSiteForm({
                      id: site.id,
                      name: site.name,
                      url: site.url,
                      description: site.description,
                      iconUrl: site.iconUrl ?? "",
                      tagIds: site.tags.map((tag) => tag.id),
                    })
                  }
                >
                  <PencilLine className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-rose-200 hover:bg-rose-500/18"
                  onClick={() => onDelete(site.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function TagsAdminPanel({
  adminData,
  tags,
  tagForm,
  setTagForm,
  onSubmit,
  onDelete,
}: {
  adminData: AdminBootstrap | null;
  tags: Tag[];
  tagForm: TagFormState;
  setTagForm: Dispatch<SetStateAction<TagFormState>>;
  onSubmit: () => void;
  onDelete: (tagId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{tagForm.id ? "编辑标签" : "新增标签"}</h3>
          {tagForm.id ? (
            <button
              type="button"
              className="text-sm text-white/70 hover:text-white"
              onClick={() => setTagForm(defaultTagForm)}
            >
              取消编辑
            </button>
          ) : null}
        </div>
        <div className="grid gap-3">
          <input
            value={tagForm.name}
            onChange={(event) =>
              setTagForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="标签名"
            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
          />
          <label className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={tagForm.isHidden}
              onChange={(event) =>
                setTagForm((current) => ({
                  ...current,
                  isHidden: event.target.checked,
                }))
              }
            />
            设为隐藏标签（仅登录后可见）
          </label>
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            {tagForm.id ? "保存标签" : "创建标签"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {(adminData?.tags ?? tags).map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/6 px-4 py-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{tag.name}</h4>
                {tag.isHidden ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/65">
                    隐藏
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-white/68">当前可见站点 {tag.siteCount} 个</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 hover:bg-white/14"
                onClick={() =>
                  setTagForm({
                    id: tag.id,
                    name: tag.name,
                    isHidden: tag.isHidden,
                  })
                }
              >
                <PencilLine className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-rose-200 hover:bg-rose-500/18"
                onClick={() => onDelete(tag.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function AppearanceAdminPanel({
  appearanceDraft,
  setAppearanceDraft,
  uploadingTheme,
  onUpload,
  onSubmit,
}: {
  appearanceDraft: AppearanceDraft;
  setAppearanceDraft: Dispatch<SetStateAction<AppearanceDraft>>;
  uploadingTheme: ThemeMode | null;
  onUpload: (theme: ThemeMode, file: File) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-6">
      {(["light", "dark"] as const).map((theme) => (
        <section
          key={theme}
          className="rounded-[30px] border border-white/10 bg-white/6 p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {theme === "light" ? "明亮主题" : "暗黑主题"}
              </h3>
              <p className="mt-1 text-sm text-white/65">
                单独设置壁纸、字体、蒙层透明度与文字颜色。
              </p>
            </div>
            {appearanceDraft[theme].wallpaperUrl ? (
              <img
                src={appearanceDraft[theme].wallpaperUrl ?? ""}
                alt={`${theme} wallpaper`}
                className="h-20 w-28 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-28 items-center justify-center rounded-2xl border border-dashed border-white/12 text-xs text-white/45">
                无壁纸
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="text-white/75">字体预设</span>
              <select
                value={appearanceDraft[theme].fontPreset}
                onChange={(event) =>
                  setAppearanceDraft((current) => ({
                    ...current,
                    [theme]: {
                      ...current[theme],
                      fontPreset: event.target.value as FontPresetKey,
                    },
                  }))
                }
                className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 outline-none"
              >
                {Object.entries(fontPresets).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-white/75">
                蒙层透明度 {Math.round(appearanceDraft[theme].overlayOpacity * 100)}%
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(appearanceDraft[theme].overlayOpacity * 100)}
                onChange={(event) =>
                  setAppearanceDraft((current) => ({
                    ...current,
                    [theme]: {
                      ...current[theme],
                      overlayOpacity: Number(event.target.value) / 100,
                    },
                  }))
                }
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-white/75">文字颜色</span>
              <input
                type="color"
                value={appearanceDraft[theme].textColor}
                onChange={(event) =>
                  setAppearanceDraft((current) => ({
                    ...current,
                    [theme]: {
                      ...current[theme],
                      textColor: event.target.value,
                    },
                  }))
                }
                className="h-12 rounded-2xl border border-white/12 bg-white/8 px-3"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-white/75">上传壁纸</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUpload(theme, file);
                  }
                }}
                className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-slate-900"
              />
              {uploadingTheme === theme ? (
                <span className="text-xs text-white/55">上传中...</span>
              ) : null}
            </label>
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={onSubmit}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
      >
        <PaintBucket className="h-4 w-4" />
        保存主题外观
      </button>
    </div>
  );
}
