"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  defaultAnimateLayoutChanges,
  rectSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  EllipsisVertical,
  Download,
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
  Settings2,
  SunMedium,
  Trash2,
  Upload,
  X,
  CircleAlert,
  CircleCheckBig,
} from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  forwardRef,
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { fontPresets, siteConfig } from "@/lib/config";
import { themeAppearanceDefaults } from "@/lib/config";
import {
  AppSettings,
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
import { cn } from "@/lib/utils";

type Props = {
  initialTags: Tag[];
  initialAppearances: Record<ThemeMode, ThemeAppearance>;
  initialSettings: AppSettings;
  initialSession: SessionUser | null;
};

type ToastState = {
  id: number;
  title: string;
  description: string;
  tone: "success" | "error";
  durationMs: number;
  count: number;
  signature: string;
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
  logoUrl: string;
};

type AppearanceDraft = Record<
  ThemeMode,
  {
    desktopWallpaperAssetId: string | null;
    desktopWallpaperUrl: string | null;
    mobileWallpaperAssetId: string | null;
    mobileWallpaperUrl: string | null;
    fontPreset: FontPresetKey;
    fontSize: number;
    overlayOpacity: number;
    textColor: string;
  }
>;

type AdminSection = "sites" | "tags" | "appearance" | "config";
type AdminGroup = "create" | "edit";
type AppearanceThemeTab = ThemeMode;
type DragKind = "tag" | "site";
type ConfigConfirmAction = "export" | "import" | "reset";
type WallpaperDevice = "desktop" | "mobile";
type WallpaperTarget = {
  theme: ThemeMode;
  device: WallpaperDevice;
};
type AppearanceNotice = {
  key: string;
  message: string;
};
type SearchSuggestion = {
  value: string;
  kind: "query" | "site" | "tag";
};
type SuggestionInteractionMode = "keyboard" | "pointer";

const configActionLabels: Record<ConfigConfirmAction, string> = {
  export: "导出配置",
  import: "导入配置",
  reset: "恢复默认",
};

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
  logoUrl: "",
};

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
  initialSettings,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [appearanceMenuTarget, setAppearanceMenuTarget] = useState<WallpaperTarget | null>(null);
  const [wallpaperUrlTarget, setWallpaperUrlTarget] = useState<WallpaperTarget | null>(null);
  const [wallpaperUrlValue, setWallpaperUrlValue] = useState("");
  const [wallpaperUrlError, setWallpaperUrlError] = useState("");
  const [wallpaperUrlBusy, setWallpaperUrlBusy] = useState(false);
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
  const [activeDrag, setActiveDrag] = useState<{ id: string; kind: DragKind } | null>(null);
  const [activeDragSize, setActiveDragSize] = useState<{ width: number; height: number } | null>(
    null,
  );
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
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 90, tolerance: 6 } }),
  );

  const activeAppearance = appearances[themeMode];
  const activeFont = fontPresets[activeAppearance.fontPreset];
  const hasActiveWallpaper = Boolean(
    activeAppearance.desktopWallpaperUrl || activeAppearance.mobileWallpaperUrl,
  );
  const activeHeaderLogo = siteConfig.logoSrc;
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
    if (activeTagId && !tags.some((tag) => tag.id === activeTagId)) {
      setActiveTagId(null);
    }
  }, [activeTagId, tags]);

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
              },
              dark: {
                desktopWallpaperAssetId: nextAppearanceDraft.dark.desktopWallpaperAssetId,
                mobileWallpaperAssetId: nextAppearanceDraft.dark.mobileWallpaperAssetId,
                fontPreset: nextAppearanceDraft.dark.fontPreset,
                fontSize: nextAppearanceDraft.dark.fontSize,
                overlayOpacity: nextAppearanceDraft.dark.overlayOpacity,
                textColor: nextAppearanceDraft.dark.textColor,
              },
            }),
          }),
          requestJson<AppSettings>("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lightLogoAssetId: nextSettingsDraft.lightLogoAssetId,
              darkLogoAssetId: nextSettingsDraft.darkLogoAssetId,
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
      appearanceDraft.dark.desktopWallpaperAssetId === appearances.dark.desktopWallpaperAssetId &&
      appearanceDraft.dark.mobileWallpaperAssetId === appearances.dark.mobileWallpaperAssetId &&
      appearanceDraft.dark.fontPreset === appearances.dark.fontPreset &&
      appearanceDraft.dark.fontSize === appearances.dark.fontSize &&
      appearanceDraft.dark.overlayOpacity === appearances.dark.overlayOpacity &&
      appearanceDraft.dark.textColor === appearances.dark.textColor;
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
      setSidebarCollapsed(false);
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

    try {
      if (tagForm.id) {
        await requestJson("/api/tags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...tagForm,
            logoUrl: tagForm.logoUrl.trim() || null,
          }),
        });
      } else {
        await requestJson("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...tagForm,
            logoUrl: tagForm.logoUrl.trim() || null,
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
        `${theme === "light" ? "明亮" : "暗黑"}主题${device === "desktop" ? "桌面" : "移动"}壁纸已上传。`,
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
        `${theme === "light" ? "明亮" : "暗黑"}主题${device === "desktop" ? "桌面" : "移动"}壁纸已通过链接更新。`,
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
      `${theme === "light" ? "明亮" : "暗黑"}主题${device === "desktop" ? "桌面" : "移动"}壁纸已移除。`,
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

  function queueTypographyNotice(theme: ThemeMode) {
    setPendingAppearanceNotice({
      key: `typography-${theme}`,
      message: `${theme === "light" ? "明亮" : "暗黑"}主题字体设置已保存。`,
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
      const width = event.active.rect.current.initial?.width ?? 0;
      const height = event.active.rect.current.initial?.height ?? 0;
      setActiveDragSize(width && height ? { width, height } : null);
    };
  }

  function handleDragCancel() {
    setActiveDrag(null);
    setActiveDragSize(null);
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
        <header className={cn("sticky top-0 z-20 flex w-full items-center justify-between px-4 py-4 transition-all duration-500 sm:px-6 lg:px-8", headerChromeClass)}>
          <button
            type="button"
            onClick={() => {
              setActiveTagId(null);
              setQuery("");
              setSearchMenuOpen(false);
            }}
            className="flex items-center gap-4"
          >
            <img
              src={activeHeaderLogo}
              alt={`${siteConfig.appName} logo`}
              className="h-14 w-14 rounded-[20px] border border-white/25 bg-white/18 object-cover shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
            />
            <div className="text-left leading-none">
              <h1 className="text-[1.6rem] font-semibold tracking-[-0.03em]">{siteConfig.appName}</h1>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={toggleEditMode}
                className={topActionButtonClass}
              >
                <span className={topActionIconClass}>
                  <PencilLine className="h-4 w-4" />
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
              "relative shrink-0 p-4 transition-all duration-500",
              sidebarChromeClass,
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
                      collapsed={sidebarCollapsed}
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
              <DragOverlay
                dropAnimation={dragTransition}
                style={{ transformOrigin: "0 0" }}
              >
                {activeDraggedTag ? (
                  <TagRowCard
                    tag={activeDraggedTag}
                    active
                    collapsed={false}
                    themeMode={themeMode}
                    wallpaperAware={hasActiveWallpaper}
                    overlay
                    style={
                      activeDragSize
                        ? {
                            width: activeDragSize.width,
                            minHeight: activeDragSize.height,
                          }
                        : undefined
                    }
                  >
                    <TagRowContent
                      tag={activeDraggedTag}
                      collapsed={false}
                      themeMode={themeMode}
                      wallpaperAware={hasActiveWallpaper}
                      editable={false}
                      draggable={false}
                    />
                  </TagRowCard>
                ) : null}
              </DragOverlay>
            </DndContext>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-5 text-center">
              <div className="w-full space-y-4">
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
                  className="mx-auto flex w-full max-w-[980px] min-[1280px]:max-w-[1120px] flex-col gap-3 rounded-[30px] border border-white/20 bg-white/12 p-3 sm:flex-row sm:items-center"
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
                  <div className="relative flex flex-1 items-center gap-3 rounded-2xl border border-white/18 bg-white/18 px-4 py-3">
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
                      <div className="absolute left-0 top-[calc(100%+10px)] z-20 w-full overflow-hidden rounded-3xl border border-white/16 bg-[#0f172ae8] p-2 text-left text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
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
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                                {suggestion.value.charAt(0)}
                              </span>
                              <span className="truncate">{suggestion.value}</span>
                            </span>
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
                          draggable={isAuthenticated && editMode && !effectiveQuery}
                          editable={isAuthenticated && editMode}
                          onEdit={() => openSiteEditor(site)}
                          onTagSelect={(tagId) => {
                            setActiveTagId(tagId);
                            setSearchMenuOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay
                    dropAnimation={dragTransition}
                    style={{ transformOrigin: "0 0" }}
                  >
                    {activeDraggedSite ? (
                      <SiteCardShell
                        site={activeDraggedSite}
                        overlay
                        style={
                          activeDragSize
                            ? {
                                width: activeDragSize.width,
                                minHeight: activeDragSize.height,
                              }
                            : undefined
                        }
                      >
                        <SiteCardContent
                          site={activeDraggedSite}
                          editable={false}
                          draggable={false}
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
                onUploadWallpaper={(theme, device, file) =>
                  void uploadAppearanceWallpaper(theme, device, file)
                }
                onOpenWallpaperUrlDialog={openWallpaperUrlDialog}
                onOpenWallpaperMenu={setAppearanceMenuTarget}
                onRemoveWallpaper={removeAppearanceWallpaper}
                onTriggerWallpaperFilePicker={triggerWallpaperFilePicker}
                onTypographyChange={queueTypographyNotice}
                onRestoreTypographyDefaults={restoreThemeTypographyDefaults}
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
                selectedFile={configImportFile}
                busyAction={configBusyAction}
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
                <div className="space-y-5">
                  {siteForm.id ? (
                    <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 text-sm text-white/70">
                      当前正在修改这个网站，保存后会立即同步到首页卡片和排序视图。
                    </div>
                  ) : null}
                  <SiteEditorForm
                    submitLabel={siteForm.id ? "保存网站" : "创建网站"}
                    siteForm={siteForm}
                    setSiteForm={setSiteForm}
                    tags={adminData?.tags ?? tags}
                    onSubmit={() => void submitSiteForm()}
                  />
                  {siteForm.id ? (
                    <button
                      type="button"
                      onClick={() => void deleteCurrentSite(siteForm.id as string)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/18 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-400/18"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除当前网站
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-5">
                  {tagForm.id ? (
                    <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 text-sm text-white/70">
                      当前正在修改这个标签，保存后会立即影响首页标签栏和筛选结果。
                    </div>
                  ) : null}
                  <TagEditorForm
                    submitLabel={tagForm.id ? "保存标签" : "创建标签"}
                    tagForm={tagForm}
                    setTagForm={setTagForm}
                    onSubmit={() => void submitTagForm()}
                  />
                  {tagForm.id ? (
                    <button
                      type="button"
                      onClick={() => void deleteCurrentTag(tagForm.id as string)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/18 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-400/18"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除当前标签
                    </button>
                  ) : null}
                </div>
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
                  onStartEdit={(site) => {
                    setSiteAdminGroup("edit");
                    setSiteForm({
                      id: site.id,
                      name: site.name,
                      url: site.url,
                      description: site.description,
                      iconUrl: site.iconUrl ?? "",
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
                  onUploadWallpaper={(theme, device, file) =>
                    void uploadAppearanceWallpaper(theme, device, file)
                  }
                  onOpenWallpaperUrlDialog={openWallpaperUrlDialog}
                  onOpenWallpaperMenu={setAppearanceMenuTarget}
                  onRemoveWallpaper={removeAppearanceWallpaper}
                  onTriggerWallpaperFilePicker={triggerWallpaperFilePicker}
                  onTypographyChange={queueTypographyNotice}
                  onRestoreTypographyDefaults={restoreThemeTypographyDefaults}
                />
              ) : null}
              {adminSection === "config" ? (
                <ConfigAdminPanel
                  selectedFile={configImportFile}
                  busyAction={configBusyAction}
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

function SortableTagRow({
  tag,
  active,
  collapsed,
  themeMode,
  wallpaperAware,
  draggable,
  editable,
  onEdit,
  onSelect,
}: {
  tag: Tag;
  active: boolean;
  collapsed: boolean;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  draggable: boolean;
  editable: boolean;
  onEdit: () => void;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
    disabled: !draggable,
    animateLayoutChanges: defaultAnimateLayoutChanges,
    transition: dragTransition,
  });

  return (
    <TagRowCard
      ref={setNodeRef}
      tag={tag}
      active={active}
      collapsed={collapsed}
      themeMode={themeMode}
      wallpaperAware={wallpaperAware}
      dragging={isDragging}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <TagRowContent
        tag={tag}
        collapsed={collapsed}
        themeMode={themeMode}
        wallpaperAware={wallpaperAware}
        editable={editable}
        draggable={draggable}
        onSelect={onSelect}
        onEdit={onEdit}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </TagRowCard>
  );
}

function SortableSiteCard({
  site,
  index,
  viewEpoch,
  draggable,
  editable,
  onEdit,
  onTagSelect,
}: {
  site: Site;
  index: number;
  viewEpoch: number;
  draggable: boolean;
  editable: boolean;
  onEdit: () => void;
  onTagSelect: (tagId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: site.id,
    disabled: !draggable,
    animateLayoutChanges: defaultAnimateLayoutChanges,
    transition: dragTransition,
  });

  return (
    <SiteCardShell
      ref={setNodeRef}
      site={site}
      dragging={isDragging}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      data-view-epoch={viewEpoch}
    >
      <SiteCardContent
        site={site}
        editable={editable}
        draggable={draggable}
        onEdit={onEdit}
        onTagSelect={onTagSelect}
        enterDelay={`${Math.min(index * 45, 220)}ms`}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </SiteCardShell>
  );
}

function TagRowContent({
  tag,
  collapsed,
  themeMode,
  wallpaperAware,
  editable,
  draggable,
  onSelect,
  onEdit,
  dragHandleProps,
}: {
  tag: Tag;
  collapsed: boolean;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  editable: boolean;
  draggable: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  const tagMediaClass = wallpaperAware
    ? themeMode === "light"
      ? "border-slate-900/8 bg-white/34 text-slate-700"
      : "border-white/14 bg-white/10 text-white/92"
    : "border-white/14 bg-white/14";
  const tagActionButtonClass = wallpaperAware
    ? themeMode === "light"
      ? "border-slate-900/8 bg-white/30 hover:bg-white/42"
      : "border-white/14 bg-white/10 hover:bg-white/16"
    : "border-white/12 bg-white/10 hover:bg-white/18";

  return (
    <>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 text-left transition active:scale-[0.985]",
          collapsed ? "justify-center" : "",
        )}
      >
        {tag.logoUrl ? (
          <img
            src={tag.logoUrl}
            alt={`${tag.name} logo`}
            className={cn("h-10 w-10 rounded-2xl object-cover", tagMediaClass)}
          />
        ) : (
          <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold", tagMediaClass)}>
            {tag.name.charAt(0)}
          </span>
        )}
        {!collapsed ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{tag.name}</span>
            <span className="block text-xs opacity-65">{tag.siteCount} 个站点</span>
          </span>
        ) : null}
      </button>
      {!collapsed && (editable || draggable) ? (
        <div className="flex items-center gap-2">
          {editable ? (
            <button
              type="button"
              onClick={onEdit}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                tagActionButtonClass,
              )}
            >
              <PencilLine className="h-4 w-4 opacity-80" />
            </button>
          ) : null}
          {draggable ? (
            <button
              type="button"
              className={cn(
                "cursor-grab rounded-2xl border p-2 transition active:cursor-grabbing",
                tagActionButtonClass,
              )}
              style={{ touchAction: "none" }}
              {...dragHandleProps}
            >
              <GripVertical className="h-4 w-4 opacity-70" />
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function SiteCardContent({
  site,
  editable,
  draggable,
  onEdit,
  onTagSelect,
  enterDelay,
  reserveActionSpace = false,
  dragHandleProps,
}: {
  site: Site;
  editable: boolean;
  draggable: boolean;
  onEdit?: () => void;
  onTagSelect?: (tagId: string) => void;
  enterDelay?: string;
  reserveActionSpace?: boolean;
  dragHandleProps?: Record<string, unknown>;
}) {
  return (
    <div
      className="animate-card-enter relative flex h-full flex-col gap-5"
      style={enterDelay ? { animationDelay: enterDelay } : undefined}
    >
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
        {editable || draggable || reserveActionSpace ? (
          <div className="flex shrink-0 items-center gap-2">
            {editable ? (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/10 transition hover:bg-white/18"
              >
                <PencilLine className="h-4 w-4 opacity-80" />
              </button>
            ) : null}
            {draggable ? (
              <button
                type="button"
                className="cursor-grab inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/10 transition hover:bg-white/18 active:cursor-grabbing"
                style={{ touchAction: "none" }}
                {...dragHandleProps}
              >
                <GripVertical className="h-4 w-4 opacity-70" />
              </button>
            ) : null}
            {!editable && !draggable && reserveActionSpace ? (
              <>
                <span className="inline-flex h-11 w-11 rounded-2xl opacity-0" aria-hidden="true" />
                <span className="inline-flex h-11 w-11 rounded-2xl opacity-0" aria-hidden="true" />
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        {site.tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onTagSelect?.(tag.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition hover:-translate-y-0.5 hover:bg-white/16",
              tag.isHidden
                ? "border-amber-200/28 bg-amber-300/16 text-amber-50"
                : "border-white/12 bg-white/10",
            )}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}

const TagRowCard = forwardRef<
  HTMLElement,
  ComponentPropsWithoutRef<"article"> & {
    tag: Tag;
    active: boolean;
    collapsed: boolean;
    themeMode: ThemeMode;
    wallpaperAware: boolean;
    dragging?: boolean;
    overlay?: boolean;
  }
>(function TagRowCardInner(
  {
    tag,
    active,
    collapsed,
    themeMode,
    wallpaperAware,
    dragging = false,
    overlay = false,
    children,
    className,
    ...props
  },
  ref,
) {
  void tag;
  const activeCardClass = wallpaperAware
    ? themeMode === "light"
      ? "border-slate-900/12 bg-white/42 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-[22px]"
      : "border-white/16 bg-white/14 shadow-[0_20px_44px_rgba(2,6,23,0.2)] backdrop-blur-[24px]"
    : "border-white/24 bg-white/24 shadow-lg";
  const idleCardClass = wallpaperAware
    ? themeMode === "light"
      ? "border-slate-900/8 bg-white/26 hover:bg-white/34 shadow-[0_12px_26px_rgba(148,163,184,0.08)] backdrop-blur-[20px]"
      : "border-white/12 bg-white/8 hover:bg-white/12 shadow-[0_14px_28px_rgba(2,6,23,0.14)] backdrop-blur-[22px]"
    : "border-white/10 bg-white/8 hover:bg-white/16";
  return (
    <article
      {...props}
      ref={ref}
      className={cn(
        "flex w-full items-center gap-3 rounded-[24px] border px-3 py-3 text-left transition duration-200 will-change-transform",
        active ? activeCardClass : idleCardClass,
        collapsed ? "justify-center" : "justify-between",
        dragging
          ? overlay
            ? "z-20 scale-[1.02] border-white/28 bg-white/22 shadow-[0_24px_72px_rgba(15,23,42,0.3)]"
            : "border-dashed border-white/18 bg-white/4 opacity-0"
          : "",
        overlay ? "min-w-[260px]" : "",
        className,
      )}
    >
      {children}
    </article>
  );
});

const SiteCardShell = forwardRef<
  HTMLElement,
  ComponentPropsWithoutRef<"article"> & {
    site: Site;
    dragging?: boolean;
    overlay?: boolean;
  }
>(function SiteCardShellInner(
  { site, dragging = false, overlay = false, children, className, ...props },
  ref,
) {
  void site;
  return (
    <article
      {...props}
      ref={ref}
      className={cn(
        "group relative isolate overflow-hidden rounded-[30px] border border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] p-5 shadow-[0_18px_70px_rgba(15,23,42,0.14)] transition duration-200 will-change-transform hover:-translate-y-1 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.1))] active:scale-[0.985]",
        dragging
          ? overlay
            ? "z-20 scale-[1.015] border-white/24 bg-[linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.12))] shadow-[0_28px_90px_rgba(15,23,42,0.28)]"
            : "border-dashed border-white/18 bg-white/4 opacity-0"
          : "",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.12),transparent_34%,transparent_68%,rgba(255,255,255,0.06))] opacity-55" />
      {children}
    </article>
  );
});

function NotificationToast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: (toastId: number) => void;
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => onClose(toast.id), toast.durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [onClose, toast.durationMs, toast.id]);

  return (
    <div className="pointer-events-auto relative">
      {toast.count > 1 ? (
        <>
          <div
            className={cn(
              "animate-toast-stack-shadow absolute inset-x-4 top-3 h-full rounded-[24px] border opacity-55",
              toast.tone === "success"
                ? "border-emerald-200/16 bg-emerald-400/8"
                : "border-rose-200/16 bg-rose-400/8",
            )}
          />
          <div
            className={cn(
              "animate-toast-stack-shadow absolute inset-x-2 top-1.5 h-full rounded-[25px] border opacity-72",
              toast.tone === "success"
                ? "border-emerald-200/18 bg-emerald-400/10"
                : "border-rose-200/18 bg-rose-400/10",
            )}
          />
        </>
      ) : null}
      <div
        className={cn(
          "animate-drawer-slide relative rounded-[26px] border px-5 py-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl",
          toast.count > 1 ? "animate-toast-stack-pop" : "",
          toast.tone === "success"
            ? "border-emerald-200/24 bg-[linear-gradient(135deg,rgba(16,185,129,0.2),rgba(15,23,42,0.92))]"
            : "border-rose-200/24 bg-[linear-gradient(135deg,rgba(244,63,94,0.18),rgba(15,23,42,0.92))]",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-white",
              toast.tone === "success"
                ? "border-emerald-200/20 bg-emerald-400/16 text-emerald-50"
                : "border-rose-200/20 bg-rose-400/16 text-rose-50",
            )}
          >
            {toast.tone === "success" ? (
              <CircleCheckBig className="h-5 w-5" />
            ) : (
              <CircleAlert className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "text-sm font-semibold tracking-[0.08em]",
                  toast.tone === "success" ? "text-emerald-50/84" : "text-rose-50/84",
                )}
              >
                {toast.title}
              </p>
              {toast.count > 1 ? (
                <span className="animate-toast-stack-pop inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/16 bg-white/10 px-2 text-[11px] font-semibold text-white/88">
                  x{toast.count}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-6 text-white/88">{toast.description}</p>
          </div>
          <button
            type="button"
            onClick={() => onClose(toast.id)}
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/78 transition hover:bg-white/10 hover:text-white"
            aria-label="关闭通知"
          >
            <svg
              viewBox="0 0 44 44"
              className="pointer-events-none absolute inset-0 -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="2.5"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="113.1"
                strokeDashoffset="0"
                style={{ animation: `toast-ring-drain ${toast.durationMs}ms linear forwards` }}
              />
            </svg>
            <X className="relative z-10 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigConfirmDialog({
  action,
  password,
  error,
  busy,
  onPasswordChange,
  onClose,
  onSubmit,
}: {
  action: ConfigConfirmAction;
  password: string;
  error: string;
  busy: boolean;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const title = configActionLabels[action];

  return (
    <div className="animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/52 p-4 backdrop-blur-sm sm:items-center">
      <div className="animate-panel-rise w-full max-w-[460px] overflow-hidden rounded-[30px] border border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Password Check</p>
            <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-7 text-white/72">
            请输入当前账号密码，以确认{title}。密码会以密文方式输入，本次只用于当前操作校验。
          </div>

          <label className="grid gap-2 text-sm">
            <span className="text-white/78">确认密码</span>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="请输入当前账号密码"
              className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-sky-300/55 focus:bg-white/10"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-medium text-white/84 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-55"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              确认并继续
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminSubsection({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/6">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/8"
      >
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-white/65">{description}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/8 transition",
            open ? "rotate-180" : "",
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      {open ? <div className="border-t border-white/10 px-5 py-5">{children}</div> : null}
    </section>
  );
}

function SitesAdminPanel({
  adminData,
  tags,
  siteForm,
  setSiteForm,
  activeGroup,
  setActiveGroup,
  onSubmit,
  onStartEdit,
  onDelete,
}: {
  adminData: AdminBootstrap | null;
  tags: Tag[];
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  activeGroup: AdminGroup;
  setActiveGroup: Dispatch<SetStateAction<AdminGroup>>;
  onSubmit: () => void;
  onStartEdit: (site: Site) => void;
  onDelete: (siteId: string) => void;
}) {
  const availableTags = adminData?.tags ?? tags;
  const availableSites = adminData?.sites ?? [];

  return (
    <div className="space-y-6">
      <AdminSubsection
        title="新增网站"
        description="新建一个导航网站，并关联它所属的标签。"
        open={activeGroup === "create"}
        onToggle={() => {
          setActiveGroup("create");
          setSiteForm(defaultSiteForm);
        }}
      >
        <SiteEditorForm
          submitLabel="创建网站"
          siteForm={siteForm}
          setSiteForm={setSiteForm}
          tags={availableTags}
          onSubmit={onSubmit}
        />
      </AdminSubsection>

      <AdminSubsection
        title="修改网站"
        description="先展开列表，再选择一个网站进入编辑。"
        open={activeGroup === "edit"}
        onToggle={() => setActiveGroup("edit")}
      >
        <div className="space-y-4">
          {siteForm.id ? (
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold">正在编辑：{siteForm.name || "未命名网站"}</h4>
                  <p className="mt-1 text-sm text-white/65">修改后会立即覆盖当前网站配置。</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-white/70 hover:text-white"
                  onClick={() => {
                    setSiteForm(defaultSiteForm);
                    setActiveGroup("create");
                  }}
                >
                  取消编辑
                </button>
              </div>
              <SiteEditorForm
                submitLabel="保存修改"
                siteForm={siteForm}
                setSiteForm={setSiteForm}
                tags={availableTags}
                onSubmit={onSubmit}
              />
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/12 bg-white/4 px-4 py-4 text-sm text-white/60">
              从下方列表选择一个网站后，这里会展开它的编辑表单。
            </div>
          )}

          <div className="space-y-3">
            {availableSites.map((site) => (
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
                      onClick={() => onStartEdit(site)}
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
          </div>
        </div>
      </AdminSubsection>
    </div>
  );
}

function SiteEditorForm({
  siteForm,
  setSiteForm,
  tags,
  submitLabel,
  onSubmit,
}: {
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  tags: Tag[];
  submitLabel: string;
  onSubmit: () => void;
}) {
  return (
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
          {tags.map((tag) => (
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
        {submitLabel === "创建网站" ? <Plus className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
        {submitLabel}
      </button>
    </div>
  );
}

function TagsAdminPanel({
  adminData,
  tags,
  tagForm,
  setTagForm,
  activeGroup,
  setActiveGroup,
  onSubmit,
  onStartEdit,
  onDelete,
}: {
  adminData: AdminBootstrap | null;
  tags: Tag[];
  tagForm: TagFormState;
  setTagForm: Dispatch<SetStateAction<TagFormState>>;
  activeGroup: AdminGroup;
  setActiveGroup: Dispatch<SetStateAction<AdminGroup>>;
  onSubmit: () => void;
  onStartEdit: (tag: Tag) => void;
  onDelete: (tagId: string) => void;
}) {
  const availableTags = adminData?.tags ?? tags;

  return (
    <div className="space-y-6">
      <AdminSubsection
        title="新增标签"
        description="创建新的标签，并可决定它是否只在登录态下可见。"
        open={activeGroup === "create"}
        onToggle={() => {
          setActiveGroup("create");
          setTagForm(defaultTagForm);
        }}
      >
        <TagEditorForm
          submitLabel="创建标签"
          tagForm={tagForm}
          setTagForm={setTagForm}
          onSubmit={onSubmit}
        />
      </AdminSubsection>

      <AdminSubsection
        title="修改标签"
        description="展开后可选择标签进行编辑，或直接删除不需要的标签。"
        open={activeGroup === "edit"}
        onToggle={() => setActiveGroup("edit")}
      >
        <div className="space-y-4">
          {tagForm.id ? (
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold">正在编辑：{tagForm.name || "未命名标签"}</h4>
                  <p className="mt-1 text-sm text-white/65">修改后会立即影响标签显示与权限。</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-white/70 hover:text-white"
                  onClick={() => {
                    setTagForm(defaultTagForm);
                    setActiveGroup("create");
                  }}
                >
                  取消编辑
                </button>
              </div>
              <TagEditorForm
                submitLabel="保存标签"
                tagForm={tagForm}
                setTagForm={setTagForm}
                onSubmit={onSubmit}
              />
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/12 bg-white/4 px-4 py-4 text-sm text-white/60">
              从下方列表选择一个标签后，这里会展开它的编辑表单。
            </div>
          )}

          <div className="space-y-3">
            {availableTags.map((tag) => (
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
                    onClick={() => onStartEdit(tag)}
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
          </div>
        </div>
      </AdminSubsection>
    </div>
  );
}

function TagEditorForm({
  tagForm,
  setTagForm,
  submitLabel,
  onSubmit,
}: {
  tagForm: TagFormState;
  setTagForm: Dispatch<SetStateAction<TagFormState>>;
  submitLabel: string;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-3">
      <input
        value={tagForm.name}
        onChange={(event) =>
          setTagForm((current) => ({ ...current, name: event.target.value }))
        }
        placeholder="标签名"
        className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm outline-none placeholder:text-white/35"
      />
      <input
        value={tagForm.logoUrl}
        onChange={(event) =>
          setTagForm((current) => ({ ...current, logoUrl: event.target.value }))
        }
        placeholder="标签 Logo URL（可空）"
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
        {submitLabel === "创建标签" ? <Plus className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
        {submitLabel}
      </button>
    </div>
  );
}

function WallpaperSlotCard({
  label,
  imageUrl,
  uploading,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  onUploadLocal,
  onUploadByUrl,
  onRemove,
}: {
  label: string;
  imageUrl: string | null;
  uploading: boolean;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onUploadLocal: () => void;
  onUploadByUrl: () => void;
  onRemove: () => void;
}) {
  const hasImage = Boolean(imageUrl);
  const slotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!slotRef.current?.contains(event.target as Node)) {
        onCloseMenu();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen, onCloseMenu]);

  return (
    <div ref={slotRef} className="relative">
      <div className="relative flex h-36 items-center justify-center overflow-visible rounded-2xl border border-dashed border-white/12 bg-white/4">
        {hasImage ? (
          <>
            <img src={imageUrl!} alt={label} className="h-full w-full rounded-2xl object-cover" />
            <div className="absolute right-3 top-3 z-20">
              <button
                type="button"
                onClick={onOpenMenu}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/16 bg-slate-950/42 text-white shadow-lg backdrop-blur-xl transition hover:bg-slate-950/60"
              >
                <EllipsisVertical className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-3xl border border-white/14 bg-[#0f172ae8] p-2 text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={onUploadLocal}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:bg-white/10"
                  >
                    <Upload className="h-4 w-4" />
                    本地上传
                  </button>
                  <button
                    type="button"
                    onClick={onUploadByUrl}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:bg-white/10"
                  >
                    <Search className="h-4 w-4" />
                    壁纸 URL
                  </button>
                  <button
                    type="button"
                    onClick={onRemove}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-rose-100 transition hover:bg-rose-500/18"
                  >
                    <Trash2 className="h-4 w-4" />
                    移除壁纸
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="relative z-20">
            <button
              type="button"
              onClick={onOpenMenu}
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/18 bg-white/8 text-white/88 transition hover:bg-white/14"
              aria-label={`添加${label}`}
            >
              <Plus className="h-6 w-6" />
            </button>
            {menuOpen ? (
              <div className="absolute left-1/2 top-full z-30 mt-3 w-48 -translate-x-1/2 overflow-hidden rounded-3xl border border-white/14 bg-[#0f172ae8] p-2 text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={onUploadLocal}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:bg-white/10"
                >
                  <Upload className="h-4 w-4" />
                  本地上传
                </button>
                <button
                  type="button"
                  onClick={onUploadByUrl}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:bg-white/10"
                >
                  <Search className="h-4 w-4" />
                  壁纸 URL
                </button>
              </div>
            ) : null}
          </div>
        )}

        {uploading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-950/42 text-xs text-white/78 backdrop-blur-sm">
            壁纸上传处理中...
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WallpaperUrlDialog({
  target,
  value,
  error,
  busy,
  onValueChange,
  onClose,
  onSubmit,
}: {
  target: WallpaperTarget;
  value: string;
  error: string;
  busy: boolean;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/52 p-4 backdrop-blur-sm sm:items-center">
      <div className="animate-panel-rise w-full max-w-[520px] overflow-hidden rounded-[30px] border border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Wallpaper URL</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {target.theme === "light" ? "明亮" : "暗黑"}主题{target.device === "desktop" ? "桌面" : "移动"}壁纸
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <label className="grid gap-2 text-sm">
            <span className="text-white/78">壁纸 URL</span>
            <input
              autoFocus
              type="url"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="https://example.com/wallpaper.jpg"
              className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-sky-300/55 focus:bg-white/10"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-medium text-white/84 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-55"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              确认上传
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function AppearanceAdminPanel({
  appearanceThemeTab,
  setAppearanceThemeTab,
  appearanceDraft,
  setAppearanceDraft,
  uploadingTheme,
  appearanceMenuTarget,
  desktopWallpaperInputRef,
  mobileWallpaperInputRef,
  onUploadWallpaper,
  onOpenWallpaperUrlDialog,
  onOpenWallpaperMenu,
  onRemoveWallpaper,
  onTriggerWallpaperFilePicker,
  onTypographyChange,
  onRestoreTypographyDefaults,
}: {
  appearanceThemeTab: AppearanceThemeTab;
  setAppearanceThemeTab: Dispatch<SetStateAction<AppearanceThemeTab>>;
  appearanceDraft: AppearanceDraft;
  setAppearanceDraft: Dispatch<SetStateAction<AppearanceDraft>>;
  uploadingTheme: ThemeMode | null;
  appearanceMenuTarget: WallpaperTarget | null;
  desktopWallpaperInputRef: RefObject<HTMLInputElement | null>;
  mobileWallpaperInputRef: RefObject<HTMLInputElement | null>;
  onUploadWallpaper: (theme: ThemeMode, device: WallpaperDevice, file: File) => void;
  onOpenWallpaperUrlDialog: (target: WallpaperTarget) => void;
  onOpenWallpaperMenu: Dispatch<SetStateAction<WallpaperTarget | null>>;
  onRemoveWallpaper: (theme: ThemeMode, device: WallpaperDevice) => void;
  onTriggerWallpaperFilePicker: (device: WallpaperDevice) => void;
  onTypographyChange: (theme: ThemeMode) => void;
  onRestoreTypographyDefaults: (theme: ThemeMode) => void;
}) {
  const theme = appearanceThemeTab;
  const wallpaperMenuFor = (device: WallpaperDevice) =>
    appearanceMenuTarget?.theme === theme && appearanceMenuTarget.device === device;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["light", "dark"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setAppearanceThemeTab(mode);
              onOpenWallpaperMenu(null);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition",
              appearanceThemeTab === mode
                ? "bg-white text-slate-950"
                : "border border-white/12 bg-white/6 text-white/80 hover:bg-white/12",
            )}
          >
            {mode === "light" ? "明亮主题" : "暗黑主题"}
          </button>
        ))}
      </div>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <h3 className="text-lg font-semibold">壁纸</h3>
        <p className="mt-1 text-sm text-white/65">
          支持桌面端和移动端使用不同壁纸，界面会自动应用更协调的氛围承托。
        </p>
        <div className="mt-4 grid gap-4">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="grid gap-2 text-sm">
              <span className="text-white/75">桌面端壁纸</span>
              <input
                ref={desktopWallpaperInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadWallpaper(theme, "desktop", file);
                  }
                  event.currentTarget.value = "";
                }}
                className="hidden"
              />
              <WallpaperSlotCard
                label="桌面端壁纸"
                imageUrl={appearanceDraft[theme].desktopWallpaperUrl}
                uploading={uploadingTheme === theme}
                menuOpen={wallpaperMenuFor("desktop")}
                onOpenMenu={() =>
                  onOpenWallpaperMenu((current) =>
                    current?.theme === theme && current.device === "desktop"
                      ? null
                      : { theme, device: "desktop" },
                  )
                }
                onCloseMenu={() => onOpenWallpaperMenu(null)}
                onUploadLocal={() => onTriggerWallpaperFilePicker("desktop")}
                onUploadByUrl={() => onOpenWallpaperUrlDialog({ theme, device: "desktop" })}
                onRemove={() => onRemoveWallpaper(theme, "desktop")}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="grid gap-2 text-sm">
              <span className="text-white/75">移动端壁纸</span>
              <input
                ref={mobileWallpaperInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadWallpaper(theme, "mobile", file);
                  }
                  event.currentTarget.value = "";
                }}
                className="hidden"
              />
              <WallpaperSlotCard
                label="移动端壁纸"
                imageUrl={appearanceDraft[theme].mobileWallpaperUrl}
                uploading={uploadingTheme === theme}
                menuOpen={wallpaperMenuFor("mobile")}
                onOpenMenu={() =>
                  onOpenWallpaperMenu((current) =>
                    current?.theme === theme && current.device === "mobile"
                      ? null
                      : { theme, device: "mobile" },
                  )
                }
                onCloseMenu={() => onOpenWallpaperMenu(null)}
                onUploadLocal={() => onTriggerWallpaperFilePicker("mobile")}
                onUploadByUrl={() => onOpenWallpaperUrlDialog({ theme, device: "mobile" })}
                onRemove={() => onRemoveWallpaper(theme, "mobile")}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">字体样式与颜色</h3>
            <p className="mt-1 text-sm text-white/65">
              调整当前主题下的文字气质和前景颜色。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRestoreTypographyDefaults(theme)}
            className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/8 px-4 py-2 text-sm text-white/82 transition hover:bg-white/14"
          >
            恢复默认
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="text-white/75">字体预设</span>
            <select
              value={appearanceDraft[theme].fontPreset}
              onChange={(event) => {
                setAppearanceDraft((current) => ({
                  ...current,
                  [theme]: {
                    ...current[theme],
                    fontPreset: event.target.value as FontPresetKey,
                  },
                }));
                onTypographyChange(theme);
              }}
              style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
              className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-slate-900 outline-none"
            >
              {Object.entries(fontPresets).map(([key, value]) => (
                <option
                  key={key}
                  value={key}
                  style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
                >
                  {value.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-white/75">字体大小</span>
            <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
              <div className="mb-3 flex items-center justify-between text-sm text-white/70">
                <span>全站基础字号</span>
                <span>{appearanceDraft[theme].fontSize}px</span>
              </div>
              <input
                type="range"
                min={12}
                max={24}
                step={1}
                value={appearanceDraft[theme].fontSize}
                onChange={(event) => {
                  setAppearanceDraft((current) => ({
                    ...current,
                    [theme]: {
                      ...current[theme],
                      fontSize: Number(event.target.value),
                    },
                  }));
                  onTypographyChange(theme);
                }}
                className="h-2 w-full cursor-pointer accent-white"
              />
            </div>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-white/75">文字颜色</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 px-3 py-3">
              <input
                type="color"
                value={appearanceDraft[theme].textColor}
                onChange={(event) => {
                  setAppearanceDraft((current) => ({
                    ...current,
                    [theme]: {
                      ...current[theme],
                      textColor: event.target.value,
                    },
                  }));
                  onTypographyChange(theme);
                }}
                className="h-12 w-16 rounded-2xl border border-white/12 bg-white/8 px-1"
              />
              <span className="text-sm text-white/70">{appearanceDraft[theme].textColor}</span>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}

function ConfigAdminPanel({
  selectedFile,
  busyAction,
  onFileChange,
  onExport,
  onImport,
  onReset,
}: {
  selectedFile: File | null;
  busyAction: "import" | "export" | "reset" | null;
  onFileChange: Dispatch<SetStateAction<File | null>>;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-white/10 bg-white/6 p-5">
        <div className="mb-5">
          <h3 className="text-lg font-semibold">导出配置</h3>
          <p className="mt-1 text-sm text-white/65">
            导出当前的网站、标签、外观和壁纸资源为压缩包，不包含账号和密码。点击后会再次要求输入密码确认。
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={busyAction !== null}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "export" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          导出压缩包
        </button>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/6 p-5">
        <div className="mb-5">
          <h3 className="text-lg font-semibold">导入配置</h3>
          <p className="mt-1 text-sm text-white/65">
            一键导入之前导出的压缩包，会覆盖现有网站、标签、外观和壁纸，但不会覆盖账号密码。点击后会再次要求输入密码确认。
          </p>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="text-white/75">选择配置压缩包</span>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-slate-900"
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/72">
            {selectedFile
              ? `已选择：${selectedFile.name}`
              : "还没有选择压缩包。请先选择由 SakuraNav 导出的配置文件。"}
          </div>

          <button
            type="button"
            onClick={onImport}
            disabled={busyAction !== null || !selectedFile}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === "import" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            导入压缩包
          </button>
        </div>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/6 p-5">
        <div className="mb-5">
          <h3 className="text-lg font-semibold">恢复默认</h3>
          <p className="mt-1 text-sm text-white/65">
            重置网站、标签、主题外观、壁纸与站点 Logo，账号和密码不会被修改。点击后会再次要求输入密码确认。
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={busyAction !== null}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "reset" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          恢复默认
        </button>
      </section>
    </div>
  );
}
