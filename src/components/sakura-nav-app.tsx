/**
 * SakuraNav 主应用组件
 * @description 导航站的核心编排组件，整合各子模块
 */

"use client";

import {
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { fontPresets, siteConfig, DEFAULT_SEARCH_ENGINE_CONFIGS, themeAppearanceDefaults } from "@/lib/config";
import type {
  AppSettings,
  AdminBootstrap,
  PaginatedSites,
  SearchEngineConfig,
  SessionUser,
  Site,
  Tag,
  ThemeAppearance,
  ThemeMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { getThemeLabel, getThemeDeviceLabel, getThemeAssetLabel } from "@/lib/theme-styles";
import { useSearchBar } from "@/hooks/use-search-bar";
import { useToastNotify } from "@/hooks/use-toast-notify";
import { SearchEngineEditor } from "@/components/admin/search-engine-editor";
import { FloatingSearchDialog, ConfigConfirmDialog, WallpaperUrlDialog, AssetUrlDialog, configActionLabels } from "@/components/dialogs";
import { defaultSiteForm, defaultTagForm } from "@/components/admin";
import type { SiteFormState, TagFormState, AppearanceDraft, AdminGroup } from "@/components/admin";
import type { ConfigConfirmAction } from "@/components/dialogs/config-confirm-dialog";
import type { WallpaperTarget, WallpaperDevice } from "@/components/dialogs/wallpaper-url-dialog";
import type { AssetTarget, AssetKind } from "@/components/dialogs/asset-url-dialog";
import {
  BackgroundLayer,
  AppHeader,
  SidebarTags,
  SearchBarSection,
  SiteContentArea,
  SiteFooter,
  FloatingActions,
  ToastLayer,
  AppearanceDrawer,
  ConfigDrawer,
  EditorModal,
  AdminDrawer,
} from "@/components/sakura-nav";

/* ============================================ */
/* Types                                        */
/* ============================================ */

type Props = {
  initialTags: Tag[];
  initialAppearances: Record<ThemeMode, ThemeAppearance>;
  initialSettings: AppSettings;
  initialSession: SessionUser | null;
  defaultTheme: ThemeMode;
};

type DragKind = "tag" | "site";

const dragTransition = {
  duration: 240,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

/* ============================================ */
/* Helper: build appearance draft from data     */
/* ============================================ */

function buildAppearanceDraft(appearances: Record<ThemeMode, ThemeAppearance>): AppearanceDraft {
  return {
    light: {
      desktopWallpaperAssetId: appearances.light.desktopWallpaperAssetId,
      desktopWallpaperUrl: appearances.light.desktopWallpaperUrl,
      mobileWallpaperAssetId: appearances.light.mobileWallpaperAssetId,
      mobileWallpaperUrl: appearances.light.mobileWallpaperUrl,
      fontPreset: appearances.light.fontPreset,
      fontSize: appearances.light.fontSize,
      overlayOpacity: appearances.light.overlayOpacity,
      textColor: appearances.light.textColor,
      logoAssetId: appearances.light.logoAssetId ?? null,
      logoUrl: appearances.light.logoUrl ?? null,
      faviconAssetId: appearances.light.faviconAssetId ?? null,
      faviconUrl: appearances.light.faviconUrl ?? null,
      desktopCardFrosted: appearances.light.desktopCardFrosted ?? false,
      mobileCardFrosted: appearances.light.mobileCardFrosted ?? false,
      isDefault: appearances.light.isDefault ?? false,
    },
    dark: {
      desktopWallpaperAssetId: appearances.dark.desktopWallpaperAssetId,
      desktopWallpaperUrl: appearances.dark.desktopWallpaperUrl,
      mobileWallpaperAssetId: appearances.dark.mobileWallpaperAssetId,
      mobileWallpaperUrl: appearances.dark.mobileWallpaperUrl,
      fontPreset: appearances.dark.fontPreset,
      fontSize: appearances.dark.fontSize,
      overlayOpacity: appearances.dark.overlayOpacity,
      textColor: appearances.dark.textColor,
      logoAssetId: appearances.dark.logoAssetId ?? null,
      logoUrl: appearances.dark.logoUrl ?? null,
      faviconAssetId: appearances.dark.faviconAssetId ?? null,
      faviconUrl: appearances.dark.faviconUrl ?? null,
      desktopCardFrosted: appearances.dark.desktopCardFrosted ?? false,
      mobileCardFrosted: appearances.dark.mobileCardFrosted ?? false,
      isDefault: appearances.dark.isDefault ?? true,
    },
  };
}

/* ============================================ */
/* Main Component                               */
/* ============================================ */

export function SakuraNavApp({
  initialTags,
  initialAppearances,
  initialSettings,
  initialSession,
  defaultTheme,
}: Props) {
  /* ---------- 主题 ---------- */
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = window.localStorage.getItem("sakura-theme");
    if (stored === "light" || stored === "dark") return stored;
    return defaultTheme;
  });
  useEffect(() => {
    window.localStorage.setItem("sakura-theme", themeMode);
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  /* ---------- 基础状态 ---------- */
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialSession?.isAuthenticated));
  const [tags, setTags] = useState(initialTags);
  const [appearances, setAppearances] = useState(initialAppearances);
  const [settings, setSettings] = useState(initialSettings);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [mobileTagsOpen, setMobileTagsOpen] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [floatingSearchOpen, setFloatingSearchOpen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  /* ---------- 搜索引擎配置 ---------- */
  const [engineConfigs, setEngineConfigs] = useState<SearchEngineConfig[]>(() => {
    if (typeof window === "undefined") return DEFAULT_SEARCH_ENGINE_CONFIGS;
    try {
      const stored = window.localStorage.getItem("sakura-search-engines");
      if (stored) { const parsed = JSON.parse(stored); if (Array.isArray(parsed) && parsed.length > 0) return parsed; }
    } catch { /* ignore */ }
    return DEFAULT_SEARCH_ENGINE_CONFIGS;
  });
  const [engineEditorOpen, setEngineEditorOpen] = useState(false);
  useEffect(() => { try { window.localStorage.setItem("sakura-search-engines", JSON.stringify(engineConfigs)); } catch { /* ignore */ } }, [engineConfigs]);

  /* ---------- 搜索栏 ---------- */
  const searchBar = useSearchBar({ engines: engineConfigs });

  /* ---------- 主题切换（需在 searchBar 之后） ---------- */
  const toggleThemeMode = useCallback(() => {
    searchBar.setSearchMenuOpen(false);
    setThemeMode((c) => (c === "light" ? "dark" : "light"));
  }, [searchBar.setSearchMenuOpen]);

  /* ---------- Toast ---------- */
  const { toasts, dismissToast, setMessage, setErrorMessage } = useToastNotify();

  /* ---------- 站点列表 ---------- */
  const [siteList, setSiteList] = useState<PaginatedSites>({ items: [], nextCursor: null, total: 0 });
  const [listState, setListState] = useState<"loading" | "refreshing" | "ready" | "loading-more" | "error">("loading");
  const [viewEpoch, setViewEpoch] = useState(0);
  const [localSearchClosing, setLocalSearchClosing] = useState(false);
  const deferredQuery = useDeferredValue((searchBar.localSearchActive ? searchBar.localSearchQuery : "").trim());
  const [debouncedQuery, setDebouncedQuery] = useState(deferredQuery);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const nextCursorRef = useRef<string | null>(null);
  const loadedCountRef = useRef(0);
  const [, startTransition] = useTransition();

  /* ---------- 外观草稿 ---------- */
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceDraft>(() => buildAppearanceDraft(initialAppearances));
  const [settingsDraft, setSettingsDraft] = useState(initialSettings);
  const [appearanceThemeTab, setAppearanceThemeTab] = useState<ThemeMode>("light");
  const [uploadingTheme, setUploadingTheme] = useState<ThemeMode | null>(null);
  const [uploadingAssetTheme, setUploadingAssetTheme] = useState<ThemeMode | null>(null);
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
  const [pendingAppearanceNotice, setPendingAppearanceNotice] = useState<{ key: string; message: string } | null>(null);
  const desktopWallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const mobileWallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------- 管理状态 ---------- */
  const [adminData, setAdminData] = useState<AdminBootstrap | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editorPanel, setEditorPanel] = useState<"site" | "tag" | null>(null);
  const [siteForm, setSiteForm] = useState<SiteFormState>(defaultSiteForm);
  const [tagForm, setTagForm] = useState<TagFormState>(defaultTagForm);
  const [siteAdminGroup, setSiteAdminGroup] = useState<AdminGroup>("create");
  const [tagAdminGroup, setTagAdminGroup] = useState<AdminGroup>("create");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<"sites" | "tags" | "appearance" | "config">("sites");
  const [configImportFile, setConfigImportFile] = useState<File | null>(null);
  const [configConfirmAction, setConfigConfirmAction] = useState<ConfigConfirmAction | null>(null);
  const [configConfirmPassword, setConfigConfirmPassword] = useState("");
  const [configConfirmError, setConfigConfirmError] = useState("");
  const [configBusyAction, setConfigBusyAction] = useState<"import" | "export" | "reset" | null>(null);
  const [siteNameDraft, setSiteNameDraft] = useState(settings.siteName ?? siteConfig.appName);
  const [siteNameBusy, setSiteNameBusy] = useState(false);
  const [onlineCheckBusy, setOnlineCheckBusy] = useState(false);
  const [onlineCheckResult, setOnlineCheckResult] = useState<{ checked: number; online: number; offline: number } | null>(null);
  const [appearanceDrawerOpen, setAppearanceDrawerOpen] = useState(false);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

  /* ---------- 拖拽状态 ---------- */
  const [activeDrag, setActiveDrag] = useState<{ id: string; kind: DragKind } | null>(null);
  const [activeDragSize, setActiveDragSize] = useState<{ width: number; height: number } | null>(null);
  const [activeDragOffset, setActiveDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const siteNameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 90, tolerance: 6 } }),
  );

  const snapToCursorModifier = useCallback(
    ({ transform, activeNodeRect }: Parameters<Modifier>[0]) => {
      if (!activeDragOffset || !activeNodeRect) return transform;
      return { ...transform, x: transform.x + activeDragOffset.x - activeNodeRect.width / 2, y: transform.y + activeDragOffset.y - activeNodeRect.height / 2 };
    },
    [activeDragOffset],
  );

  useEffect(() => { setPortalContainer(document.body); }, []);

  /* ============================== */
  /* Effects                        */
  /* ============================== */

  useEffect(() => { if (activeTagId && !tags.some((t) => t.id === activeTagId)) setActiveTagId(null); }, [activeTagId, tags]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTopButton(window.scrollY > 260);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => { if (!searchBar.searchFormRef.current?.contains(e.target as Node)) searchBar.closeSuggestionMenus(); };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchBar]);

  useEffect(() => { document.title = settings.siteName || siteConfig.appName; }, [settings.siteName]);

  useEffect(() => {
    const faviconUrl = appearances[themeMode].faviconUrl || siteConfig.logoSrc;
    const link: HTMLLinkElement = document.querySelector("link[rel='icon']") || document.createElement('link');
    link.rel = 'icon'; link.href = faviconUrl;
    if (!document.querySelector("link[rel='icon']")) document.head.appendChild(link);
  }, [appearances, themeMode]);

  // 自动在线检查
  useEffect(() => {
    if (!isAuthenticated || !settings.onlineCheckEnabled) return;
    const lastRun = settings.onlineCheckLastRun ? new Date(settings.onlineCheckLastRun) : null;
    const now = new Date(); const targetHour = settings.onlineCheckTime;
    if (now.getHours() >= targetHour) {
      const todayTarget = new Date(now); todayTarget.setHours(targetHour, 0, 0, 0);
      if (!lastRun || lastRun.getTime() < todayTarget.getTime()) {
        void (async () => { try { await requestJson("/api/sites/check-online", { method: "POST" }); await syncNavigationData(); } catch {} })();
      }
    }
  }, [isAuthenticated, settings.onlineCheckEnabled, settings.onlineCheckLastRun, settings.onlineCheckTime]);

  // 站点列表防抖
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(deferredQuery), 300);
    return () => window.clearTimeout(timeoutId);
  }, [deferredQuery]);

  // 站点列表加载
  useEffect(() => { loadedCountRef.current = siteList.items.length; }, [siteList.items.length]);

  const fetchSitesPage = useEffectEvent(async (cursor: string | null) => {
    const params = new URLSearchParams();
    params.set("scope", activeTagId ? "tag" : "all");
    if (activeTagId) params.set("tagId", activeTagId);
    if (debouncedQuery) params.set("q", debouncedQuery);
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
        startTransition(() => { setSiteList(page); setViewEpoch((c) => c + 1); setListState("ready"); setLocalSearchClosing(false); });
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setErrorMessage(error instanceof Error ? error.message : "加载失败");
        setListState("error");
      }
    })();
  }, [activeTagId, debouncedQuery, isAuthenticated, refreshNonce, setErrorMessage]);

  const loadMoreSites = useEffectEvent(async () => {
    if (!nextCursorRef.current || listState === "loading-more" || listState === "loading") return;
    const cursor = nextCursorRef.current; setListState("loading-more");
    try {
      const page = await fetchSitesPage(cursor); nextCursorRef.current = page.nextCursor;
      startTransition(() => { setSiteList((c) => ({ items: [...c.items, ...page.items], nextCursor: page.nextCursor, total: page.total })); setListState("ready"); });
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "加载更多失败"); setListState("error"); }
  });

  useEffect(() => {
    if (!sentinelRef.current || !siteList.nextCursor) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) void loadMoreSites(); }, { rootMargin: "220px 0px" });
    observer.observe(sentinelRef.current); return () => observer.disconnect();
  }, [siteList.nextCursor]);

  // 外观自动持久化
  const persistAppearanceDrafts = useEffectEvent(async (draft: AppearanceDraft, sDraft: AppSettings, successMessage?: string) => {
    try {
      const [savedAppearances, savedSettings] = await Promise.all([
        requestJson<Record<ThemeMode, ThemeAppearance>>("/api/appearance", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            light: { desktopWallpaperAssetId: draft.light.desktopWallpaperAssetId, mobileWallpaperAssetId: draft.light.mobileWallpaperAssetId, fontPreset: draft.light.fontPreset, fontSize: draft.light.fontSize, overlayOpacity: draft.light.overlayOpacity, textColor: draft.light.textColor, logoAssetId: draft.light.logoAssetId, faviconAssetId: draft.light.faviconAssetId, desktopCardFrosted: draft.light.desktopCardFrosted, mobileCardFrosted: draft.light.mobileCardFrosted, isDefault: draft.light.isDefault },
            dark: { desktopWallpaperAssetId: draft.dark.desktopWallpaperAssetId, mobileWallpaperAssetId: draft.dark.mobileWallpaperAssetId, fontPreset: draft.dark.fontPreset, fontSize: draft.dark.fontSize, overlayOpacity: draft.dark.overlayOpacity, textColor: draft.dark.textColor, logoAssetId: draft.dark.logoAssetId, faviconAssetId: draft.dark.faviconAssetId, desktopCardFrosted: draft.dark.desktopCardFrosted, mobileCardFrosted: draft.dark.mobileCardFrosted, isDefault: draft.dark.isDefault },
          }),
        }),
        requestJson<AppSettings>("/api/settings", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lightLogoAssetId: sDraft.lightLogoAssetId, darkLogoAssetId: sDraft.darkLogoAssetId, siteName: settings.siteName }),
        }),
      ]);
      setAppearances(savedAppearances); setSettings(savedSettings); setSettingsDraft(savedSettings);
      if (adminData) setAdminData({ ...adminData, appearances: savedAppearances, settings: savedSettings });
      if (successMessage) { setMessage(successMessage); setPendingAppearanceNotice(null); }
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "保存外观失败"); }
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    const a = appearances; const d = appearanceDraft;
    const match = d.light.desktopWallpaperAssetId === a.light.desktopWallpaperAssetId && d.light.mobileWallpaperAssetId === a.light.mobileWallpaperAssetId && d.light.fontPreset === a.light.fontPreset && d.light.fontSize === a.light.fontSize && d.light.overlayOpacity === a.light.overlayOpacity && d.light.textColor === a.light.textColor && d.light.logoAssetId === a.light.logoAssetId && d.light.faviconAssetId === a.light.faviconAssetId && d.light.desktopCardFrosted === a.light.desktopCardFrosted && d.light.mobileCardFrosted === a.light.mobileCardFrosted && d.light.isDefault === a.light.isDefault && d.dark.desktopWallpaperAssetId === a.dark.desktopWallpaperAssetId && d.dark.mobileWallpaperAssetId === a.dark.mobileWallpaperAssetId && d.dark.fontPreset === a.dark.fontPreset && d.dark.fontSize === a.dark.fontSize && d.dark.overlayOpacity === a.dark.overlayOpacity && d.dark.textColor === a.dark.textColor && d.dark.logoAssetId === a.dark.logoAssetId && d.dark.faviconAssetId === a.dark.faviconAssetId && d.dark.desktopCardFrosted === a.dark.desktopCardFrosted && d.dark.mobileCardFrosted === a.dark.mobileCardFrosted && d.dark.isDefault === a.dark.isDefault;
    if (match) return;
    const timeoutId = window.setTimeout(() => void persistAppearanceDrafts(appearanceDraft, settingsDraft, pendingAppearanceNotice?.message), 360);
    return () => window.clearTimeout(timeoutId);
  }, [appearanceDraft, appearances, isAuthenticated, pendingAppearanceNotice, settingsDraft]);

  // Admin bootstrap
  function applyAdminBootstrap(data: AdminBootstrap) {
    setAdminData(data); setAppearanceDraft(buildAppearanceDraft(data.appearances)); setSettings(data.settings); setSettingsDraft(data.settings);
  }
  useEffect(() => { if (!isAuthenticated) return; void (async () => { applyAdminBootstrap(await requestJson<AdminBootstrap>("/api/admin/bootstrap")); })(); }, [isAuthenticated]);

  /* ============================== */
  /* Handlers                       */
  /* ============================== */

  async function syncNavigationData() { const r = await requestJson<{ items: Tag[] }>("/api/navigation/tags"); setTags(r.items); setRefreshNonce((v) => v + 1); }
  async function syncAdminBootstrap() { if (!isAuthenticated) { setAdminData(null); return; } applyAdminBootstrap(await requestJson<AdminBootstrap>("/api/admin/bootstrap")); }

  function handleLogout() { return (async () => { await requestJson("/api/auth/logout", { method: "POST" }); setIsAuthenticated(false); setDrawerOpen(false); setAppearanceDrawerOpen(false); setConfigDrawerOpen(false); setEditMode(false); setEditorPanel(null); setAdminData(null); setMessage("已退出登录，编辑权限已关闭。"); await syncNavigationData(); })(); }
  function toggleEditMode() { if (!isAuthenticated) return; if (!editMode) { setEditMode(true); return; } setEditMode(false); setEditorPanel(null); setSiteForm(defaultSiteForm); setTagForm(defaultTagForm); }
  function openSiteCreator() { setEditMode(true); setEditorPanel("site"); setSiteAdminGroup("create"); setSiteForm({ ...defaultSiteForm, tagIds: activeTagId ? [activeTagId] : [] }); }
  function openTagCreator() { setEditMode(true); setEditorPanel("tag"); setTagAdminGroup("create"); setTagForm(defaultTagForm); }
  function openSiteEditor(site: Site) { setEditMode(true); setEditorPanel("site"); setSiteAdminGroup("edit"); setSiteForm({ id: site.id, name: site.name, url: site.url, description: site.description, iconUrl: site.iconUrl ?? "", iconBgColor: site.iconBgColor ?? "transparent", tagIds: site.tags.map((t) => t.id) }); }
  function openTagEditor(tag: Tag) { setEditMode(true); setEditorPanel("tag"); setTagAdminGroup("edit"); setTagForm({ id: tag.id, name: tag.name, isHidden: tag.isHidden, description: tag.description ?? "" }); }
  function closeEditorPanel() { setEditorPanel(null); setSiteForm(defaultSiteForm); setTagForm(defaultTagForm); }

  async function submitSiteForm() {
    setErrorMessage(""); setMessage("");
    if (!siteForm.iconUrl.trim()) { setErrorMessage("请先选择或上传一个图标。"); return; }
    const payload = { ...siteForm, iconUrl: siteForm.iconUrl.trim() || null, iconBgColor: siteForm.iconBgColor || null, description: siteForm.description?.trim() || null };
    try { await requestJson("/api/sites", { method: siteForm.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); setSiteForm(defaultSiteForm); setEditorPanel(null); setSiteAdminGroup("create"); setMessage(siteForm.id ? "网站修改已保存。" : "新网站已创建。"); await syncNavigationData(); await syncAdminBootstrap(); } catch (e) { setErrorMessage(e instanceof Error ? e.message : "保存网站失败"); }
  }
  async function submitTagForm() {
    setErrorMessage(""); setMessage("");
    try { const p = { ...tagForm, logoUrl: null, logoBgColor: null }; await requestJson("/api/tags", { method: tagForm.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }); setTagForm(defaultTagForm); setEditorPanel(null); setTagAdminGroup("create"); setMessage("标签配置已保存。"); await syncNavigationData(); await syncAdminBootstrap(); } catch (e) { setErrorMessage(e instanceof Error ? e.message : "保存标签失败"); }
  }
  async function deleteCurrentSite(siteId: string) {
    setErrorMessage(""); setMessage("");
    try { await requestJson(`/api/sites?id=${encodeURIComponent(siteId)}`, { method: "DELETE" }); if (siteForm.id === siteId) { setSiteForm(defaultSiteForm); setEditorPanel(null); setSiteAdminGroup("create"); } setMessage("网站已从导航页移除。"); await syncNavigationData(); await syncAdminBootstrap(); } catch (e) { setErrorMessage(e instanceof Error ? e.message : "删除网站失败"); }
  }
  async function deleteCurrentTag(tagId: string) {
    setErrorMessage(""); setMessage("");
    try { await requestJson(`/api/tags?id=${encodeURIComponent(tagId)}`, { method: "DELETE" }); if (tagForm.id === tagId) { setTagForm(defaultTagForm); setEditorPanel(null); setTagAdminGroup("create"); } setMessage("标签已删除。"); await syncNavigationData(); await syncAdminBootstrap(); } catch (e) { setErrorMessage(e instanceof Error ? e.message : "删除标签失败"); }
  }

  // Config
  function openConfigConfirm(action: ConfigConfirmAction) { if (action === "import" && !configImportFile) { setErrorMessage("请先选择要导入的配置压缩包。"); return; } setConfigConfirmAction(action); setConfigConfirmPassword(""); setConfigConfirmError(""); }
  function closeConfigConfirm() { if (configBusyAction) return; setConfigConfirmAction(null); setConfigConfirmPassword(""); setConfigConfirmError(""); }
  async function submitConfigConfirm() {
    if (!configConfirmAction || !configConfirmPassword.trim()) { if (!configConfirmPassword.trim()) setConfigConfirmError("请输入当前账号密码。"); return; }
    setConfigConfirmError("");
    try {
      if (configConfirmAction === "export") { await exportConfig(configConfirmPassword); }
      else if (configConfirmAction === "import") { await importConfig(configConfirmPassword); }
      else { await resetConfig(configConfirmPassword); }
      setConfigConfirmAction(null); setConfigConfirmPassword(""); setConfigConfirmError("");
    } catch (e) { setConfigConfirmError(e instanceof Error ? e.message : `${configActionLabels[configConfirmAction]}失败`); }
  }
  async function exportConfig(password: string) {
    setConfigBusyAction("export"); try {
      const response = await fetch("/api/config/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!response.ok) { const d = await response.json().catch(() => null); throw new Error((d as Record<string, string>)?.error ?? "导出配置失败"); }
      const blob = await response.blob(); const url = window.URL.createObjectURL(blob); const link = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") ?? ""; const match = disposition.match(/filename="(.+?)"/i);
      link.href = url; link.download = match?.[1] ?? "sakuranav-config.zip"; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
      setMessage("配置压缩包已生成，浏览器会开始下载。");
    } finally { setConfigBusyAction(null); }
  }
  async function importConfig(password: string) {
    if (!configImportFile) throw new Error("请先选择要导入的配置压缩包。");
    setConfigBusyAction("import"); try {
      const formData = new FormData(); formData.append("file", configImportFile); formData.append("password", password);
      const data = await requestJson<AdminBootstrap>("/api/config/import", { method: "POST", body: formData });
      applyAdminBootstrap(data); setAppearances(data.appearances); setTags(data.tags); setSettings(data.settings); setSettingsDraft(data.settings);
      setSiteForm(defaultSiteForm); setTagForm(defaultTagForm); setSiteAdminGroup("create"); setTagAdminGroup("create"); setConfigImportFile(null); setRefreshNonce((v) => v + 1);
      setMessage("配置压缩包已导入，当前导航数据已刷新。");
    } finally { setConfigBusyAction(null); }
  }
  async function resetConfig(password: string) {
    setConfigBusyAction("reset"); try {
      const data = await requestJson<AdminBootstrap>("/api/config/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      applyAdminBootstrap(data); setTags(data.tags); setAppearances(data.appearances); setSettings(data.settings); setSettingsDraft(data.settings);
      setSiteForm(defaultSiteForm); setTagForm(defaultTagForm); setEditorPanel(null); setConfigImportFile(null); searchBar.setQuery(""); setRefreshNonce((v) => v + 1);
      setMessage("已恢复默认内容配置。");
    } finally { setConfigBusyAction(null); }
  }

  // Site name
  async function handleSiteNameSave(name: string) {
    const trimmed = name.trim(); const finalName = trimmed || null; if (finalName === settings.siteName) return;
    setSiteNameBusy(true); try { const saved = await requestJson<AppSettings>("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lightLogoAssetId: settings.lightLogoAssetId, darkLogoAssetId: settings.darkLogoAssetId, siteName: finalName }) }); setSettings(saved); setSiteNameDraft(saved.siteName ?? siteConfig.appName); document.title = saved.siteName || siteConfig.appName; } finally { setSiteNameBusy(false); }
  }
  function debouncedSiteNameSave(name: string) { setSiteNameDraft(name); if (siteNameTimerRef.current) clearTimeout(siteNameTimerRef.current); siteNameTimerRef.current = setTimeout(() => void handleSiteNameSave(name), 600); }

  // Online check
  async function handleOnlineCheckToggle(enabled: boolean) { try { const saved = await requestJson<AppSettings>("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lightLogoAssetId: settings.lightLogoAssetId, darkLogoAssetId: settings.darkLogoAssetId, onlineCheckEnabled: enabled }) }); setSettings(saved); } catch (e) { console.error("保存在线检查设置失败:", e); } }
  async function handleOnlineCheckSettingChange(field: "onlineCheckTime", value: number) { try { const saved = await requestJson<AppSettings>("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lightLogoAssetId: settings.lightLogoAssetId, darkLogoAssetId: settings.darkLogoAssetId, [field]: value }) }); setSettings(saved); } catch (e) { console.error("保存在线检查设置失败:", e); } }
  async function handleRunOnlineCheck() { setOnlineCheckBusy(true); setOnlineCheckResult(null); try { const res = await requestJson<{ checked: number; online: number; offline: number }>("/api/sites/check-online", { method: "POST" }); setOnlineCheckResult(res); await syncNavigationData(); } finally { setOnlineCheckBusy(false); } }

  // Wallpaper/Asset
  async function uploadWallpaper(theme: ThemeMode, device: WallpaperDevice, file: File) { setUploadingTheme(theme); try { const fd = new FormData(); fd.append("file", file); fd.append("kind", "wallpaper"); const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", { method: "POST", body: fd }); setAppearanceDraft((c) => ({ ...c, [theme]: { ...c[theme], ...(device === "desktop" ? { desktopWallpaperAssetId: asset.id, desktopWallpaperUrl: asset.url } : { mobileWallpaperAssetId: asset.id, mobileWallpaperUrl: asset.url }) } })); setAppearanceMenuTarget(null); setMessage(`${getThemeDeviceLabel(theme, device, "壁纸")}已上传。`); } catch (e) { setErrorMessage(e instanceof Error ? e.message : "壁纸上传失败"); } finally { setUploadingTheme(null); } }
  async function uploadWallpaperByUrl(theme: ThemeMode, device: WallpaperDevice, sourceUrl: string) { setWallpaperUrlBusy(true); setWallpaperUrlError(""); try { const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceUrl, kind: "wallpaper" }) }); setAppearanceDraft((c) => ({ ...c, [theme]: { ...c[theme], ...(device === "desktop" ? { desktopWallpaperAssetId: asset.id, desktopWallpaperUrl: asset.url } : { mobileWallpaperAssetId: asset.id, mobileWallpaperUrl: asset.url }) } })); setWallpaperUrlTarget(null); setWallpaperUrlValue(""); setAppearanceMenuTarget(null); setMessage(`${getThemeDeviceLabel(theme, device, "壁纸")}已通过链接更新。`); } catch (e) { setWallpaperUrlError(e instanceof Error ? e.message : "壁纸 URL 上传失败"); } finally { setWallpaperUrlBusy(false); } }
  function removeWallpaper(theme: ThemeMode, device: WallpaperDevice) { setAppearanceDraft((c) => ({ ...c, [theme]: { ...c[theme], ...(device === "desktop" ? { desktopWallpaperAssetId: null, desktopWallpaperUrl: null } : { mobileWallpaperAssetId: null, mobileWallpaperUrl: null }) } })); setAppearanceMenuTarget(null); setMessage(`${getThemeDeviceLabel(theme, device, "壁纸")}已移除。`); }
  async function uploadAsset(theme: ThemeMode, kind: AssetKind, file: File) { setUploadingAssetTheme(theme); try { const fd = new FormData(); fd.append("file", file); fd.append("kind", kind); const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", { method: "POST", body: fd }); setAppearanceDraft((c) => ({ ...c, [theme]: { ...c[theme], ...(kind === "logo" ? { logoAssetId: asset.id, logoUrl: asset.url } : { faviconAssetId: asset.id, faviconUrl: asset.url }) } })); setAssetMenuTarget(null); setMessage(`${getThemeAssetLabel(theme, kind)}已上传。`); } catch (e) { setErrorMessage(e instanceof Error ? e.message : "上传失败"); } finally { setUploadingAssetTheme(null); } }
  async function uploadAssetByUrl(theme: ThemeMode, kind: AssetKind, sourceUrl: string) { setAssetUrlBusy(true); setAssetUrlError(""); try { const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceUrl, kind }) }); setAppearanceDraft((c) => ({ ...c, [theme]: { ...c[theme], ...(kind === "logo" ? { logoAssetId: asset.id, logoUrl: asset.url } : { faviconAssetId: asset.id, faviconUrl: asset.url }) } })); setAssetUrlTarget(null); setAssetUrlValue(""); setAssetMenuTarget(null); setMessage(`${getThemeAssetLabel(theme, kind)}已通过链接更新。`); } catch (e) { setAssetUrlError(e instanceof Error ? e.message : "URL 上传失败"); } finally { setAssetUrlBusy(false); } }
  function removeAsset(theme: ThemeMode, kind: AssetKind) { setAppearanceDraft((c) => ({ ...c, [theme]: { ...c[theme], ...(kind === "logo" ? { logoAssetId: null, logoUrl: null } : { faviconAssetId: null, faviconUrl: null }) } })); setAssetMenuTarget(null); setMessage(`${getThemeAssetLabel(theme, kind)}已移除。`); }

  // Typography/Frosted notices
  function queueTypographyNotice(theme: ThemeMode) { setPendingAppearanceNotice({ key: `typography-${theme}`, message: `${getThemeLabel(theme)}主题字体设置已保存。` }); }
  function queueCardFrostedNotice(theme: ThemeMode) { setPendingAppearanceNotice({ key: `card-frosted-${theme}`, message: `${getThemeLabel(theme)}主题卡片磨砂效果已保存。` }); }
  function restoreThemeTypographyDefaults(theme: ThemeMode) { setAppearanceDraft((c) => ({ ...c, [theme]: { ...c[theme], fontPreset: themeAppearanceDefaults[theme].fontPreset, fontSize: themeAppearanceDefaults[theme].fontSize, textColor: themeAppearanceDefaults[theme].textColor } })); queueTypographyNotice(theme); }

  async function handleTagSort(event: DragEndEvent) { setActiveDrag(null); setActiveDragSize(null); setActiveDragOffset(null); if (!event.over || event.active.id === event.over.id || !isAuthenticated || !editMode) return; const oi = tags.findIndex((t) => t.id === event.active.id); const ni = tags.findIndex((t) => t.id === event.over?.id); if (oi < 0 || ni < 0) return; const next = arrayMove(tags, oi, ni).map((t: Tag, i: number) => ({ ...t, sortOrder: i })); setTags(next); setAdminData((c) => c ? { ...c, tags: next } : c); try { await requestJson("/api/tags/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: next.map((t: Tag) => t.id) }) }); setMessage("标签顺序已更新。"); } catch (e) { setErrorMessage(e instanceof Error ? e.message : "保存标签顺序失败"); await Promise.all([syncNavigationData(), syncAdminBootstrap()]); } }
  async function handleSiteSort(event: DragEndEvent) { setActiveDrag(null); setActiveDragSize(null); setActiveDragOffset(null); if (!event.over || event.active.id === event.over.id || !isAuthenticated || !editMode || !adminData || debouncedQuery) return; const fullIds = activeTagId ? adminData.sites.filter((s) => s.tags.some((t) => t.id === activeTagId)).sort((l, r) => (l.tags.find((t) => t.id === activeTagId)?.sortOrder ?? 0) - (r.tags.find((t) => t.id === activeTagId)?.sortOrder ?? 0)).map((s) => s.id) : [...adminData.sites].sort((l, r) => l.globalSortOrder - r.globalSortOrder).map((s) => s.id); const oi = fullIds.indexOf(String(event.active.id)); const ni = fullIds.indexOf(String(event.over.id)); if (oi < 0 || ni < 0) return; const reordered = arrayMove(fullIds, oi, ni); const siteMap = new Map(siteList.items.map((s) => [s.id, s])); setSiteList((c) => ({ ...c, items: reordered.filter((id: string) => siteMap.has(id)).map((id: string) => siteMap.get(id) as Site) })); setAdminData((c) => { if (!c) return c; const om = new Map(reordered.map((id: string, i: number) => [id, i])); return { ...c, sites: c.sites.map((s) => { if (!om.has(s.id)) return s; const order = om.get(s.id) ?? 0; return activeTagId ? { ...s, tags: s.tags.map((t) => t.id === activeTagId ? { ...t, sortOrder: order } : t) } : { ...s, globalSortOrder: order }; }) }; }); try { if (activeTagId) { await requestJson(`/api/tags/${activeTagId}/sites/reorder`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: reordered }) }); } else { await requestJson("/api/sites/reorder-global", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: reordered }) }); } setMessage(activeTagId ? "标签内网站顺序已更新。" : "网站顺序已更新。"); } catch (e) { setErrorMessage(e instanceof Error ? e.message : "保存网站顺序失败"); await Promise.all([syncNavigationData(), syncAdminBootstrap()]); } }
  function handleDragStart(kind: DragKind) { return (event: DragStartEvent) => { setActiveDrag({ id: String(event.active.id), kind }); const rect = event.active.rect.current.initial; setActiveDragSize(rect?.width && rect?.height ? { width: rect.width, height: rect.height } : null); if (rect && event.activatorEvent instanceof MouseEvent) setActiveDragOffset({ x: event.activatorEvent.clientX - rect.left, y: event.activatorEvent.clientY - rect.top }); else setActiveDragOffset(null); }; }
  function handleDragCancel() { setActiveDrag(null); setActiveDragSize(null); setActiveDragOffset(null); }

  const activeDraggedTag = activeDrag?.kind === "tag" ? tags.find((t) => t.id === activeDrag.id) ?? null : null;
  const activeDraggedSite = activeDrag?.kind === "site" ? siteList.items.find((s) => s.id === activeDrag.id) ?? adminData?.sites.find((s) => s.id === activeDrag.id) ?? null : null;

  /* ============================== */
  /* Derived state                  */
  /* ============================== */
  const activeAppearance = appearances[themeMode];
  const activeFont = fontPresets[activeAppearance.fontPreset];
  const hasActiveWallpaper = Boolean(activeAppearance.desktopWallpaperUrl || activeAppearance.mobileWallpaperUrl);
  const hasActiveMobileWallpaper = Boolean(activeAppearance.mobileWallpaperUrl);
  const hasActiveDesktopWallpaper = Boolean(activeAppearance.desktopWallpaperUrl);
  const activeHeaderLogo = activeAppearance.logoUrl || siteConfig.logoSrc;
  const displayName = settings.siteName || siteConfig.appName;
  const currentTitle = activeTagId ? tags.find((t) => t.id === activeTagId)?.name ?? "全部网站" : "全部网站";
  const localResultsReady = searchBar.localSearchActive && listState === "ready" && debouncedQuery === searchBar.localSearchQuery;
  const showAiHint = localResultsReady && !searchBar.aiResultsBusy && searchBar.aiResults.length === 0;
  const showAiPanel = searchBar.localSearchActive && (searchBar.aiResultsBusy || searchBar.aiResults.length > 0);
  const emptyState = listState === "ready" && siteList.items.length === 0 ? (debouncedQuery ? "当前搜索没有匹配网站，试试换个关键词。" : activeTagId ? "这个标签下还没有网站。" : "这里还没有网站，登录后可以开始创建。") : "";

  /* ============================== */
  /* Search bar keyboard handler    */
  /* ============================== */
  function handleSearchKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey) { event.preventDefault(); searchBar.stepSearchEngine(event.shiftKey ? -1 : 1); return; }
    if (!searchBar.searchSuggestionsOpen || !searchBar.searchSuggestions.length) { if (event.key === "Escape") searchBar.closeSuggestionMenus(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); const base = searchBar.highlightedSuggestionIndex >= 0 ? searchBar.highlightedSuggestionIndex : searchBar.activeSuggestionIndex; searchBar.setSuggestionInteractionMode("keyboard"); searchBar.setHoveredSuggestionIndex(-1); searchBar.setActiveSuggestionIndex(base < 0 ? 0 : (base + 1) % searchBar.searchSuggestions.length); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); const base = searchBar.highlightedSuggestionIndex >= 0 ? searchBar.highlightedSuggestionIndex : searchBar.activeSuggestionIndex; searchBar.setSuggestionInteractionMode("keyboard"); searchBar.setHoveredSuggestionIndex(-1); searchBar.setActiveSuggestionIndex(base <= 0 ? searchBar.searchSuggestions.length - 1 : base - 1); return; }
    if (event.key === "Enter" && searchBar.highlightedSuggestionIndex >= 0) { event.preventDefault(); const s = searchBar.searchSuggestions[searchBar.highlightedSuggestionIndex]; if (s) searchBar.applySuggestion(s.value); return; }
    if (event.key === "Escape") { event.preventDefault(); searchBar.closeSuggestionMenus(); }
  }

  /* ============================== */
  /* Render                          */
  /* ============================== */
  const pageStyle = { fontFamily: activeFont.cssVariable, fontSize: `${activeAppearance.fontSize}px`, color: activeAppearance.textColor } as const;

  return (
    <main className={cn("relative min-h-screen overflow-hidden transition-colors duration-500", themeMode === "dark" ? "text-slate-100" : "text-slate-900")} data-theme={themeMode} style={pageStyle}>
      <BackgroundLayer themeMode={themeMode} appearances={appearances} />
      <div className="relative flex min-h-screen w-full flex-col">
        <AppHeader
          themeMode={themeMode} hasActiveWallpaper={hasActiveWallpaper} isAuthenticated={isAuthenticated} editMode={editMode} mobileTagsOpen={mobileTagsOpen} displayName={displayName} activeHeaderLogo={activeHeaderLogo}
          onLogoClick={() => { setActiveTagId(null); searchBar.setQuery(""); searchBar.setSearchMenuOpen(false); }}
          onToggleMobileTags={() => setMobileTagsOpen((v) => !v)} onToggleEditMode={toggleEditMode}
          onOpenAppearanceDrawer={() => { setConfigDrawerOpen(false); setAppearanceDrawerOpen(true); setAppearanceThemeTab(themeMode); }}
          onOpenConfigDrawer={() => { setAppearanceDrawerOpen(false); setConfigDrawerOpen(true); }}
          onToggleTheme={toggleThemeMode} onLogout={() => void handleLogout()}
        />
        <section className="flex flex-1 max-lg:flex-col">
          <SidebarTags
            themeMode={themeMode} hasActiveWallpaper={hasActiveWallpaper} mobileTagsOpen={mobileTagsOpen} isAuthenticated={isAuthenticated} editMode={editMode}
            tags={tags} activeTagId={activeTagId} sensors={sensors} portalContainer={portalContainer} snapToCursorModifier={snapToCursorModifier}
            activeDraggedTag={activeDraggedTag} activeDragSize={activeDragSize}
            onDragStart={handleDragStart("tag")} onDragCancel={handleDragCancel} onDragEnd={(e) => void handleTagSort(e)}
            onSelectTag={(id) => { setActiveTagId(id); searchBar.setSearchMenuOpen(false); }} onEditTag={openTagEditor}
          />
          <section className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-5 text-center">
              <div className="w-full space-y-4">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className={cn("rounded-full border px-3 py-1 text-xs uppercase tracking-[0.26em] opacity-70", hasActiveWallpaper ? themeMode === "light" ? "border-slate-900/10 bg-white/40 shadow-[0_4px_16px_rgba(148,163,184,0.08)] backdrop-blur-[18px]" : "border-white/12 bg-white/10 shadow-[0_4px_16px_rgba(2,6,23,0.16)] backdrop-blur-[18px]" : "border-white/20 bg-white/16")}>{activeTagId ? "标签视图" : "默认视图"}</span>
                  <h2 className={cn("text-2xl font-semibold tracking-tight sm:text-3xl", hasActiveWallpaper ? themeMode === "light" ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" : "drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]" : "")}>{currentTitle}</h2>
                  <p className={cn("text-sm opacity-72 rounded-full px-3 py-1", hasActiveWallpaper ? themeMode === "light" ? "bg-white/36 shadow-[0_4px_16px_rgba(148,163,184,0.08)] backdrop-blur-[18px]" : "bg-white/10 shadow-[0_4px_16px_rgba(2,6,23,0.16)] backdrop-blur-[18px]" : "")}>已展示 {siteList.items.length} / {siteList.total} 个网站</p>
                  {isAuthenticated && editMode ? (<><button type="button" onClick={openSiteCreator} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/18 bg-white/16 px-4 text-sm font-medium transition hover:bg-white/24"><Plus className="h-4 w-4" />新建网站</button><button type="button" onClick={openTagCreator} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/18 bg-white/12 px-4 text-sm font-medium transition hover:bg-white/20"><Plus className="h-4 w-4" />新建标签</button></>) : null}
                </div>
                <SearchBarSection
                  themeMode={themeMode} hasActiveWallpaper={hasActiveWallpaper} isAuthenticated={isAuthenticated} editMode={editMode}
                  searchFormRef={searchBar.searchFormRef} query={searchBar.query} searchMenuOpen={searchBar.searchMenuOpen}
                  searchSuggestionsOpen={searchBar.searchSuggestionsOpen} searchSuggestionsBusy={searchBar.searchSuggestionsBusy}
                  searchSuggestions={searchBar.searchSuggestions} activeSuggestionIndex={searchBar.activeSuggestionIndex}
                  hoveredSuggestionIndex={searchBar.hoveredSuggestionIndex} highlightedSuggestionIndex={searchBar.highlightedSuggestionIndex}
                  suggestionInteractionMode={searchBar.suggestionInteractionMode}
                  engineMeta={searchBar.engineMeta as { name: string; iconUrl?: string; accent: string } | null} engineList={searchBar.engineList as Array<{ id: string; name: string; iconUrl?: string; accent: string }>}
                  onSubmit={(e) => { e.preventDefault(); searchBar.submitSearch(); }} onKeyDown={handleSearchKeyDown}
                  onQueryChange={searchBar.handleQueryChange} onSuggestionFocus={searchBar.handleSuggestionFocus}
                  onCycleEngine={searchBar.cycleSearchEngine} onSelectEngine={searchBar.selectEngine}
                  onClearInput={searchBar.clearInput} onActivateLocalSearch={searchBar.activateLocalSearch}
                  onApplySuggestion={searchBar.applySuggestion} onDismissSuggestions={searchBar.dismissSuggestions}
                  onOpenEngineEditor={() => setEngineEditorOpen(true)}
                  setActiveSuggestionIndex={searchBar.setActiveSuggestionIndex} setHoveredSuggestionIndex={searchBar.setHoveredSuggestionIndex}
                  setSuggestionInteractionMode={searchBar.setSuggestionInteractionMode}
                />
              </div>
            </div>
            <SiteContentArea
              themeMode={themeMode} hasActiveWallpaper={hasActiveWallpaper} isAuthenticated={isAuthenticated} editMode={editMode}
              localSearchActive={searchBar.localSearchActive} localSearchQuery={searchBar.localSearchQuery} debouncedQuery={debouncedQuery}
              listState={listState} siteList={siteList} viewEpoch={viewEpoch} activeTagId={activeTagId} currentTitle={currentTitle}
              activeAppearance={activeAppearance} settingsOnlineCheckEnabled={settings.onlineCheckEnabled}
              activeDraggedSite={activeDraggedSite} sensors={sensors} snapToCursorModifier={snapToCursorModifier}
              dragTransition={dragTransition} sentinelRef={sentinelRef} requestIdRef={requestIdRef}
              aiResults={searchBar.aiResults} aiResultsBusy={searchBar.aiResultsBusy} aiReasoning={searchBar.aiReasoning}
              showAiHint={showAiHint} showAiPanel={showAiPanel} emptyState={emptyState} localSearchClosing={localSearchClosing}
              onOpenSiteCreator={openSiteCreator} onOpenTagCreator={openTagCreator} onEditSite={openSiteEditor}
              onTagSelect={(id) => { setActiveTagId(id); searchBar.setSearchMenuOpen(false); }}
              onDragStart={handleDragStart("site")} onDragCancel={handleDragCancel} onDragEnd={(e) => void handleSiteSort(e)}
              onCloseLocalSearch={() => { ++requestIdRef.current; setLocalSearchClosing(true); setDebouncedQuery(""); searchBar.closeLocalSearch(); }}
              onTriggerAiRecommend={searchBar.triggerAiRecommend} onCloseAiPanel={searchBar.closeAiPanel}
              setDebouncedQuery={setDebouncedQuery} closeLocalSearch={searchBar.closeLocalSearch}
            />
            <SiteFooter themeMode={themeMode} hasActiveMobileWallpaper={hasActiveMobileWallpaper} hasActiveDesktopWallpaper={hasActiveDesktopWallpaper} />
          </section>
        </section>
      </div>

      <ToastLayer toasts={toasts} dismissToast={dismissToast} />
      <FloatingActions showScrollTopButton={showScrollTopButton} onScrollToTop={() => window.scrollTo({ top: 0, behavior: "smooth" })} onOpenFloatingSearch={() => setFloatingSearchOpen(true)} />
      <FloatingSearchDialog open={floatingSearchOpen} activeTagId={activeTagId} activeTagName={currentTitle} onClose={() => setFloatingSearchOpen(false)} engines={engineConfigs} />

      <AppearanceDrawer
        open={appearanceDrawerOpen} isAuthenticated={isAuthenticated}
        appearanceThemeTab={appearanceThemeTab} setAppearanceThemeTab={setAppearanceThemeTab}
        appearanceDraft={appearanceDraft} setAppearanceDraft={setAppearanceDraft}
        uploadingTheme={uploadingTheme} appearanceMenuTarget={appearanceMenuTarget}
        assetMenuTarget={assetMenuTarget} uploadingAssetTheme={uploadingAssetTheme}
        desktopWallpaperInputRef={desktopWallpaperInputRef} mobileWallpaperInputRef={mobileWallpaperInputRef}
        logoInputRef={logoInputRef} faviconInputRef={faviconInputRef}
        onUploadWallpaper={(t, d, f) => void uploadWallpaper(t, d as WallpaperDevice, f)}
        onOpenWallpaperUrlDialog={(t) => { setWallpaperUrlTarget(t); setWallpaperUrlValue(""); setWallpaperUrlError(""); setAppearanceMenuTarget(null); }}
        onOpenWallpaperMenu={setAppearanceMenuTarget} onRemoveWallpaper={removeWallpaper}
        onTriggerWallpaperFilePicker={(d) => { (d === "desktop" ? desktopWallpaperInputRef : mobileWallpaperInputRef).current?.click(); setAppearanceMenuTarget(null); }}
        onUploadAsset={(t, k, f) => void uploadAsset(t, k as AssetKind, f)}
        onOpenAssetUrlDialog={(t) => { setAssetUrlTarget(t); setAssetUrlValue(""); setAssetUrlError(""); setAssetMenuTarget(null); }}
        onOpenAssetMenu={setAssetMenuTarget} onRemoveAsset={removeAsset}
        onTriggerAssetFilePicker={(k) => { (k === "logo" ? logoInputRef : faviconInputRef).current?.click(); setAssetMenuTarget(null); }}
        onTypographyChange={queueTypographyNotice} onRestoreTypographyDefaults={restoreThemeTypographyDefaults}
        onCardFrostedChange={queueCardFrostedNotice}
        onClose={() => { setAppearanceDrawerOpen(false); setAppearanceMenuTarget(null); }}
      />

      <ConfigDrawer
        open={configDrawerOpen} isAuthenticated={isAuthenticated}
        siteName={siteNameDraft} siteNameBusy={siteNameBusy} selectedFile={configImportFile} busyAction={configBusyAction}
        onlineCheckEnabled={settings.onlineCheckEnabled} onlineCheckTime={settings.onlineCheckTime}
        onlineCheckBusy={onlineCheckBusy} onlineCheckResult={onlineCheckResult}
        onSiteNameChange={debouncedSiteNameSave} onFileChange={setConfigImportFile}
        onExport={() => openConfigConfirm("export")} onImport={() => openConfigConfirm("import")} onReset={() => openConfigConfirm("reset")}
        onOnlineCheckToggle={(e) => void handleOnlineCheckToggle(e)} onOnlineCheckTimeChange={(h) => void handleOnlineCheckSettingChange("onlineCheckTime", h)}
        onRunOnlineCheck={() => void handleRunOnlineCheck()} onClose={() => setConfigDrawerOpen(false)}
      />

      {configConfirmAction && isAuthenticated ? (
        <ConfigConfirmDialog action={configConfirmAction} password={configConfirmPassword} error={configConfirmError}
          busy={configBusyAction === configConfirmAction}
          onPasswordChange={(v) => { setConfigConfirmPassword(v); if (configConfirmError) setConfigConfirmError(""); }}
          onClose={closeConfigConfirm} onSubmit={() => void submitConfigConfirm()} />
      ) : null}

      {wallpaperUrlTarget && isAuthenticated ? (
        <WallpaperUrlDialog target={wallpaperUrlTarget} value={wallpaperUrlValue} error={wallpaperUrlError} busy={wallpaperUrlBusy}
          onValueChange={(v) => { setWallpaperUrlValue(v); if (wallpaperUrlError) setWallpaperUrlError(""); }}
          onClose={() => { if (!wallpaperUrlBusy) { setWallpaperUrlTarget(null); setWallpaperUrlValue(""); setWallpaperUrlError(""); } }}
          onSubmit={() => { if (!wallpaperUrlValue.trim()) { setWallpaperUrlError("请输入壁纸 URL。"); return; } void uploadWallpaperByUrl(wallpaperUrlTarget.theme, wallpaperUrlTarget.device, wallpaperUrlValue.trim()); }} />
      ) : null}

      {assetUrlTarget && isAuthenticated ? (
        <AssetUrlDialog target={assetUrlTarget} value={assetUrlValue} error={assetUrlError} busy={assetUrlBusy}
          onValueChange={(v) => { setAssetUrlValue(v); if (assetUrlError) setAssetUrlError(""); }}
          onClose={() => { if (!assetUrlBusy) { setAssetUrlTarget(null); setAssetUrlValue(""); setAssetUrlError(""); } }}
          onSubmit={() => { if (!assetUrlValue.trim()) { setAssetUrlError("请输入图片 URL。"); return; } void uploadAssetByUrl(assetUrlTarget.theme, assetUrlTarget.kind, assetUrlValue.trim()); }} />
      ) : null}

      <EditorModal open={!!editorPanel && editMode} isAuthenticated={isAuthenticated} editorPanel={editorPanel}
        siteForm={siteForm} setSiteForm={setSiteForm} tagForm={tagForm} setTagForm={setTagForm}
        tags={tags} adminDataTags={adminData?.tags}
        onSubmitSite={() => void submitSiteForm()} onSubmitTag={() => void submitTagForm()}
        onDeleteSite={siteForm.id ? () => void deleteCurrentSite(siteForm.id as string) : undefined}
        onDeleteTag={tagForm.id ? () => void deleteCurrentTag(tagForm.id as string) : undefined}
        onTagsChange={async () => { await Promise.all([syncNavigationData(), syncAdminBootstrap()]); }}
        onClose={closeEditorPanel} />

      {drawerOpen && isAuthenticated ? (
        <AdminDrawer open={drawerOpen} isAuthenticated={isAuthenticated} adminSection={adminSection} setAdminSection={setAdminSection}
          adminData={adminData} tags={tags} siteForm={siteForm} setSiteForm={setSiteForm} tagForm={tagForm} setTagForm={setTagForm}
          siteActiveGroup={siteAdminGroup} setSiteActiveGroup={setSiteAdminGroup} tagActiveGroup={tagAdminGroup} setTagActiveGroup={setTagAdminGroup}
          appearanceThemeTab={appearanceThemeTab} setAppearanceThemeTab={setAppearanceThemeTab}
          appearanceDraft={appearanceDraft} setAppearanceDraft={setAppearanceDraft} uploadingTheme={uploadingTheme}
          appearanceMenuTarget={appearanceMenuTarget} assetMenuTarget={assetMenuTarget} uploadingAssetTheme={uploadingAssetTheme}
          desktopWallpaperInputRef={desktopWallpaperInputRef} mobileWallpaperInputRef={mobileWallpaperInputRef}
          logoInputRef={logoInputRef} faviconInputRef={faviconInputRef}
          siteNameDraft={siteNameDraft} siteNameBusy={siteNameBusy} configImportFile={configImportFile} configBusyAction={configBusyAction}
          settingsOnlineCheckEnabled={settings.onlineCheckEnabled} settingsOnlineCheckTime={settings.onlineCheckTime}
          onlineCheckBusy={onlineCheckBusy} onlineCheckResult={onlineCheckResult}
          onSubmitSite={() => void submitSiteForm()} onSubmitTag={() => void submitTagForm()} onError={setErrorMessage}
          onTagsChange={async () => { await Promise.all([syncNavigationData(), syncAdminBootstrap()]); }}
          onStartEditSite={(s) => { setSiteAdminGroup("edit"); setSiteForm({ id: s.id, name: s.name, url: s.url, description: s.description, iconUrl: s.iconUrl ?? "", iconBgColor: s.iconBgColor ?? "transparent", tagIds: s.tags.map((t) => t.id) }); }}
          onStartEditTag={(t) => { setTagAdminGroup("edit"); setTagForm({ id: t.id, name: t.name, isHidden: t.isHidden, description: t.description ?? "" }); }}
          onDeleteSite={(id) => void deleteCurrentSite(id)} onDeleteTag={(id) => void deleteCurrentTag(id)}
          onSiteNameChange={debouncedSiteNameSave} onFileChange={setConfigImportFile}
          onExport={() => openConfigConfirm("export")} onImport={() => openConfigConfirm("import")} onReset={() => openConfigConfirm("reset")}
          onUploadWallpaper={(t, d, f) => void uploadWallpaper(t, d as WallpaperDevice, f)}
          onOpenWallpaperUrlDialog={(t) => { setWallpaperUrlTarget(t); setWallpaperUrlValue(""); setWallpaperUrlError(""); setAppearanceMenuTarget(null); }}
          onOpenWallpaperMenu={setAppearanceMenuTarget} onRemoveWallpaper={removeWallpaper}
          onTriggerWallpaperFilePicker={(d) => { (d === "desktop" ? desktopWallpaperInputRef : mobileWallpaperInputRef).current?.click(); setAppearanceMenuTarget(null); }}
          onUploadAsset={(t, k, f) => void uploadAsset(t, k as AssetKind, f)}
          onOpenAssetUrlDialog={(t) => { setAssetUrlTarget(t); setAssetUrlValue(""); setAssetUrlError(""); setAssetMenuTarget(null); }}
          onOpenAssetMenu={setAssetMenuTarget} onRemoveAsset={removeAsset}
          onTriggerAssetFilePicker={(k) => { (k === "logo" ? logoInputRef : faviconInputRef).current?.click(); setAssetMenuTarget(null); }}
          onTypographyChange={queueTypographyNotice} onRestoreTypographyDefaults={restoreThemeTypographyDefaults}
          onCardFrostedChange={queueCardFrostedNotice}
          onOnlineCheckToggle={(e) => void handleOnlineCheckToggle(e)}
          onOnlineCheckTimeChange={(h) => void handleOnlineCheckSettingChange("onlineCheckTime", h)}
          onRunOnlineCheck={() => void handleRunOnlineCheck()}
          onClose={() => setDrawerOpen(false)} />
      ) : null}

      {engineEditorOpen && isAuthenticated ? (
        <SearchEngineEditor engines={engineConfigs} onChange={setEngineConfigs} onClose={() => setEngineEditorOpen(false)} />
      ) : null}
    </main>
  );
}
