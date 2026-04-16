/**
 * SakuraNav 主应用组件
 * @description 导航站的核心组件，包含网站卡片展示、标签筛选、拖拽排序、搜索等主要功能
 */

/**
 * 主应用组件
 * @description SakuraNav 的核心组件，整合导航展示、编辑模式、管理面板、搜索等全部功能
 */

"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  Modifier,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowUp,
  ChevronDown,
  Eye,
  GripVertical,
  LoaderCircle,
  LogOut,
  MoonStar,
  PaintBucket,
  PanelLeftOpen,
  PencilLine,
  Plus,
  Search,
  Settings2,
  Star,
  SunMedium,
  X,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { fontPresets, siteConfig } from "@/lib/config";
import { themeAppearanceDefaults } from "@/lib/config";
import {
  AppSettings,
  AdminBootstrap,
  PaginatedSites,
  SearchEngine,
  SessionUser,
  Site,
  Tag,
  ThemeAppearance,
  ThemeMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { getThemeLabel, getThemeDeviceLabel, getThemeAssetLabel } from "@/lib/theme-styles";
// UI Components
import { SortableTagRow, SortableSiteCard, TagRowContent, TagRowCard, SiteCardShell, SiteCardContent } from "@/components/ui";
// Dialog Components
import { FloatingSearchDialog, NotificationToast, ConfigConfirmDialog, WallpaperUrlDialog, AssetUrlDialog, configActionLabels } from "@/components/dialogs";
import type { ToastState } from "@/components/dialogs/notification-toast";
import type { ConfigConfirmAction } from "@/components/dialogs/config-confirm-dialog";
import type { WallpaperTarget, WallpaperDevice } from "@/components/dialogs/wallpaper-url-dialog";
import type { AssetTarget, AssetKind } from "@/components/dialogs/asset-url-dialog";
// Admin Components
import { SitesAdminPanel, TagsAdminPanel, SiteEditorForm, TagEditorForm, AppearanceAdminPanel, ConfigAdminPanel } from "@/components/admin";
import { defaultSiteForm, defaultTagForm } from "@/components/admin";
import type { SiteFormState, TagFormState, AppearanceDraft, AdminSection, AdminGroup } from "@/components/admin";

type Props = {
  initialTags: Tag[];
  initialAppearances: Record<ThemeMode, ThemeAppearance>;
  initialSettings: AppSettings;
  initialSession: SessionUser | null;
  defaultTheme: ThemeMode;
};

type AppearanceThemeTab = ThemeMode;
type DragKind = "tag" | "site";
type AppearanceNotice = {
  key: string;
  message: string;
};
type SearchSuggestion = {
  value: string;
  kind: "query" | "site" | "tag";
};
type SuggestionInteractionMode = "keyboard" | "pointer";

const dragTransition = {
  duration: 240,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

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

export function SakuraNavApp({
  initialTags,
  initialAppearances,
  initialSettings,
  initialSession,
  defaultTheme,
}: Props) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return defaultTheme;
    }

    // 用户手动设置的主题优先
    const storedTheme = window.localStorage.getItem("sakura-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }

    // 使用服务端传递的默认主题
    return defaultTheme;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(initialSession?.isAuthenticated),
  );
  const [tags, setTags] = useState(initialTags);
  const [appearances, setAppearances] = useState(initialAppearances);
  const [settings, setSettings] = useState(initialSettings);
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceDraft>({
    light: {
      desktopWallpaperAssetId: initialAppearances.light.desktopWallpaperAssetId,
      desktopWallpaperUrl: initialAppearances.light.desktopWallpaperUrl,
      mobileWallpaperAssetId: initialAppearances.light.mobileWallpaperAssetId,
      mobileWallpaperUrl: initialAppearances.light.mobileWallpaperUrl,
      fontPreset: initialAppearances.light.fontPreset,
      fontSize: initialAppearances.light.fontSize,
      overlayOpacity: initialAppearances.light.overlayOpacity,
      textColor: initialAppearances.light.textColor,
      logoAssetId: initialAppearances.light.logoAssetId ?? null,
      logoUrl: initialAppearances.light.logoUrl ?? null,
      faviconAssetId: initialAppearances.light.faviconAssetId ?? null,
      faviconUrl: initialAppearances.light.faviconUrl ?? null,
      desktopCardFrosted: initialAppearances.light.desktopCardFrosted ?? false,
      mobileCardFrosted: initialAppearances.light.mobileCardFrosted ?? false,
      isDefault: initialAppearances.light.isDefault ?? false,
    },
    dark: {
      desktopWallpaperAssetId: initialAppearances.dark.desktopWallpaperAssetId,
      desktopWallpaperUrl: initialAppearances.dark.desktopWallpaperUrl,
      mobileWallpaperAssetId: initialAppearances.dark.mobileWallpaperAssetId,
      mobileWallpaperUrl: initialAppearances.dark.mobileWallpaperUrl,
      fontPreset: initialAppearances.dark.fontPreset,
      fontSize: initialAppearances.dark.fontSize,
      overlayOpacity: initialAppearances.dark.overlayOpacity,
      textColor: initialAppearances.dark.textColor,
      logoAssetId: initialAppearances.dark.logoAssetId ?? null,
      logoUrl: initialAppearances.dark.logoUrl ?? null,
      faviconAssetId: initialAppearances.dark.faviconAssetId ?? null,
      faviconUrl: initialAppearances.dark.faviconUrl ?? null,
      desktopCardFrosted: initialAppearances.dark.desktopCardFrosted ?? false,
      mobileCardFrosted: initialAppearances.dark.mobileCardFrosted ?? false,
      isDefault: initialAppearances.dark.isDefault ?? true,
    },
  });
  const [settingsDraft, setSettingsDraft] = useState(initialSettings);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [searchEngine, setSearchEngine] = useState<SearchEngine>(
    siteConfig.defaultSearchEngine,
  );
  const [query, setQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [searchSuggestionsBusy, setSearchSuggestionsBusy] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);
  const [suggestionInteractionMode, setSuggestionInteractionMode] =
    useState<SuggestionInteractionMode>("keyboard");
  const [mobileTagsOpen, setMobileTagsOpen] = useState(false);
  const [appearanceDrawerOpen, setAppearanceDrawerOpen] = useState(false);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [appearanceThemeTab, setAppearanceThemeTab] =
    useState<AppearanceThemeTab>("light");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>("sites");
  const [adminData, setAdminData] = useState<AdminBootstrap | null>(null);
  const [siteForm, setSiteForm] = useState<SiteFormState>(defaultSiteForm);
  const [tagForm, setTagForm] = useState<TagFormState>(defaultTagForm);
  const [editMode, setEditMode] = useState(false);
  const [editorPanel, setEditorPanel] = useState<"site" | "tag" | null>(null);
  const [siteAdminGroup, setSiteAdminGroup] = useState<AdminGroup>("create");
  const [tagAdminGroup, setTagAdminGroup] = useState<AdminGroup>("create");
  const [configImportFile, setConfigImportFile] = useState<File | null>(null);
  const [configConfirmAction, setConfigConfirmAction] = useState<ConfigConfirmAction | null>(null);
  const [configConfirmPassword, setConfigConfirmPassword] = useState("");
  const [configConfirmError, setConfigConfirmError] = useState("");
  const [configBusyAction, setConfigBusyAction] = useState<"import" | "export" | "reset" | null>(
    null,
  );
  const [siteNameDraft, setSiteNameDraft] = useState(settings.siteName ?? siteConfig.appName);
  const [siteNameBusy, setSiteNameBusy] = useState(false);
  const siteNameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [appearanceMenuTarget, setAppearanceMenuTarget] = useState<WallpaperTarget | null>(null);
  const [assetMenuTarget, setAssetMenuTarget] = useState<AssetTarget | null>(null);
  const [wallpaperUrlTarget, setWallpaperUrlTarget] = useState<WallpaperTarget | null>(null);
  const [assetUrlTarget, setAssetUrlTarget] = useState<AssetTarget | null>(null);
  const [wallpaperUrlValue, setWallpaperUrlValue] = useState("");
  const [assetUrlValue, setAssetUrlValue] = useState("");
  const [wallpaperUrlError, setWallpaperUrlError] = useState("");
  const [assetUrlError, setAssetUrlError] = useState("");
  const [wallpaperUrlBusy, setWallpaperUrlBusy] = useState(false);
  const [assetUrlBusy, setAssetUrlBusy] = useState(false);
  const [uploadingAssetTheme, setUploadingAssetTheme] = useState<ThemeMode | null>(null);
  const [pendingAppearanceNotice, setPendingAppearanceNotice] = useState<AppearanceNotice | null>(
    null,
  );
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
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [, startTransition] = useTransition();
  const [uploadingTheme, setUploadingTheme] = useState<ThemeMode | null>(null);
  const [viewEpoch, setViewEpoch] = useState(0);
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [floatingSearchOpen, setFloatingSearchOpen] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [activeDrag, setActiveDrag] = useState<{ id: string; kind: DragKind } | null>(null);
  const [activeDragSize, setActiveDragSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [activeDragOffset, setActiveDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // 自定义 modifier：让拖拽元素紧贴光标，而不是居中
  const snapToCursorModifier: Modifier = useCallback(
    ({ transform, activeNodeRect }) => {
      if (!activeDragOffset || !activeNodeRect) {
        return transform;
      }
      // 计算偏移：将元素从居中位置调整到鼠标点击位置
      const offsetX = activeDragOffset.x - activeNodeRect.width / 2;
      const offsetY = activeDragOffset.y - activeNodeRect.height / 2;
      return {
        ...transform,
        x: transform.x + offsetX,
        y: transform.y + offsetY,
      };
    },
    [activeDragOffset],
  );

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  const deferredQuery = useDeferredValue(query.trim());
  const effectiveQuery = searchEngine === "local" ? deferredQuery : "";
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const requestIdRef = useRef(0);
  const nextCursorRef = useRef<string | null>(null);
  const loadedCountRef = useRef(0);
  const toastIdRef = useRef(0);
  const suggestionRequestIdRef = useRef(0);
  const desktopWallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const mobileWallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 90, tolerance: 6 } }),
  );

  const activeAppearance = appearances[themeMode];
  const activeFont = fontPresets[activeAppearance.fontPreset];
  const hasActiveWallpaper = Boolean(
    activeAppearance.desktopWallpaperUrl || activeAppearance.mobileWallpaperUrl,
  );
  // 桌面端专用壁纸检查
  const hasActiveDesktopWallpaper = Boolean(activeAppearance.desktopWallpaperUrl);
  const hasActiveMobileWallpaper = Boolean(activeAppearance.mobileWallpaperUrl);
  const activeHeaderLogo = activeAppearance.logoUrl || siteConfig.logoSrc;
  const displayName = settings.siteName || siteConfig.appName;
  const highlightedSuggestionIndex =
    suggestionInteractionMode === "pointer" && hoveredSuggestionIndex >= 0
      ? hoveredSuggestionIndex
      : activeSuggestionIndex;
  const topActionButtonClass = cn(
    "inline-flex h-12 min-w-[104px] items-center justify-center gap-2.5 rounded-[18px] border px-4 text-sm font-medium whitespace-nowrap",
    hasActiveWallpaper
      ? themeMode === "light"
        ? "border-slate-900/8 bg-white/34 text-slate-800 shadow-[0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur-[22px] hover:bg-white/48"
        : "border-white/16 bg-white/10 text-white shadow-[0_12px_34px_rgba(2,6,23,0.22)] backdrop-blur-[22px] hover:bg-white/16"
      : themeMode === "light"
        ? "border-slate-800/10 bg-white/66 text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.16)] hover:bg-white/86"
        : "border-white/20 bg-white/14 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] hover:bg-white/22",
  );
  const topActionIconClass = cn(
    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
    hasActiveWallpaper
      ? themeMode === "light"
        ? "bg-slate-900/8 text-slate-700"
        : "bg-white/10 text-white/92"
      : themeMode === "light"
        ? "bg-slate-900/7 text-slate-700"
        : "bg-white/12 text-white/90",
  );
  // 移动端工具栏按钮样式（仅icon，更紧凑）
  const mobileToolbarButtonClass = cn(
    "inline-flex h-11 w-11 items-center justify-center rounded-[18px] border transition",
    hasActiveWallpaper
      ? themeMode === "light"
        ? "border-slate-900/8 bg-white/34 text-slate-800 shadow-[0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur-[22px] active:scale-95 active:bg-white/48"
        : "border-white/16 bg-white/10 text-white shadow-[0_12px_34px_rgba(2,6,23,0.22)] backdrop-blur-[22px] active:scale-95 active:bg-white/16"
      : themeMode === "light"
        ? "border-slate-800/10 bg-white/66 text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.16)] active:scale-95 active:bg-white/86"
        : "border-white/20 bg-white/14 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] active:scale-95 active:bg-white/22",
  );
  const themeToggleButtonClass = cn(
    topActionButtonClass,
    "min-w-[116px]",
    hasActiveWallpaper
      ? themeMode === "light"
        ? "bg-white/42 text-slate-800 hover:bg-white/56"
        : "bg-white/12 text-white hover:bg-white/18"
      : themeMode === "light"
        ? "border-slate-800/12 bg-white/84 text-slate-700 shadow-[0_12px_30px_rgba(148,163,184,0.12)] hover:bg-white"
        : "border-white/20 bg-white/14 text-white shadow-[0_14px_32px_rgba(15,23,42,0.2)] hover:bg-white/22",
  );
  const headerChromeClass =
    themeMode === "light"
      ? hasActiveWallpaper
        ? "border-b border-slate-950/8 bg-[linear-gradient(180deg,rgba(255,250,246,0.44),rgba(255,255,255,0.26))] shadow-[0_14px_44px_rgba(148,163,184,0.10)] backdrop-blur-[24px]"
        : "border-b border-slate-950/6 bg-[linear-gradient(90deg,rgba(255,252,247,0.88),rgba(237,244,255,0.82),rgba(223,239,250,0.8))] shadow-[0_16px_60px_rgba(148,163,184,0.16)] backdrop-blur-xl"
      : hasActiveWallpaper
        ? "border-b border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.56),rgba(15,23,42,0.38))] shadow-[0_18px_54px_rgba(2,6,23,0.28)] backdrop-blur-[24px]"
        : "border-b border-white/8 bg-[linear-gradient(90deg,rgba(44,53,84,0.82),rgba(55,71,102,0.72),rgba(57,89,109,0.74))] shadow-[0_16px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl";
  const sidebarChromeClass =
    themeMode === "light"
      ? hasActiveWallpaper
        ? "lg:border-r border-slate-950/8 bg-[linear-gradient(180deg,rgba(255,251,247,0.46),rgba(255,255,255,0.3))] shadow-[18px_0_48px_rgba(148,163,184,0.10)] backdrop-blur-[26px]"
        : "lg:border-r border-slate-950/6 bg-[linear-gradient(180deg,rgba(247,240,232,0.92),rgba(238,239,245,0.9),rgba(227,236,244,0.92))] shadow-[18px_0_48px_rgba(148,163,184,0.12)] backdrop-blur-xl"
      : hasActiveWallpaper
        ? "lg:border-r border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.64),rgba(15,23,42,0.46))] shadow-[18px_0_48px_rgba(2,6,23,0.26)] backdrop-blur-[26px]"
        : "lg:border-r border-white/8 bg-[linear-gradient(180deg,rgba(66,64,108,0.82),rgba(58,62,99,0.76),rgba(50,58,88,0.78))] shadow-[18px_0_48px_rgba(10,17,31,0.12)] backdrop-blur-xl";
  const currentTitle = activeTagId
    ? tags.find((tag) => tag.id === activeTagId)?.name ?? "全部网站"
    : "全部网站";
  const activeDraggedTag =
    activeDrag?.kind === "tag" ? tags.find((tag) => tag.id === activeDrag.id) ?? null : null;
  const activeDraggedSite =
    activeDrag?.kind === "site"
      ? siteList.items.find((site) => site.id === activeDrag.id) ??
        adminData?.sites.find((site) => site.id === activeDrag.id) ??
        null
      : null;

  useEffect(() => {
    window.localStorage.setItem("sakura-theme", themeMode);
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    document.title = displayName;
  }, [displayName]);

  useEffect(() => {
    const faviconUrl = activeAppearance.faviconUrl || siteConfig.logoSrc;
    const link: HTMLLinkElement = document.querySelector("link[rel='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.href = faviconUrl;
    if (!document.querySelector("link[rel='icon']")) {
      document.head.appendChild(link);
    }
  }, [activeAppearance.faviconUrl]);

  useEffect(() => {
    if (activeTagId && !tags.some((tag) => tag.id === activeTagId)) {
      setActiveTagId(null);
    }
  }, [activeTagId, tags]);

  useEffect(() => {
    function handleScroll() {
      setShowScrollTopButton(window.scrollY > 260);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
  }, [query, searchEngine]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!searchFormRef.current?.contains(event.target as Node)) {
        setSearchMenuOpen(false);
        setSearchSuggestionsOpen(false);
        setActiveSuggestionIndex(-1);
        setHoveredSuggestionIndex(-1);
        setSuggestionInteractionMode("keyboard");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const dismissToast = useCallback((toastId: number) => {
    setToasts((current) => current.filter((item) => item.id !== toastId));
  }, []);

  useEffect(() => {
    if (!message) return;

    setToasts((current) => {
      const signature = `success::操作成功::${message}`;
      const existing = current.find((toast) => toast.signature === signature);
      if (existing) {
        return [
          {
            ...existing,
            id: ++toastIdRef.current,
            durationMs: 4200,
            count: existing.count + 1,
          },
          ...current.filter((toast) => toast.signature !== signature),
        ];
      }

      return [
        {
          id: ++toastIdRef.current,
          title: "操作成功",
          description: message,
          tone: "success" as const,
          durationMs: 4200,
          count: 1,
          signature,
        },
        ...current,
      ].slice(0, 6);
    });
    setMessage("");
  }, [message]);

  useEffect(() => {
    if (!errorMessage) return;

    setToasts((current) => {
      const signature = `error::出现问题::${errorMessage}`;
      const existing = current.find((toast) => toast.signature === signature);
      if (existing) {
        return [
          {
            ...existing,
            id: ++toastIdRef.current,
            durationMs: 5200,
            count: existing.count + 1,
          },
          ...current.filter((toast) => toast.signature !== signature),
        ];
      }

      return [
        {
          id: ++toastIdRef.current,
          title: "出现问题",
          description: errorMessage,
          tone: "error" as const,
          durationMs: 5200,
          count: 1,
          signature,
        },
        ...current,
      ].slice(0, 6);
    });
    setErrorMessage("");
  }, [errorMessage]);

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
        desktopWallpaperAssetId: data.appearances.light.desktopWallpaperAssetId,
        desktopWallpaperUrl: data.appearances.light.desktopWallpaperUrl,
        mobileWallpaperAssetId: data.appearances.light.mobileWallpaperAssetId,
        mobileWallpaperUrl: data.appearances.light.mobileWallpaperUrl,
        fontPreset: data.appearances.light.fontPreset,
        fontSize: data.appearances.light.fontSize,
        overlayOpacity: data.appearances.light.overlayOpacity,
        textColor: data.appearances.light.textColor,
        logoAssetId: data.appearances.light.logoAssetId ?? null,
        logoUrl: data.appearances.light.logoUrl ?? null,
        faviconAssetId: data.appearances.light.faviconAssetId ?? null,
        faviconUrl: data.appearances.light.faviconUrl ?? null,
        desktopCardFrosted: data.appearances.light.desktopCardFrosted ?? false,
        mobileCardFrosted: data.appearances.light.mobileCardFrosted ?? false,
        isDefault: data.appearances.light.isDefault ?? false,
      },
      dark: {
        desktopWallpaperAssetId: data.appearances.dark.desktopWallpaperAssetId,
        desktopWallpaperUrl: data.appearances.dark.desktopWallpaperUrl,
        mobileWallpaperAssetId: data.appearances.dark.mobileWallpaperAssetId,
        mobileWallpaperUrl: data.appearances.dark.mobileWallpaperUrl,
        fontPreset: data.appearances.dark.fontPreset,
        fontSize: data.appearances.dark.fontSize,
        overlayOpacity: data.appearances.dark.overlayOpacity,
        textColor: data.appearances.dark.textColor,
        logoAssetId: data.appearances.dark.logoAssetId ?? null,
        logoUrl: data.appearances.dark.logoUrl ?? null,
        faviconAssetId: data.appearances.dark.faviconAssetId ?? null,
        faviconUrl: data.appearances.dark.faviconUrl ?? null,
        desktopCardFrosted: data.appearances.dark.desktopCardFrosted ?? false,
        mobileCardFrosted: data.appearances.dark.mobileCardFrosted ?? false,
        isDefault: data.appearances.dark.isDefault ?? true,
      },
    });
    setSettings(data.settings);
    setSettingsDraft(data.settings);
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

  const persistAppearanceDrafts = useEffectEvent(
    async (
      nextAppearanceDraft: AppearanceDraft,
      nextSettingsDraft: AppSettings,
      successMessage?: string,
    ) => {
      try {
        const [savedAppearances, savedSettings] = await Promise.all([
          requestJson<Record<ThemeMode, ThemeAppearance>>("/api/appearance", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              light: {
                desktopWallpaperAssetId: nextAppearanceDraft.light.desktopWallpaperAssetId,
                mobileWallpaperAssetId: nextAppearanceDraft.light.mobileWallpaperAssetId,
                fontPreset: nextAppearanceDraft.light.fontPreset,
                fontSize: nextAppearanceDraft.light.fontSize,
                overlayOpacity: nextAppearanceDraft.light.overlayOpacity,
                textColor: nextAppearanceDraft.light.textColor,
                logoAssetId: nextAppearanceDraft.light.logoAssetId,
                faviconAssetId: nextAppearanceDraft.light.faviconAssetId,
                desktopCardFrosted: nextAppearanceDraft.light.desktopCardFrosted,
                mobileCardFrosted: nextAppearanceDraft.light.mobileCardFrosted,
                isDefault: nextAppearanceDraft.light.isDefault,
              },
              dark: {
                desktopWallpaperAssetId: nextAppearanceDraft.dark.desktopWallpaperAssetId,
                mobileWallpaperAssetId: nextAppearanceDraft.dark.mobileWallpaperAssetId,
                fontPreset: nextAppearanceDraft.dark.fontPreset,
                fontSize: nextAppearanceDraft.dark.fontSize,
                overlayOpacity: nextAppearanceDraft.dark.overlayOpacity,
                textColor: nextAppearanceDraft.dark.textColor,
                logoAssetId: nextAppearanceDraft.dark.logoAssetId,
                faviconAssetId: nextAppearanceDraft.dark.faviconAssetId,
                desktopCardFrosted: nextAppearanceDraft.dark.desktopCardFrosted,
                mobileCardFrosted: nextAppearanceDraft.dark.mobileCardFrosted,
                isDefault: nextAppearanceDraft.dark.isDefault,
              },
            }),
          }),
          requestJson<AppSettings>("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lightLogoAssetId: nextSettingsDraft.lightLogoAssetId,
              darkLogoAssetId: nextSettingsDraft.darkLogoAssetId,
              siteName: settings.siteName,
            }),
          }),
        ]);

        setAppearances(savedAppearances);
        setSettings(savedSettings);
        setSettingsDraft(savedSettings);
        if (adminData) {
          setAdminData({
            ...adminData,
            appearances: savedAppearances,
            settings: savedSettings,
          });
        }
        if (successMessage) {
          setMessage(successMessage);
          setPendingAppearanceNotice(null);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "保存外观失败");
      }
    },
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    const draftMatchesPersisted =
      appearanceDraft.light.desktopWallpaperAssetId === appearances.light.desktopWallpaperAssetId &&
      appearanceDraft.light.mobileWallpaperAssetId === appearances.light.mobileWallpaperAssetId &&
      appearanceDraft.light.fontPreset === appearances.light.fontPreset &&
      appearanceDraft.light.fontSize === appearances.light.fontSize &&
      appearanceDraft.light.overlayOpacity === appearances.light.overlayOpacity &&
      appearanceDraft.light.textColor === appearances.light.textColor &&
      appearanceDraft.light.logoAssetId === appearances.light.logoAssetId &&
      appearanceDraft.light.faviconAssetId === appearances.light.faviconAssetId &&
      appearanceDraft.light.desktopCardFrosted === appearances.light.desktopCardFrosted &&
      appearanceDraft.light.mobileCardFrosted === appearances.light.mobileCardFrosted &&
      appearanceDraft.light.isDefault === appearances.light.isDefault &&
      appearanceDraft.dark.desktopWallpaperAssetId === appearances.dark.desktopWallpaperAssetId &&
      appearanceDraft.dark.mobileWallpaperAssetId === appearances.dark.mobileWallpaperAssetId &&
      appearanceDraft.dark.fontPreset === appearances.dark.fontPreset &&
      appearanceDraft.dark.fontSize === appearances.dark.fontSize &&
      appearanceDraft.dark.overlayOpacity === appearances.dark.overlayOpacity &&
      appearanceDraft.dark.textColor === appearances.dark.textColor &&
      appearanceDraft.dark.logoAssetId === appearances.dark.logoAssetId &&
      appearanceDraft.dark.faviconAssetId === appearances.dark.faviconAssetId &&
      appearanceDraft.dark.desktopCardFrosted === appearances.dark.desktopCardFrosted &&
      appearanceDraft.dark.mobileCardFrosted === appearances.dark.mobileCardFrosted &&
      appearanceDraft.dark.isDefault === appearances.dark.isDefault;
    const settingsMatchPersisted =
      settingsDraft.lightLogoAssetId === settings.lightLogoAssetId &&
      settingsDraft.darkLogoAssetId === settings.darkLogoAssetId;

    if (draftMatchesPersisted && settingsMatchPersisted) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistAppearanceDrafts(
        appearanceDraft,
        settingsDraft,
        pendingAppearanceNotice?.message,
      );
    }, 360);

    return () => window.clearTimeout(timeoutId);
  }, [appearanceDraft, appearances, isAuthenticated, pendingAppearanceNotice, settings, settingsDraft]);

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

  async function handleSiteNameSave(name: string) {
    const trimmed = name.trim();
    const finalName = trimmed || null;
    if (finalName === settings.siteName) return;
    setSiteNameBusy(true);
    try {
      const saved = await requestJson<AppSettings>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lightLogoAssetId: settings.lightLogoAssetId,
          darkLogoAssetId: settings.darkLogoAssetId,
          siteName: finalName,
        }),
      });
      setSettings(saved);
      setSiteNameDraft(saved.siteName ?? siteConfig.appName);
      document.title = saved.siteName || siteConfig.appName;
    } catch (error) {
      console.error("保存站点名称失败:", error);
    } finally {
      setSiteNameBusy(false);
    }
  }

  function debouncedSiteNameSave(name: string) {
    setSiteNameDraft(name);
    if (siteNameTimerRef.current) clearTimeout(siteNameTimerRef.current);
    siteNameTimerRef.current = setTimeout(() => {
      void handleSiteNameSave(name);
    }, 600);
  }

  async function handleLogout() {
    await requestJson("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setDrawerOpen(false);
    setAppearanceDrawerOpen(false);
    setConfigDrawerOpen(false);
    setConfigConfirmAction(null);
    setConfigConfirmPassword("");
    setConfigConfirmError("");
    setAppearanceMenuTarget(null);
    setWallpaperUrlTarget(null);
    setEditMode(false);
    setEditorPanel(null);
    setAdminData(null);
    setMessage("已退出登录，编辑权限已关闭。");
    await syncNavigationData();
  }

  function cycleSearchEngine() {
    setSearchMenuOpen((current) => !current);
  }

  function stepSearchEngine(direction: 1 | -1) {
    setSearchEngine((current) => {
      const engines = siteConfig.supportedSearchEngines;
      const currentIndex = engines.indexOf(current);
      const nextIndex =
        (currentIndex + direction + engines.length) % engines.length;
      return engines[nextIndex] ?? current;
    });
    setSearchMenuOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");
  }

  function toggleThemeMode() {
    setSearchMenuOpen(false);
    setThemeMode((current) => (current === "light" ? "dark" : "light"));
  }

  function toggleEditMode() {
    if (!isAuthenticated) return;

    if (!editMode) {
      setEditMode(true);
      return;
    }

    setEditMode(false);
    setEditorPanel(null);
    setSiteForm(defaultSiteForm);
    setTagForm(defaultTagForm);
  }

  function openSiteCreator() {
    setEditMode(true);
    setEditorPanel("site");
    setSiteAdminGroup("create");
    setSiteForm({
      ...defaultSiteForm,
      tagIds: activeTagId ? [activeTagId] : [],
    });
  }

  function openTagCreator() {
    setEditMode(true);
    setEditorPanel("tag");
    setTagAdminGroup("create");
    setTagForm(defaultTagForm);
  }

  function openSiteEditor(site: Site) {
    setEditMode(true);
    setEditorPanel("site");
    setSiteAdminGroup("edit");
    setSiteForm({
      id: site.id,
      name: site.name,
      url: site.url,
      description: site.description,
      iconUrl: site.iconUrl ?? "",
      iconBgColor: site.iconBgColor ?? "transparent",
      tagIds: site.tags.map((tag) => tag.id),
    });
  }

  function openTagEditor(tag: Tag) {
    setEditMode(true);
    setEditorPanel("tag");
    setTagAdminGroup("edit");
    setTagForm({
      id: tag.id,
      name: tag.name,
      isHidden: tag.isHidden,
      logoUrl: tag.logoUrl ?? "",
      logoBgColor: tag.logoBgColor ?? "transparent",
      description: tag.description ?? "",
    });
  }

  function closeEditorPanel() {
    setEditorPanel(null);
    setSiteForm(defaultSiteForm);
    setTagForm(defaultTagForm);
  }

  function openConfigConfirm(action: ConfigConfirmAction) {
    if (action === "import" && !configImportFile) {
      setErrorMessage("请先选择要导入的配置压缩包。");
      return;
    }

    setConfigConfirmAction(action);
    setConfigConfirmPassword("");
    setConfigConfirmError("");
  }

  function closeConfigConfirm() {
    if (configBusyAction) {
      return;
    }

    setConfigConfirmAction(null);
    setConfigConfirmPassword("");
    setConfigConfirmError("");
  }

  function submitSearch() {
    setSearchMenuOpen(false);
    setSearchSuggestionsOpen(false);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");

    if (searchEngine === "local") {
      setRefreshNonce((value) => value + 1);
      return;
    }

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

    if (searchEngine === "local") {
      setRefreshNonce((current) => current + 1);
      return;
    }

    window.open(
      `${siteConfig.searchEngines[searchEngine].searchUrl}${encodeURIComponent(value)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function submitSiteForm() {
    setErrorMessage("");
    setMessage("");

    if (!siteForm.iconUrl.trim()) {
      setErrorMessage("请先选择或上传一个图标。");
      return;
    }

    const payload = {
      ...siteForm,
      iconUrl: siteForm.iconUrl.trim() || null,
      iconBgColor: siteForm.iconBgColor || null,
      description: siteForm.description?.trim() || null,
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
      setEditorPanel(null);
      setSiteAdminGroup("create");
      setMessage(siteForm.id ? "网站修改已保存。" : "新网站已创建。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存网站失败");
    }
  }

  async function submitTagForm() {
    setErrorMessage("");
    setMessage("");

    if (!tagForm.logoUrl.trim()) {
      setErrorMessage("请先选择或上传一个图标。");
      return;
    }

    try {
      if (tagForm.id) {
        await requestJson("/api/tags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...tagForm,
            logoUrl: tagForm.logoUrl.trim() || null,
            logoBgColor: tagForm.logoBgColor || null,
          }),
        });
      } else {
        await requestJson("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...tagForm,
            logoUrl: tagForm.logoUrl.trim() || null,
            logoBgColor: tagForm.logoBgColor || null,
          }),
        });
      }

      setTagForm(defaultTagForm);
      setEditorPanel(null);
      setTagAdminGroup("create");
      setMessage("标签配置已保存。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存标签失败");
    }
  }

  async function uploadAppearanceWallpaper(
    theme: ThemeMode,
    device: WallpaperDevice,
    file: File,
  ) {
    setUploadingTheme(theme);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "wallpaper");
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        body: formData,
      });

      setAppearanceDraft((current) => ({
        ...current,
        [theme]: {
          ...current[theme],
          ...(device === "desktop"
            ? {
                desktopWallpaperAssetId: asset.id,
                desktopWallpaperUrl: asset.url,
              }
            : {
                mobileWallpaperAssetId: asset.id,
                mobileWallpaperUrl: asset.url,
              }),
        },
      }));
      setAppearanceMenuTarget(null);
      setMessage(
        `${getThemeDeviceLabel(theme, device, "壁纸")}已上传。`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "壁纸上传失败");
    } finally {
      setUploadingTheme(null);
    }
  }

  async function uploadAppearanceWallpaperByUrl(
    theme: ThemeMode,
    device: WallpaperDevice,
    sourceUrl: string,
  ) {
    setWallpaperUrlBusy(true);
    setWallpaperUrlError("");

    try {
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl,
          kind: "wallpaper",
        }),
      });

      setAppearanceDraft((current) => ({
        ...current,
        [theme]: {
          ...current[theme],
          ...(device === "desktop"
            ? {
                desktopWallpaperAssetId: asset.id,
                desktopWallpaperUrl: asset.url,
              }
            : {
                mobileWallpaperAssetId: asset.id,
                mobileWallpaperUrl: asset.url,
              }),
        },
      }));
      setWallpaperUrlTarget(null);
      setWallpaperUrlValue("");
      setAppearanceMenuTarget(null);
      setMessage(
        `${getThemeDeviceLabel(theme, device, "壁纸")}已通过链接更新。`,
      );
    } catch (error) {
      setWallpaperUrlError(error instanceof Error ? error.message : "壁纸 URL 上传失败");
    } finally {
      setWallpaperUrlBusy(false);
    }
  }

  function removeAppearanceWallpaper(theme: ThemeMode, device: WallpaperDevice) {
    setAppearanceDraft((current) => ({
      ...current,
      [theme]: {
        ...current[theme],
        ...(device === "desktop"
          ? {
              desktopWallpaperAssetId: null,
              desktopWallpaperUrl: null,
            }
          : {
              mobileWallpaperAssetId: null,
              mobileWallpaperUrl: null,
            }),
      },
    }));
    setAppearanceMenuTarget(null);
    setMessage(
      `${getThemeDeviceLabel(theme, device, "壁纸")}已移除。`,
    );
  }

  function openWallpaperUrlDialog(target: WallpaperTarget) {
    setWallpaperUrlTarget(target);
    setWallpaperUrlValue("");
    setWallpaperUrlError("");
    setAppearanceMenuTarget(null);
  }

  function closeWallpaperUrlDialog() {
    if (wallpaperUrlBusy) return;
    setWallpaperUrlTarget(null);
    setWallpaperUrlValue("");
    setWallpaperUrlError("");
  }

  function triggerWallpaperFilePicker(device: WallpaperDevice) {
    if (device === "desktop") {
      desktopWallpaperInputRef.current?.click();
    } else {
      mobileWallpaperInputRef.current?.click();
    }
    setAppearanceMenuTarget(null);
  }

  async function uploadAppearanceAsset(
    theme: ThemeMode,
    kind: AssetKind,
    file: File,
  ) {
    setUploadingAssetTheme(theme);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        body: formData,
      });

      setAppearanceDraft((current) => ({
        ...current,
        [theme]: {
          ...current[theme],
          ...(kind === "logo"
            ? {
                logoAssetId: asset.id,
                logoUrl: asset.url,
              }
            : {
                faviconAssetId: asset.id,
                faviconUrl: asset.url,
              }),
        },
      }));
      setAssetMenuTarget(null);
      setMessage(
        `${getThemeAssetLabel(theme, kind)}已上传。`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploadingAssetTheme(null);
    }
  }

  async function uploadAppearanceAssetByUrl(
    theme: ThemeMode,
    kind: AssetKind,
    sourceUrl: string,
  ) {
    setAssetUrlBusy(true);
    setAssetUrlError("");

    try {
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl,
          kind,
        }),
      });

      setAppearanceDraft((current) => ({
        ...current,
        [theme]: {
          ...current[theme],
          ...(kind === "logo"
            ? {
                logoAssetId: asset.id,
                logoUrl: asset.url,
              }
            : {
                faviconAssetId: asset.id,
                faviconUrl: asset.url,
              }),
        },
      }));
      setAssetUrlTarget(null);
      setAssetUrlValue("");
      setAssetMenuTarget(null);
      setMessage(
        `${getThemeAssetLabel(theme, kind)}已通过链接更新。`,
      );
    } catch (error) {
      setAssetUrlError(error instanceof Error ? error.message : "URL 上传失败");
    } finally {
      setAssetUrlBusy(false);
    }
  }

  function removeAppearanceAsset(theme: ThemeMode, kind: AssetKind) {
    setAppearanceDraft((current) => ({
      ...current,
      [theme]: {
        ...current[theme],
        ...(kind === "logo"
          ? {
              logoAssetId: null,
              logoUrl: null,
            }
          : {
              faviconAssetId: null,
              faviconUrl: null,
            }),
      },
    }));
    setAssetMenuTarget(null);
    setMessage(
      `${getThemeAssetLabel(theme, kind)}已移除。`,
    );
  }

  function openAssetUrlDialog(target: AssetTarget) {
    setAssetUrlTarget(target);
    setAssetUrlValue("");
    setAssetUrlError("");
    setAssetMenuTarget(null);
  }

  function closeAssetUrlDialog() {
    if (assetUrlBusy) return;
    setAssetUrlTarget(null);
    setAssetUrlValue("");
    setAssetUrlError("");
  }

  function triggerAssetFilePicker(kind: AssetKind) {
    if (kind === "logo") {
      logoInputRef.current?.click();
    } else {
      faviconInputRef.current?.click();
    }
    setAssetMenuTarget(null);
  }

  function queueTypographyNotice(theme: ThemeMode) {
    setPendingAppearanceNotice({
      key: `typography-${theme}`,
      message: `${getThemeLabel(theme)}主题字体设置已保存。`,
    });
  }

  function queueCardFrostedNotice(theme: ThemeMode) {
    setPendingAppearanceNotice({
      key: `card-frosted-${theme}`,
      message: `${getThemeLabel(theme)}主题卡片磨砂效果已保存。`,
    });
  }

  function restoreThemeTypographyDefaults(theme: ThemeMode) {
    setAppearanceDraft((current) => ({
      ...current,
      [theme]: {
        ...current[theme],
        fontPreset: themeAppearanceDefaults[theme].fontPreset,
        fontSize: themeAppearanceDefaults[theme].fontSize,
        textColor: themeAppearanceDefaults[theme].textColor,
      },
    }));
    queueTypographyNotice(theme);
  }

  async function exportCurrentConfig(password: string) {
    setConfigBusyAction("export");
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch("/api/config/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "导出配置失败");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+?)"/i);
      link.href = url;
      link.download = filenameMatch?.[1] ?? "sakuranav-config.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage("配置压缩包已生成，浏览器会开始下载。");
    } catch (error) {
      throw error instanceof Error ? error : new Error("导出配置失败");
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function importConfigArchive(password: string) {
    if (!configImportFile) {
      throw new Error("请先选择要导入的配置压缩包。");
    }

    setConfigBusyAction("import");
    setErrorMessage("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", configImportFile);
      formData.append("password", password);
      const data = await requestJson<{
        ok: boolean;
        tags: Tag[];
        sites: Site[];
        appearances: Record<ThemeMode, ThemeAppearance>;
        settings: AppSettings;
      }>("/api/config/import", {
        method: "POST",
        body: formData,
      });

      applyAdminBootstrap({
        tags: data.tags,
        sites: data.sites,
        appearances: data.appearances,
        settings: data.settings,
      });
      setAppearances(data.appearances);
      setTags(data.tags);
      setSettings(data.settings);
      setSettingsDraft(data.settings);
      setSiteForm(defaultSiteForm);
      setTagForm(defaultTagForm);
      setSiteAdminGroup("create");
      setTagAdminGroup("create");
      setConfigImportFile(null);
      setRefreshNonce((value) => value + 1);
      setMessage("配置压缩包已导入，当前导航数据已刷新。");
    } catch (error) {
      throw error instanceof Error ? error : new Error("导入配置失败");
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function resetConfigToDefaults(password: string) {
    setConfigBusyAction("reset");
    setErrorMessage("");
    setMessage("");

    try {
      const data = await requestJson<{
        ok: true;
        tags: Tag[];
        sites: Site[];
        appearances: Record<ThemeMode, ThemeAppearance>;
        settings: AppSettings;
      }>("/api/config/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      applyAdminBootstrap({
        tags: data.tags,
        sites: data.sites,
        appearances: data.appearances,
        settings: data.settings,
      });
      setTags(data.tags);
      setAppearances(data.appearances);
      setSettings(data.settings);
      setSettingsDraft(data.settings);
      setSiteForm(defaultSiteForm);
      setTagForm(defaultTagForm);
      setEditorPanel(null);
      setConfigImportFile(null);
      setActiveTagId(null);
      setQuery("");
      setRefreshNonce((value) => value + 1);
      setMessage("已恢复默认内容配置。");
    } catch (error) {
      throw error instanceof Error ? error : new Error("恢复默认失败");
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function submitConfigConfirm() {
    if (!configConfirmAction) {
      return;
    }

    if (!configConfirmPassword.trim()) {
      setConfigConfirmError("请输入当前账号密码。");
      return;
    }

    setConfigConfirmError("");

    try {
      if (configConfirmAction === "export") {
        await exportCurrentConfig(configConfirmPassword);
      } else if (configConfirmAction === "import") {
        await importConfigArchive(configConfirmPassword);
      } else {
        await resetConfigToDefaults(configConfirmPassword);
      }

      setConfigConfirmAction(null);
      setConfigConfirmPassword("");
      setConfigConfirmError("");
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : `${configActionLabels[configConfirmAction]}失败`;
      setConfigConfirmError(messageText);
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
        setEditorPanel(null);
        setSiteAdminGroup("create");
      }
      setMessage("网站已从导航页移除。");
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
        setEditorPanel(null);
        setTagAdminGroup("create");
      }
      setMessage("标签已删除。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除标签失败");
    }
  }

  async function handleTagSort(event: DragEndEvent) {
    setActiveDrag(null);
    setActiveDragSize(null);
    setActiveDragOffset(null);
    if (!event.over || event.active.id === event.over.id || !isAuthenticated || !editMode) return;
    const oldIndex = tags.findIndex((tag) => tag.id === event.active.id);
    const newIndex = tags.findIndex((tag) => tag.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextTags = arrayMove(tags, oldIndex, newIndex).map((tag, index) => ({
      ...tag,
      sortOrder: index,
    }));
    setTags(nextTags);
    setAdminData((current) =>
      current
        ? {
            ...current,
            tags: nextTags,
          }
        : current,
    );

    try {
      await requestJson("/api/tags/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: nextTags.map((tag) => tag.id) }),
      });
      setMessage("标签顺序已更新。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存标签顺序失败");
      await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
    }
  }

  async function handleSiteSort(event: DragEndEvent) {
    setActiveDrag(null);
    setActiveDragSize(null);
    setActiveDragOffset(null);
    if (
      !event.over ||
      event.active.id === event.over.id ||
      !isAuthenticated ||
      !editMode ||
      !adminData
    ) {
      return;
    }
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

    setAdminData((current) => {
      if (!current) return current;

      const orderMap = new Map(reorderedIds.map((id, index) => [id, index]));
      return {
        ...current,
        sites: current.sites.map((site) => {
          if (!orderMap.has(site.id)) {
            return site;
          }

          if (activeTagId) {
            return {
              ...site,
              tags: site.tags.map((tag) =>
                tag.id === activeTagId
                  ? { ...tag, sortOrder: orderMap.get(site.id) ?? tag.sortOrder }
                  : tag,
              ),
            };
          }

          return {
            ...site,
            globalSortOrder: orderMap.get(site.id) ?? site.globalSortOrder,
          };
        }),
      };
    });

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
      setMessage(activeTagId ? "标签内网站顺序已更新。" : "网站顺序已更新。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存网站顺序失败");
      await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
    }
  }

  function handleDragStart(kind: DragKind) {
    return (event: DragStartEvent) => {
      setActiveDrag({ id: String(event.active.id), kind });
      const rect = event.active.rect.current.initial;
      const width = rect?.width ?? 0;
      const height = rect?.height ?? 0;
      setActiveDragSize(width && height ? { width, height } : null);
      // 捕获鼠标相对于元素的偏移量
      if (rect && event.activatorEvent instanceof MouseEvent) {
        setActiveDragOffset({
          x: event.activatorEvent.clientX - rect.left,
          y: event.activatorEvent.clientY - rect.top,
        });
      } else {
        setActiveDragOffset(null);
      }
    };
  }

  function handleDragCancel() {
    setActiveDrag(null);
    setActiveDragSize(null);
    setActiveDragOffset(null);
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

  const buildThemeBackground = (theme: ThemeMode, device: "desktop" | "mobile") => {
    const appearance = appearances[theme];
    const defaultBackground =
      theme === "light"
        ? "radial-gradient(circle at top left, rgba(255,207,150,0.8), transparent 28%), radial-gradient(circle at 80% 10%, rgba(95,134,255,0.4), transparent 32%), linear-gradient(135deg, #f4ede4 0%, #efe5d7 44%, #e2e5ef 100%)"
        : "radial-gradient(circle at top left, rgba(87,65,198,0.34), transparent 28%), radial-gradient(circle at 80% 10%, rgba(0,204,255,0.22), transparent 32%), linear-gradient(145deg, #08101e 0%, #11192a 42%, #101726 100%)";
    const wallpaperOverlay =
      theme === "light"
        ? "linear-gradient(180deg, rgba(255,248,241,0.18) 0%, rgba(244,238,232,0.34) 100%)"
        : "linear-gradient(180deg, rgba(6,11,22,0.54) 0%, rgba(8,15,29,0.68) 100%)";
    const desktopBackground = appearance.desktopWallpaperUrl
      ? `${wallpaperOverlay}, url(${appearance.desktopWallpaperUrl})`
      : defaultBackground;

    if (device === "desktop") {
      return desktopBackground;
    }

    return appearance.mobileWallpaperUrl
      ? `${wallpaperOverlay}, url(${appearance.mobileWallpaperUrl})`
      : defaultBackground;
  };

  const lightDesktopBackground = buildThemeBackground("light", "desktop");
  const lightMobileBackground = buildThemeBackground("light", "mobile");
  const darkDesktopBackground = buildThemeBackground("dark", "desktop");
  const darkMobileBackground = buildThemeBackground("dark", "mobile");
  const pageStyle = {
    fontFamily: activeFont.cssVariable,
    fontSize: `${activeAppearance.fontSize}px`,
    color: activeAppearance.textColor,
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
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500 ease-out md:hidden",
          themeMode === "light" ? "opacity-100" : "opacity-0",
        )}
        style={{ backgroundImage: lightMobileBackground, backgroundPosition: "center", backgroundSize: "cover" }}
      />
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500 ease-out md:hidden",
          themeMode === "dark" ? "opacity-100" : "opacity-0",
        )}
        style={{ backgroundImage: darkMobileBackground, backgroundPosition: "center", backgroundSize: "cover" }}
      />
      <div
        className={cn(
          "absolute inset-0 hidden transition-opacity duration-500 ease-out md:block",
          themeMode === "light" ? "opacity-100" : "opacity-0",
        )}
        style={{ backgroundImage: lightDesktopBackground, backgroundPosition: "center", backgroundSize: "cover" }}
      />
      <div
        className={cn(
          "absolute inset-0 hidden transition-opacity duration-500 ease-out md:block",
          themeMode === "dark" ? "opacity-100" : "opacity-0",
        )}
        style={{ backgroundImage: darkDesktopBackground, backgroundPosition: "center", backgroundSize: "cover" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 mix-blend-soft-light" />
      <div className="relative flex min-h-screen w-full flex-col">
        <header className={cn("sticky top-0 z-20 flex w-full flex-col transition-all duration-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8", headerChromeClass)}>
          {/* 移动端顶栏：Logo居中 */}
          <div className="flex items-center justify-center py-3 lg:hidden">
            <button
              type="button"
              onClick={() => {
                setActiveTagId(null);
                setQuery("");
                setSearchMenuOpen(false);
              }}
              className="flex items-center gap-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeHeaderLogo}
                alt={`${displayName} logo`}
                className="h-12 w-12 rounded-[18px] border border-white/25 bg-white/18 object-cover shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
              />
              <h1 className="text-[1.4rem] font-semibold tracking-[-0.03em]">{displayName}</h1>
            </button>
          </div>
          {/* 移动端分界线 */}
          <div
            className={cn(
              "mx-4 border-b lg:hidden",
              themeMode === "light"
                ? "border-slate-900/10"
                : "border-white/10",
            )}
          />
          {/* 移动端第二栏：工具栏按钮，左右固定，中间均匀 */}
          <div className="flex items-center px-4 py-3 lg:hidden">
            {/* 左侧：标签栏按钮 */}
            <button
              type="button"
              onClick={() => setMobileTagsOpen((v) => !v)}
              className={mobileToolbarButtonClass}
              aria-label={mobileTagsOpen ? "关闭标签栏" : "打开标签栏"}
            >
              {mobileTagsOpen ? <X className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </button>
            {/* 中间：用户态按钮（仅登录时显示），均匀分布在剩余空间 */}
            <div className="flex flex-1 items-center justify-evenly">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={toggleEditMode}
                  className={mobileToolbarButtonClass}
                  aria-label={editMode ? "浏览" : "编辑"}
                >
                  {editMode ? <Eye className="h-5 w-5" /> : <PencilLine className="h-5 w-5" />}
                </button>
              ) : null}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfigDrawerOpen(false);
                    setAppearanceDrawerOpen(true);
                    setAppearanceThemeTab(themeMode);
                  }}
                  className={mobileToolbarButtonClass}
                  aria-label="外观"
                >
                  <PaintBucket className="h-5 w-5" />
                </button>
              ) : null}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setAppearanceDrawerOpen(false);
                    setConfigDrawerOpen(true);
                  }}
                  className={mobileToolbarButtonClass}
                  aria-label="设置"
                >
                  <Settings2 className="h-5 w-5" />
                </button>
              ) : null}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className={mobileToolbarButtonClass}
                  aria-label="退出"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              ) : null}
            </div>
            {/* 右侧：模式切换 */}
            <button
              type="button"
              onClick={toggleThemeMode}
              className={mobileToolbarButtonClass}
              aria-label={themeMode === "light" ? "切换暗黑模式" : "切换光明模式"}
            >
              {themeMode === "light" ? <MoonStar className="h-5 w-5" /> : <SunMedium className="h-5 w-5" />}
            </button>
          </div>
          {/* 桌面端：原有布局 */}
          <button
            type="button"
            onClick={() => {
              setActiveTagId(null);
              setQuery("");
              setSearchMenuOpen(false);
            }}
            className="hidden lg:flex items-center gap-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeHeaderLogo}
              alt={`${displayName} logo`}
              className="h-14 w-14 rounded-[20px] border border-white/25 bg-white/18 object-cover shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
            />
            <div className="text-left leading-none">
              <h1 className="text-[1.6rem] font-semibold tracking-[-0.03em]">{displayName}</h1>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={toggleEditMode}
                className={topActionButtonClass}
              >
                <span className={topActionIconClass}>
                  {editMode ? <Eye className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
                </span>
                {editMode ? "浏览" : "编辑"}
              </button>
            ) : null}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setConfigDrawerOpen(false);
                  setAppearanceDrawerOpen(true);
                  setAppearanceThemeTab(themeMode);
                }}
                className={topActionButtonClass}
              >
                <span className={topActionIconClass}>
                  <PaintBucket className="h-4 w-4" />
                </span>
                外观
              </button>
            ) : null}
            <button
              type="button"
              onClick={toggleThemeMode}
              className={themeToggleButtonClass}
            >
              <span className="flex items-center gap-2.5">
                <span className={topActionIconClass}>
                  {themeMode === "light" ? (
                    <MoonStar className="h-4 w-4" />
                  ) : (
                    <SunMedium className="h-4 w-4" />
                  )}
                </span>
                <span>{themeMode === "light" ? "暗黑" : "光明"}</span>
              </span>
            </button>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setAppearanceDrawerOpen(false);
                  setConfigDrawerOpen(true);
                }}
                className={topActionButtonClass}
              >
                <span className={topActionIconClass}>
                  <Settings2 className="h-4 w-4" />
                </span>
                其他
              </button>
            ) : null}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => void handleLogout()}
                className={topActionButtonClass}
              >
                <span className={topActionIconClass}>
                  <LogOut className="h-4 w-4" />
                </span>
                退出
              </button>
            ) : null}
          </div>
        </header>

        <section className="flex flex-1 max-lg:flex-col">
          <aside
            className={cn(
              "shrink-0 p-4 transition-all duration-500",
              sidebarChromeClass,
              "lg:block",
              mobileTagsOpen ? "block" : "hidden lg:block",
              "w-full lg:w-[300px]",
            )}
          >
            <div className="mb-5 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.26em] opacity-60">Labels</p>
                <h2 className="mt-1 text-xl font-semibold">分类标签</h2>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart("tag")}
              onDragCancel={handleDragCancel}
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
                      collapsed={false}
                      themeMode={themeMode}
                      wallpaperAware={hasActiveWallpaper}
                      draggable={isAuthenticated && editMode}
                      editable={isAuthenticated && editMode}
                      onEdit={() => openTagEditor(tag)}
                      onSelect={() => {
                        setActiveTagId(tag.id);
                        setSearchMenuOpen(false);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
              {portalContainer && createPortal(
                <DragOverlay dropAnimation={dragTransition} modifiers={[snapToCursorModifier]}>
                  {activeDraggedTag ? (
                    <TagRowCard
                      tag={activeDraggedTag}
                      active={activeTagId === activeDraggedTag.id}
                      collapsed={false}
                      themeMode={themeMode}
                      wallpaperAware={hasActiveWallpaper}
                      dragging
                      overlay
                      style={activeDragSize ? { width: activeDragSize.width } : undefined}
                    >
                      <TagRowContent
                        tag={activeDraggedTag}
                        collapsed={false}
                        themeMode={themeMode}
                        wallpaperAware={hasActiveWallpaper}
                        editable={false}
                        draggable={false}
                        reserveActionSpace
                      />
                    </TagRowCard>
                  ) : null}
                </DragOverlay>,
                portalContainer
              )}
            </DndContext>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-5 text-center">
              <div className="w-full space-y-4">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className={cn(
                    "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.26em] opacity-70",
                    hasActiveWallpaper
                      ? themeMode === "light"
                        ? "border-slate-900/10 bg-white/40 shadow-[0_4px_16px_rgba(148,163,184,0.08)] backdrop-blur-[18px]"
                        : "border-white/12 bg-white/10 shadow-[0_4px_16px_rgba(2,6,23,0.16)] backdrop-blur-[18px]"
                      : "border-white/20 bg-white/16",
                  )}>
                    {activeTagId ? "标签视图" : "默认视图"}
                  </span>
                  <h2 className={cn(
                    "text-2xl font-semibold tracking-tight sm:text-3xl",
                    hasActiveWallpaper
                      ? themeMode === "light"
                        ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
                        : "drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
                      : "",
                  )}>
                    {currentTitle}
                  </h2>
                  <p className={cn(
                    "text-sm opacity-72 rounded-full px-3 py-1",
                    hasActiveWallpaper
                      ? themeMode === "light"
                        ? "bg-white/36 shadow-[0_4px_16px_rgba(148,163,184,0.08)] backdrop-blur-[18px]"
                        : "bg-white/10 shadow-[0_4px_16px_rgba(2,6,23,0.16)] backdrop-blur-[18px]"
                      : "",
                  )}>
                    已展示 {siteList.items.length} / {siteList.total} 个网站
                  </p>
                  {isAuthenticated && editMode ? (
                    <>
                      <button
                        type="button"
                        onClick={openSiteCreator}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/18 bg-white/16 px-4 text-sm font-medium transition hover:bg-white/24"
                      >
                        <Plus className="h-4 w-4" />
                        新建网站
                      </button>
                      <button
                        type="button"
                        onClick={openTagCreator}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/18 bg-white/12 px-4 text-sm font-medium transition hover:bg-white/20"
                      >
                        <Plus className="h-4 w-4" />
                        新建标签
                      </button>
                    </>
                  ) : null}
                </div>

                <form
                  ref={searchFormRef}
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitSearch();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey) {
                      event.preventDefault();
                      stepSearchEngine(event.shiftKey ? -1 : 1);
                      return;
                    }

                    if (!searchSuggestionsOpen || !searchSuggestions.length) {
                      if (event.key === "Escape") {
                        setSearchMenuOpen(false);
                        setSearchSuggestionsOpen(false);
                        setActiveSuggestionIndex(-1);
                        setHoveredSuggestionIndex(-1);
                        setSuggestionInteractionMode("keyboard");
                      }
                      return;
                    }

                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      const baseIndex =
                        highlightedSuggestionIndex >= 0
                          ? highlightedSuggestionIndex
                          : activeSuggestionIndex;
                      setSuggestionInteractionMode("keyboard");
                      setHoveredSuggestionIndex(-1);
                      setActiveSuggestionIndex(
                        baseIndex < 0 ? 0 : (baseIndex + 1) % searchSuggestions.length,
                      );
                      return;
                    }

                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      const baseIndex =
                        highlightedSuggestionIndex >= 0
                          ? highlightedSuggestionIndex
                          : activeSuggestionIndex;
                      setSuggestionInteractionMode("keyboard");
                      setHoveredSuggestionIndex(-1);
                      setActiveSuggestionIndex(
                        baseIndex <= 0 ? searchSuggestions.length - 1 : baseIndex - 1,
                      );
                      return;
                    }

                    if (event.key === "Enter" && highlightedSuggestionIndex >= 0) {
                      event.preventDefault();
                      const suggestion = searchSuggestions[highlightedSuggestionIndex];
                      if (suggestion) {
                        applySuggestion(suggestion.value);
                      }
                      return;
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      setSearchSuggestionsOpen(false);
                      setActiveSuggestionIndex(-1);
                      setHoveredSuggestionIndex(-1);
                      setSuggestionInteractionMode("keyboard");
                    }
                  }}
                  className={cn(
                    "relative z-40 mx-auto flex w-full max-w-[980px] min-[1280px]:max-w-[1120px] flex-col gap-3 rounded-[30px] border p-3 sm:flex-row sm:items-center",
                    hasActiveWallpaper
                      ? themeMode === "light"
                        ? "border-slate-900/10 bg-white/40 shadow-[0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur-[22px]"
                        : "border-white/14 bg-white/10 shadow-[0_12px_34px_rgba(2,6,23,0.22)] backdrop-blur-[22px]"
                      : "border-white/20 bg-white/12",
                  )}
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
                      <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-56 overflow-hidden rounded-3xl border border-white/16 bg-[#0f172ae8] p-2 text-left text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                        {siteConfig.supportedSearchEngines.map((engine) => (
                          <button
                            key={engine}
                            type="button"
                            onClick={() => {
                              setSearchEngine(engine);
                              setSearchMenuOpen(false);
                              setActiveSuggestionIndex(-1);
                              setHoveredSuggestionIndex(-1);
                              setSuggestionInteractionMode("keyboard");
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
                  <div className={cn(
                    "relative flex flex-1 items-center gap-3 rounded-2xl border px-4 py-3",
                    hasActiveWallpaper
                      ? themeMode === "light"
                        ? "border-slate-900/8 bg-white/30"
                        : "border-white/12 bg-white/8"
                      : "border-white/18 bg-white/18",
                  )}>
                    <Search className="h-4 w-4 opacity-70" />
                    <input
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setActiveSuggestionIndex(-1);
                        setHoveredSuggestionIndex(-1);
                        setSuggestionInteractionMode("keyboard");
                      }}
                      onFocus={() => {
                        if (searchSuggestions.length) {
                          setSearchSuggestionsOpen(true);
                        }
                      }}
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
                    {searchSuggestionsOpen ? (
                      <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-full overflow-hidden rounded-3xl border border-white/16 bg-[#0f172ae8] p-2 text-left text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                        {searchSuggestionsBusy && !searchSuggestions.length ? (
                          <div className="flex items-center gap-2 rounded-2xl px-3 py-3 text-sm text-white/70">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            正在获取联想词...
                          </div>
                        ) : null}
                        {searchSuggestions.map((suggestion, index) => (
                          <button
                            key={`${suggestion.kind}-${suggestion.value}-${index}`}
                            type="button"
                            onClick={() => applySuggestion(suggestion.value)}
                            onMouseEnter={() => {
                              setSuggestionInteractionMode("pointer");
                              setHoveredSuggestionIndex(index);
                            }}
                            onMouseMove={() => {
                              if (
                                suggestionInteractionMode !== "pointer" ||
                                hoveredSuggestionIndex !== index
                              ) {
                                setSuggestionInteractionMode("pointer");
                                setHoveredSuggestionIndex(index);
                              }
                            }}
                            className={cn(
                              "flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-3 text-sm transition",
                              highlightedSuggestionIndex === index
                                ? "bg-white/16 text-white"
                                : "text-white/78",
                            )}
                          >
                            <span className="truncate">{suggestion.value}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </form>

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
                  onDragStart={handleDragStart("site")}
                  onDragCancel={handleDragCancel}
                  onDragEnd={(event) => void handleSiteSort(event)}
                >
                  <SortableContext
                    items={siteList.items.map((site) => site.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div
                      className={cn(
                        "mx-auto grid w-full max-w-[1440px] grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 transition-all duration-300 ease-out",
                        listState === "refreshing" ? "scale-[0.985] opacity-55 blur-[2px] saturate-75" : "",
                      )}
                    >
                      {siteList.items.map((site, index) => (
                        <SortableSiteCard
                          key={site.id}
                          site={site}
                          index={index}
                          viewEpoch={viewEpoch}
                          draggable={isAuthenticated && editMode && !effectiveQuery}
                          editable={isAuthenticated && editMode}
                          themeMode={themeMode}
                          wallpaperAware={hasActiveWallpaper}
                          desktopCardFrosted={activeAppearance.desktopCardFrosted ?? false}
                          mobileCardFrosted={activeAppearance.mobileCardFrosted ?? false}
                          onEdit={() => openSiteEditor(site)}
                          onTagSelect={(tagId) => {
                            setActiveTagId(tagId);
                            setSearchMenuOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay dropAnimation={dragTransition} modifiers={[snapToCursorModifier]}>
                    {activeDraggedSite ? (
                      <SiteCardShell
                        site={activeDraggedSite}
                        overlay
                        themeMode={themeMode}
                        wallpaperAware={hasActiveWallpaper}
                        desktopCardFrosted={activeAppearance.desktopCardFrosted ?? false}
                        mobileCardFrosted={activeAppearance.mobileCardFrosted ?? false}
                      >
                        <SiteCardContent
                          site={activeDraggedSite}
                          editable={false}
                          draggable={false}
                          themeMode={themeMode}
                          wallpaperAware={hasActiveWallpaper}
                          reserveActionSpace
                        />
                      </SiteCardShell>
                    ) : null}
                  </DragOverlay>
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

            <footer className="mx-auto mt-8 w-full max-w-[1440px] pb-6 text-center text-base">
              {/* 移动端：根据移动端壁纸判断样式 */}
              <span
                className={cn(
                  "md:hidden",
                  hasActiveMobileWallpaper
                    ? "text-white/50 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                    : themeMode === "light"
                      ? "text-slate-500"
                      : "text-white/50",
                )}
              >
                Powered By{" "}
                <a
                  href="https://github.com/QingYu-Su/SakuraNav"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "font-bold transition",
                    hasActiveMobileWallpaper
                      ? "text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] hover:text-white"
                      : themeMode === "light"
                        ? "text-slate-700 hover:text-slate-900"
                        : "text-white/80 hover:text-white",
                  )}
                >
                  SakuraNav
                </a>
              </span>
              {/* 桌面端：根据桌面端壁纸判断样式 */}
              <span
                className={cn(
                  "hidden md:inline",
                  hasActiveDesktopWallpaper
                    ? "text-white/50 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                    : themeMode === "light"
                      ? "text-slate-500"
                      : "text-white/50",
                )}
              >
                Powered By{" "}
                <a
                  href="https://github.com/QingYu-Su/SakuraNav"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "font-bold transition",
                    hasActiveDesktopWallpaper
                      ? "text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] hover:text-white"
                      : themeMode === "light"
                        ? "text-slate-700 hover:text-slate-900"
                        : "text-white/80 hover:text-white",
                  )}
                >
                  SakuraNav
                </a>
              </span>
            </footer>
          </section>
        </section>
      </div>

      {toasts.length ? (
        <div className="pointer-events-none fixed right-5 top-24 z-50 flex w-[min(400px,calc(100vw-2rem))] flex-col gap-3">
          {toasts.map((toast) => (
            <NotificationToast
              key={toast.id}
              toast={toast}
              onClose={dismissToast}
            />
          ))}
        </div>
      ) : null}

      <div className="fixed bottom-6 right-6 z-[45] flex flex-col items-end gap-3">
        {showScrollTopButton ? (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/18 bg-[#0f172ae0] text-white shadow-[0_18px_48px_rgba(15,23,42,0.34)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-[#0f172af0]"
            aria-label="回到顶部"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setFloatingSearchOpen(true)}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,255,255,0.18)] bg-[#4f7cff] text-white shadow-[0_18px_52px_rgba(79,124,255,0.38)] transition hover:-translate-y-0.5 hover:bg-[#678cff]"
          aria-label="打开悬浮搜索"
        >
          <Search className="h-5 w-5" />
        </button>
        <a
          href="https://github.com/QingYu-Su/SakuraNav"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,255,255,0.18)] bg-[#4f7cff] text-white shadow-[0_18px_52px_rgba(79,124,255,0.38)] transition hover:-translate-y-0.5 hover:bg-[#678cff]"
          aria-label="给个 Star"
        >
          <Star className="h-5 w-5 text-white [&_path]:stroke-white" />
        </a>
      </div>

      <FloatingSearchDialog
        open={floatingSearchOpen}
        activeTagId={activeTagId}
        activeTagName={currentTitle}
        onClose={() => setFloatingSearchOpen(false)}
      />

      {appearanceDrawerOpen && isAuthenticated ? (
        <div className="animate-drawer-fade fixed inset-0 z-40 flex justify-end bg-slate-950/42 backdrop-blur-sm">
          <div className="animate-drawer-slide flex h-full w-full max-w-[720px] flex-col border-l border-white/12 bg-[#0f172af2] text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">Appearance</p>
                <h2 className="mt-1 text-2xl font-semibold">外观</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAppearanceDrawerOpen(false);
                  setAppearanceMenuTarget(null);
                  closeWallpaperUrlDialog();
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 hover:bg-white/12"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <AppearanceAdminPanel
                appearanceThemeTab={appearanceThemeTab}
                setAppearanceThemeTab={setAppearanceThemeTab}
                appearanceDraft={appearanceDraft}
                setAppearanceDraft={setAppearanceDraft}
                uploadingTheme={uploadingTheme}
                appearanceMenuTarget={appearanceMenuTarget}
                desktopWallpaperInputRef={desktopWallpaperInputRef}
                mobileWallpaperInputRef={mobileWallpaperInputRef}
                logoInputRef={logoInputRef}
                faviconInputRef={faviconInputRef}
                assetMenuTarget={assetMenuTarget}
                uploadingAssetTheme={uploadingAssetTheme}
                onUploadWallpaper={(theme, device, file) =>
                  void uploadAppearanceWallpaper(theme, device, file)
                }
                onOpenWallpaperUrlDialog={openWallpaperUrlDialog}
                onOpenWallpaperMenu={setAppearanceMenuTarget}
                onRemoveWallpaper={removeAppearanceWallpaper}
                onTriggerWallpaperFilePicker={triggerWallpaperFilePicker}
                onUploadAsset={uploadAppearanceAsset}
                onOpenAssetUrlDialog={openAssetUrlDialog}
                onOpenAssetMenu={setAssetMenuTarget}
                onRemoveAsset={removeAppearanceAsset}
                onTriggerAssetFilePicker={triggerAssetFilePicker}
                onTypographyChange={queueTypographyNotice}
                onRestoreTypographyDefaults={restoreThemeTypographyDefaults}
                onCardFrostedChange={queueCardFrostedNotice}
              />
            </div>
          </div>
        </div>
      ) : null}

      {configDrawerOpen && isAuthenticated ? (
        <div className="animate-drawer-fade fixed inset-0 z-40 flex justify-end bg-slate-950/42 backdrop-blur-sm">
          <div className="animate-drawer-slide flex h-full w-full max-w-[640px] flex-col border-l border-white/12 bg-[#0f172af2] text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">Other</p>
                <h2 className="mt-1 text-2xl font-semibold">其他</h2>
              </div>
              <button
                type="button"
                onClick={() => setConfigDrawerOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 hover:bg-white/12"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <ConfigAdminPanel
                siteName={siteNameDraft}
                siteNameBusy={siteNameBusy}
                selectedFile={configImportFile}
                busyAction={configBusyAction}
                onSiteNameChange={(name) => {
                  debouncedSiteNameSave(name);
                }}
                onFileChange={setConfigImportFile}
                onExport={() => openConfigConfirm("export")}
                onImport={() => openConfigConfirm("import")}
                onReset={() => openConfigConfirm("reset")}
              />
            </div>
          </div>
        </div>
      ) : null}

      {configConfirmAction && isAuthenticated ? (
        <ConfigConfirmDialog
          action={configConfirmAction}
          password={configConfirmPassword}
          error={configConfirmError}
          busy={configBusyAction === configConfirmAction}
          onPasswordChange={(value) => {
            setConfigConfirmPassword(value);
            if (configConfirmError) {
              setConfigConfirmError("");
            }
          }}
          onClose={closeConfigConfirm}
          onSubmit={() => void submitConfigConfirm()}
        />
      ) : null}

      {wallpaperUrlTarget && isAuthenticated ? (
        <WallpaperUrlDialog
          target={wallpaperUrlTarget}
          value={wallpaperUrlValue}
          error={wallpaperUrlError}
          busy={wallpaperUrlBusy}
          onValueChange={(value) => {
            setWallpaperUrlValue(value);
            if (wallpaperUrlError) {
              setWallpaperUrlError("");
            }
          }}
          onClose={closeWallpaperUrlDialog}
          onSubmit={() => {
            if (!wallpaperUrlValue.trim()) {
              setWallpaperUrlError("请输入壁纸 URL。");
              return;
            }
            void uploadAppearanceWallpaperByUrl(
              wallpaperUrlTarget.theme,
              wallpaperUrlTarget.device,
              wallpaperUrlValue.trim(),
            );
          }}
        />
      ) : null}

      {assetUrlTarget && isAuthenticated ? (
        <AssetUrlDialog
          target={assetUrlTarget}
          value={assetUrlValue}
          error={assetUrlError}
          busy={assetUrlBusy}
          onValueChange={(value) => {
            setAssetUrlValue(value);
            if (assetUrlError) {
              setAssetUrlError("");
            }
          }}
          onClose={closeAssetUrlDialog}
          onSubmit={() => {
            if (!assetUrlValue.trim()) {
              setAssetUrlError("请输入图片 URL。");
              return;
            }
            void uploadAppearanceAssetByUrl(
              assetUrlTarget.theme,
              assetUrlTarget.kind,
              assetUrlValue.trim(),
            );
          }}
        />
      ) : null}

      {editorPanel && isAuthenticated && editMode ? (
        <div className="animate-drawer-fade fixed inset-0 z-40 flex items-end justify-center bg-slate-950/46 p-4 backdrop-blur-sm sm:items-center">
          <div className="animate-panel-rise w-full max-w-[760px] overflow-hidden rounded-[34px] border border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">Edit Mode</p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {editorPanel === "site"
                    ? siteForm.id
                      ? "修改网站"
                      : "新建网站"
                    : tagForm.id
                      ? "修改标签"
                      : "新建标签"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEditorPanel}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 transition hover:bg-white/12"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[82vh] overflow-y-auto px-6 py-6">
              {editorPanel === "site" ? (
                <SiteEditorForm
                  submitLabel={siteForm.id ? "保存网站" : "创建网站"}
                  siteForm={siteForm}
                  setSiteForm={setSiteForm}
                  tags={adminData?.tags ?? tags}
                  onSubmit={() => void submitSiteForm()}
                  onDelete={siteForm.id ? () => void deleteCurrentSite(siteForm.id as string) : undefined}
                  onTagsChange={async () => { await Promise.all([syncNavigationData(), syncAdminBootstrap()]); }}
                />
              ) : (
                <TagEditorForm
                  submitLabel={tagForm.id ? "保存标签" : "创建标签"}
                  tagForm={tagForm}
                  setTagForm={setTagForm}
                  onSubmit={() => void submitTagForm()}
                  onDelete={tagForm.id ? () => void deleteCurrentTag(tagForm.id as string) : undefined}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

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
                { key: "config", label: "配置", icon: Settings2 },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAdminSection(tab.key as AdminSection)}
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
                  activeGroup={siteAdminGroup}
                  setActiveGroup={setSiteAdminGroup}
                  onSubmit={() => void submitSiteForm()}
                  onError={setErrorMessage}
                  onTagsChange={async () => { await Promise.all([syncNavigationData(), syncAdminBootstrap()]); }}
                  onStartEdit={(site) => {
                    setSiteAdminGroup("edit");
                    setSiteForm({
                      id: site.id,
                      name: site.name,
                      url: site.url,
                      description: site.description,
                      iconUrl: site.iconUrl ?? "",
                      iconBgColor: site.iconBgColor ?? "transparent",
                      tagIds: site.tags.map((tag) => tag.id),
                    });
                  }}
                  onDelete={(siteId) => void deleteCurrentSite(siteId)}
                />
              ) : null}
              {adminSection === "tags" ? (
                <TagsAdminPanel
                  adminData={adminData}
                  tags={tags}
                  tagForm={tagForm}
                  setTagForm={setTagForm}
                  activeGroup={tagAdminGroup}
                  setActiveGroup={setTagAdminGroup}
                  onSubmit={() => void submitTagForm()}
                  onStartEdit={(tag) => {
                    setTagAdminGroup("edit");
                    setTagForm({
                      id: tag.id,
                      name: tag.name,
                      isHidden: tag.isHidden,
                      logoUrl: tag.logoUrl ?? "",
                      logoBgColor: tag.logoBgColor ?? "transparent",
                      description: tag.description ?? "",
                    });
                  }}
                  onDelete={(tagId) => void deleteCurrentTag(tagId)}
                />
              ) : null}
              {adminSection === "appearance" ? (
                <AppearanceAdminPanel
                  appearanceThemeTab={appearanceThemeTab}
                  setAppearanceThemeTab={setAppearanceThemeTab}
                  appearanceDraft={appearanceDraft}
                  setAppearanceDraft={setAppearanceDraft}
                  uploadingTheme={uploadingTheme}
                  appearanceMenuTarget={appearanceMenuTarget}
                  desktopWallpaperInputRef={desktopWallpaperInputRef}
                  mobileWallpaperInputRef={mobileWallpaperInputRef}
                  logoInputRef={logoInputRef}
                  faviconInputRef={faviconInputRef}
                  assetMenuTarget={assetMenuTarget}
                  uploadingAssetTheme={uploadingAssetTheme}
                  onUploadWallpaper={(theme, device, file) =>
                    void uploadAppearanceWallpaper(theme, device, file)
                  }
                  onOpenWallpaperUrlDialog={openWallpaperUrlDialog}
                  onOpenWallpaperMenu={setAppearanceMenuTarget}
                  onRemoveWallpaper={removeAppearanceWallpaper}
                  onTriggerWallpaperFilePicker={triggerWallpaperFilePicker}
                  onUploadAsset={uploadAppearanceAsset}
                  onOpenAssetUrlDialog={openAssetUrlDialog}
                  onOpenAssetMenu={setAssetMenuTarget}
                  onRemoveAsset={removeAppearanceAsset}
                  onTriggerAssetFilePicker={triggerAssetFilePicker}
                  onTypographyChange={queueTypographyNotice}
                  onRestoreTypographyDefaults={restoreThemeTypographyDefaults}
                  onCardFrostedChange={queueCardFrostedNotice}
                />
              ) : null}
              {adminSection === "config" ? (
                <ConfigAdminPanel
                  siteName={siteNameDraft}
                  siteNameBusy={siteNameBusy}
                  selectedFile={configImportFile}
                  busyAction={configBusyAction}
                  onSiteNameChange={(name) => {
                    debouncedSiteNameSave(name);
                  }}
                  onFileChange={setConfigImportFile}
                  onExport={() => openConfigConfirm("export")}
                  onImport={() => openConfigConfirm("import")}
                  onReset={() => openConfigConfirm("reset")}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
