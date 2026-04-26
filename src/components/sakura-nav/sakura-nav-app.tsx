/**
 * SakuraNav 主应用组件
 * @description 导航站的核心编排组件，整合各子模块
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fontPresets, siteConfig } from "@/lib/config/config";
import type {
  AppSettings, AdminBootstrap, SessionUser, Tag, ThemeAppearance,
  ThemeMode, FloatingButtonItem, SocialCardType,
} from "@/lib/base/types";
import { SOCIAL_TAG_ID } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import { cn } from "@/lib/utils/utils";
import { applyRoundedFavicon } from "@/lib/utils/crop-utils";
import { useTheme } from "@/hooks/use-theme";
import { useSiteList } from "@/hooks/use-site-list";
import { useAppearance } from "@/hooks/use-appearance";
import { useDragSort, dragTransition } from "@/hooks/use-drag-sort";
import { useSearchBar } from "@/hooks/use-search-bar";
import { useToastNotify } from "@/hooks/use-toast-notify";
import { useUndoStack } from "@/hooks/use-undo-stack";
import type { UndoAction } from "@/hooks/use-undo-stack";
import { useConfigActions } from "@/hooks/use-config-actions";
import { useSiteTagEditor } from "@/hooks/use-site-tag-editor";
import type { SiteDeleteSortContext, TagDeleteSortContext } from "@/hooks/use-site-tag-editor";
import { useSiteName } from "@/hooks/use-site-name";
import { useOnlineCheck } from "@/hooks/use-online-check";
import { useSearchEngineConfig } from "@/hooks/use-search-engine-config";
import { useSocialCards } from "@/hooks/use-social-cards";
import { SearchEngineEditor } from "@/components/admin/search-engine-editor";
import type { SiteFormState } from "@/components/admin/types";
import { FloatingSearchDialog, ConfigConfirmDialog, ImportModeDialog, BookmarkImportDialog, SakuraImportConfirmDialog, SwitchUserDialog, DeleteSocialTagDialog, DeleteTagDialog } from "@/components/dialogs";
import { useSwitchUser } from "@/hooks/use-switch-user";
import type { WallpaperDevice, AssetKind } from "@/hooks/use-appearance";
import {
  BackgroundLayer, AppHeader, SidebarTags, SearchBarSection, SiteContentArea,
  SiteFooter, FloatingActions, ToastLayer, EditorModal, AdminDrawer,
  ContentTitleBar, CardTypePicker, SocialCardTypePicker, SocialCardEditor,
  SettingsModal,
} from "@/components/sakura-nav";
import type { CardSuperType } from "@/components/sakura-nav/card-type-picker";
import type { SettingsTab } from "@/components/sakura-nav";

import { useTagDelete } from "@/hooks/use-tag-delete";

type Props = {
  initialTags: Tag[];
  initialAppearances: Record<ThemeMode, ThemeAppearance>;
  initialSettings: AppSettings;
  initialFloatingButtons: FloatingButtonItem[];
  initialSession: SessionUser | null;
  defaultTheme: ThemeMode;
};

export function SakuraNavApp({
  initialTags,
  initialAppearances,
  initialSettings,
  initialFloatingButtons,
  initialSession,
  defaultTheme,
}: Props) {
  /* ---------- 主题 ---------- */
  const { themeMode, setThemeMode } = useTheme(defaultTheme);

  /* ---------- 基础状态 ---------- */
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialSession?.isAuthenticated));
  const [role, setRole] = useState<import("@/lib/base/types").UserRole | null>(initialSession?.role ?? null);
  const [nickname, setNickname] = useState<string | null>(initialSession?.nickname ?? null);
  const [username, setUsername] = useState<string | null>(initialSession?.username ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialSession?.avatarUrl ?? null);
  const [avatarColor, setAvatarColor] = useState<string | null>(initialSession?.avatarColor ?? null);
  const [tags, setTags] = useState(initialTags);
  const [appearances, setAppearances] = useState(initialAppearances);
  const [settings, setSettings] = useState(initialSettings);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [mobileTagsOpen, setMobileTagsOpen] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const contentScrollRef = useRef<HTMLElement>(null);
  const [floatingSearchOpen, setFloatingSearchOpen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  /* ---------- 切换用户 ---------- */
  const {
    switchUserOpen, setSwitchUserOpen,
    switchableUsers,
    handleUserSwitched,
    handleRemoveSwitchableUser,
  } = useSwitchUser(isAuthenticated, initialSession);

  /* ---------- 悬浮按钮配置 ---------- */
  const [floatingButtons, setFloatingButtons] = useState<FloatingButtonItem[]>(initialFloatingButtons);

  /* ---------- 搜索引擎配置 ---------- */
  const { engineConfigs, setEngineConfigs } = useSearchEngineConfig();
  const [engineEditorOpen, setEngineEditorOpen] = useState(false);

  /* ---------- 搜索栏 ---------- */
  const searchBar = useSearchBar({ engines: engineConfigs });

  /* ---------- 主题切换 ---------- */
  function toggleThemeMode() {
    searchBar.setSearchMenuOpen(false);
    setThemeMode((c) => (c === "light" ? "dark" : "light"));
  }

  /* ---------- Toast + 撤销栈 ---------- */
  const { toasts, dismissToast, decrementToast, decrementBySignature, dismissUndoToasts, setErrorMessage, notifySuccess } = useToastNotify();
  const undoStack = useUndoStack();

  /** 成功消息通知（带可选撤销） — 供各 Hook 使用 */
  const notify = useCallback((msg: string, undo?: UndoAction) => {
    if (undo) {
      // 计算与 Toast 相同的签名，撤销时可同步关闭对应通知
      const signature = `success::操作成功::${msg}`;
      undoStack.push({ ...undo, toastSignature: signature });
    }
    notifySuccess(msg, undo);
  }, [undoStack, notifySuccess]);

  /** 执行撤销并递减对应通知（Toast 按钮调用） */
  const handleToastUndo = useCallback((toastId: number) => {
    decrementToast(toastId);
    const entry = undoStack.pop();
    if (entry) void entry.undo();
  }, [decrementToast, undoStack]);

  /** Ctrl+Z / Cmd+Z 撤销并递减对应通知 */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const entry = undoStack.pop();
        if (!entry) return;
        if (entry.toastSignature) decrementBySignature(entry.toastSignature);
        void entry.undo();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, decrementBySignature]);

  /* ---------- 站点列表 ---------- */
  const siteListState = useSiteList({
    activeTagId,
    isAuthenticated,
    localSearchActive: searchBar.localSearchActive,
    localSearchQuery: searchBar.localSearchQuery,
    refreshNonce,
    onError: setErrorMessage,
    scrollRootRef: contentScrollRef,
  });

  /* ---------- 管理核心状态 ---------- */
  const [adminData, setAdminData] = useState<AdminBootstrap | null>(null);

  /* ---------- 设置弹窗状态（需在 useAppearance 之前声明） ---------- */
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("appearance");
  const [settingsError, setSettingsError] = useState("");

  /* ---------- 外观草稿 ---------- */
  const appearance = useAppearance({
    initialAppearances,
    initialSettings,
    isAuthenticated,
    appearances,
    adminData,
    setAppearances,
    setSettings,
    setAdminData,
    setErrorMessage: settingsModalOpen ? setSettingsError : setErrorMessage,
  });

  /* ---------- 数据同步辅助 ---------- */
  const applyAdminBootstrap = useCallback(
    (data: AdminBootstrap) => {
      setAdminData(data);
      appearance.applyAppearanceBootstrap(data.appearances, data.settings);
    },
    // appearance 是一个包含多个子状态的对象，但 applyAppearanceBootstrap 是稳定的回调
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const syncNavigationData = useCallback(async () => {
    const r = await requestJson<{ items: Tag[] }>("/api/navigation/tags");
    setTags(r.items);
    setRefreshNonce((v) => v + 1);
  }, []);

  const syncAdminBootstrap = useCallback(async () => {
    if (!isAuthenticated) {
      setAdminData(null);
      return;
    }
    applyAdminBootstrap(await requestJson<AdminBootstrap>("/api/admin/bootstrap"));
    // 同步加载悬浮按钮配置
    try {
      const btns = await requestJson<FloatingButtonItem[]>("/api/floating-buttons");
      setFloatingButtons(btns);
    } catch { /* 未授权时静默忽略 */ }
  }, [isAuthenticated, applyAdminBootstrap]);

  /* ---------- 站点/标签编辑器 ---------- */
  const editor = useSiteTagEditor({
    activeTagId,
    onlineCheckEnabled: settings.onlineCheckEnabled,
    setMessage: notify,
    setErrorMessage,
    syncNavigationData,
    syncAdminBootstrap,
  });

  /* ---------- 配置操作 ---------- */
  const config = useConfigActions({
    applyAdminBootstrap,
    setAppearances,
    setTags,
    setSettings,
    setSettingsDraft: appearance.setSettingsDraft,
    setSiteForm: editor.setSiteForm,
    setTagForm: editor.setTagForm,
    setSiteAdminGroup: editor.setSiteAdminGroup,
    setTagAdminGroup: editor.setTagAdminGroup,
    searchBarSetQuery: searchBar.setQuery,
    setRefreshNonce,
    syncNavigationData,
    syncAdminBootstrap,
    onlineCheckEnabled: settings.onlineCheckEnabled,
    getExistingSites: useCallback(
      () => adminData?.sites ?? [],
      [adminData],
    ),
  });

  /* ---------- 站点名称 ---------- */
  const siteName = useSiteName({ settings });

  /* ---------- 在线检查 ---------- */
  const onlineCheck = useOnlineCheck({
    isAuthenticated,
    settings,
    setSettings,
    syncNavigationData,
  });

  /* ---------- 社交卡片 ---------- */
  const socialCards = useSocialCards({
    isAuthenticated,
    setMessage: notify,
    setErrorMessage,
    syncNavigationData,
    syncAdminBootstrap,
    getGlobalSiteIds: useCallback(() => {
      if (!adminData) return [];
      return [...adminData.sites].sort((l, r) => l.globalSortOrder - r.globalSortOrder).map((s) => s.id);
    }, [adminData]),
  });

  /* ---------- 标签删除（普通标签 + 社交卡片标签） ---------- */
  const {
    deleteSocialTagDialogOpen,
    confirmDeleteSocialTag,
    closeSocialTagDialog,
    openSocialTagDialog,
    deleteTagDialogOpen,
    deleteTagTarget,
    handleDeleteTag,
    confirmDeleteTag,
    closeDeleteTagDialog,
  } = useTagDelete({
    adminData,
    editor,
    onDeleteSocialTag: () => void socialCards.deleteAllCards(),
  });

  /* ---------- 抽屉/弹窗状态 ---------- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<"sites" | "tags" | "appearance" | "config">("sites");
  const [cardTypePickerOpen, setCardTypePickerOpen] = useState(false);

  /* ---------- 拖拽 ---------- */
  const drag = useDragSort({
    tags,
    setTags,
    adminData,
    setAdminData,
    siteList: siteListState.siteList,
    setSiteList: siteListState.setSiteList,
    activeTagId,
    debouncedQuery: siteListState.debouncedQuery,
    isAuthenticated,
    editMode: editor.editMode,
    setMessage: notify,
    setErrorMessage,
    onSortError: async () => {
      await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
    },
  });

  // ── Effects ──

  /** 退出编辑模式时清空撤销栈并关闭带撤销按钮的通知 */
  useEffect(() => {
    if (!editor.editMode) {
      undoStack.clear();
      dismissUndoToasts();
    }
  }, [editor.editMode, undoStack, dismissUndoToasts]);

  /** 页面刷新/关闭时，清理待删除的孤立 icon 资源（使用 fetch + keepalive 确保请求发出） */
  useEffect(() => {
    function handleBeforeUnload() {
      editor.flushPendingAssetCleanupSync();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editor]);

  /** 构建删除站点时的排序上下文（用于撤销后恢复原位） */
  const buildSortContext = useCallback((siteId: string): SiteDeleteSortContext | undefined => {
    if (!adminData) return undefined;
    // 全局排序
    const globalSiteIds = [...adminData.sites]
      .sort((l, r) => l.globalSortOrder - r.globalSortOrder)
      .map((s) => s.id);
    // 各标签内排序
    const tagSiteIds: Record<string, string[]> = {};
    for (const tag of adminData.tags) {
      const ids = adminData.sites
        .filter((s) => s.tags.some((t) => t.id === tag.id))
        .sort((l, r) => (l.tags.find((t) => t.id === tag.id)?.sortOrder ?? 0) - (r.tags.find((t) => t.id === tag.id)?.sortOrder ?? 0))
        .map((s) => s.id);
      if (ids.includes(siteId)) tagSiteIds[tag.id] = ids;
    }
    return { globalSiteIds, tagSiteIds };
  }, [adminData]);

  useEffect(() => {
    // 当 activeTagId 对应的标签被删除时清空选中
    if (activeTagId && !tags.some((t) => t.id === activeTagId)) {
      setActiveTagId(null);
    }
  }, [activeTagId, tags]);

  useEffect(() => {
    const checkScroll = () => {
      const el = contentScrollRef.current;
      // 桌面端：内容区容器滚动；移动端：window 滚动
      setShowScrollTopButton((el ? el.scrollTop > 260 : false) || window.scrollY > 260);
    };
    checkScroll();
    const el = contentScrollRef.current;
    el?.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("scroll", checkScroll, { passive: true });
    return () => {
      el?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("scroll", checkScroll);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (!searchBar.searchFormRef.current?.contains(e.target as Node)) searchBar.closeSuggestionMenus();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchBar]);

  useEffect(() => {
    document.title = siteName.siteNameDraft || siteConfig.appName;
  }, [siteName.siteNameDraft]);

  /** 浏览器标签页 Favicon：使用全局 Favicon 草稿预览（对所有用户生效），圆角处理 + 缓存 */
  const faviconUrl = appearance.settingsDraft.faviconUrl || siteConfig.defaultFaviconSrc;
  useEffect(() => {
    void applyRoundedFavicon(faviconUrl);
  }, [faviconUrl]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      applyAdminBootstrap(await requestJson<AdminBootstrap>("/api/admin/bootstrap"));
    })();
  }, [isAuthenticated, applyAdminBootstrap]);

  // ── Handlers ──

  function handleLogout() {
    return (async () => {
      await requestJson("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setRole(null);
      setNickname(null);
      setUsername(null);
      setAvatarUrl(null);
      setAvatarColor(null);
      setDrawerOpen(false);
      setSettingsModalOpen(false);
      config.discardPendingAnalysis();
      editor.resetEditor();
      setAdminData(null);
      await syncNavigationData();
    })();
  }

  // ── Derived ──

  const activeAppearance = appearances[themeMode];
  const activeFont = fontPresets[activeAppearance.fontPreset];
  const hasActiveWallpaper = Boolean(
    activeAppearance.desktopWallpaperUrl || activeAppearance.mobileWallpaperUrl,
  );
  const { desktopCardFrosted, mobileCardFrosted } = activeAppearance;
  const hasActiveMobileWallpaper = Boolean(activeAppearance.mobileWallpaperUrl);
  const hasActiveDesktopWallpaper = Boolean(activeAppearance.desktopWallpaperUrl);
  const activeHeaderLogo = (themeMode === "dark" ? appearance.settingsDraft.darkLogoUrl : appearance.settingsDraft.lightLogoUrl) || siteConfig.logoSrc;
  const displayName = siteName.siteNameDraft || siteConfig.appName;
  const currentTitle = activeTagId
    ? tags.find((t) => t.id === activeTagId)?.name ?? "全部网站"
    : "全部网站";
  const localResultsReady =
    searchBar.localSearchActive &&
    siteListState.listState === "ready" &&
    siteListState.debouncedQuery === searchBar.localSearchQuery;
  const showAiHint = localResultsReady && !searchBar.aiResultsBusy && searchBar.aiResults.length === 0 && !searchBar.aiError;
  const showAiPanel =
    searchBar.localSearchActive && (searchBar.aiResultsBusy || searchBar.aiResults.length > 0 || !!searchBar.aiError);
  const emptyState =
    siteListState.listState === "ready" && siteListState.siteList.items.length === 0
      ? siteListState.debouncedQuery
        ? "当前搜索没有匹配网站，试试换个关键词。"
        : activeTagId
          ? "这个标签下还没有网站。"
          : "这里还没有网站，登录后可以开始创建。"
      : "";

  // ── Render ──

  const pageStyle = {
    fontFamily: activeFont.cssVariable,
    fontSize: `${activeAppearance.fontSize}px`,
    color: activeAppearance.textColor,
  } as const;

  return (
    <main
      className={cn(
        "relative min-h-screen lg:h-screen lg:overflow-hidden transition-colors duration-500",
        themeMode === "dark" ? "text-slate-100" : "text-slate-900",
      )}
      data-theme={themeMode}
      style={pageStyle}
    >
      <BackgroundLayer themeMode={themeMode} appearances={appearances} />
      <div className="relative flex min-h-screen lg:h-full w-full flex-col">
        <AppHeader
          themeMode={themeMode}
          hasActiveWallpaper={hasActiveWallpaper}
          isAuthenticated={isAuthenticated}
          editMode={editor.editMode}
          mobileTagsOpen={mobileTagsOpen}
          displayName={displayName}
          activeHeaderLogo={activeHeaderLogo}
          nickname={nickname}
          username={username}
          avatarUrl={avatarUrl}
          avatarColor={avatarColor}
          onLogoClick={() => {
            setActiveTagId(null);
            searchBar.setQuery("");
            searchBar.setSearchMenuOpen(false);
          }}
          onToggleMobileTags={() => setMobileTagsOpen((v) => !v)}
          onToggleEditMode={editor.toggleEditMode}
          onOpenSettings={() => {
            setSettingsModalOpen(true);
            setSettingsError("");
            appearance.setAppearanceThemeTab(themeMode);
          }}
          onToggleTheme={toggleThemeMode}
          onLogout={() => void handleLogout()}
          onLogin={() => { window.open("/login", "_blank"); }}
          onOpenProfile={() => { window.open("/profile", "_blank"); }}
          onSwitchUser={() => setSwitchUserOpen(true)}
        />
        <section className="flex flex-1 min-h-0 max-lg:flex-col">
          <SidebarTags
            themeMode={themeMode}
            hasActiveWallpaper={hasActiveWallpaper}
            mobileTagsOpen={mobileTagsOpen}
            isAuthenticated={isAuthenticated}
            editMode={editor.editMode}
            tags={tags}
            activeTagId={activeTagId}
            sensors={drag.sensors}
            portalContainer={drag.portalContainer}
            snapToCursorModifier={drag.snapToCursorModifier}
            activeDraggedTag={drag.activeDraggedTag}
            activeDragSize={drag.activeDragSize}
            onDragStart={drag.handleDragStart("tag")}
            onDragCancel={drag.handleDragCancel}
            onDragEnd={(e) => void drag.handleTagSort(e)}
            onSelectTag={(id) => {
              setActiveTagId(id);
              searchBar.setSearchMenuOpen(false);
            }}
            onEditTag={editor.openTagEditor}
            onDeleteTag={handleDeleteTag}
          />
          <section ref={contentScrollRef} className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-5 text-center">
              <div className="w-full space-y-4">
                <ContentTitleBar
                  themeMode={themeMode}
                  hasActiveWallpaper={hasActiveWallpaper}
                  desktopCardFrosted={desktopCardFrosted}
                  mobileCardFrosted={mobileCardFrosted}
                  isAuthenticated={isAuthenticated}
                  editMode={editor.editMode}
                  activeTagId={activeTagId}
                  currentTitle={currentTitle}
                  displayedCount={siteListState.siteList.items.length}
                  totalCount={siteListState.siteList.total}
                  onOpenTagCreator={editor.openTagCreator}
                  onOpenCardCreator={() => setCardTypePickerOpen(true)}
                />
                <SearchBarSection
                  themeMode={themeMode}
                  hasActiveWallpaper={hasActiveWallpaper}
                  desktopCardFrosted={desktopCardFrosted}
                  mobileCardFrosted={mobileCardFrosted}
                  isAuthenticated={isAuthenticated}
                  editMode={editor.editMode}
                  searchFormRef={searchBar.searchFormRef}
                  query={searchBar.query}
                  searchMenuOpen={searchBar.searchMenuOpen}
                  searchSuggestionsOpen={searchBar.searchSuggestionsOpen}
                  searchSuggestionsBusy={searchBar.searchSuggestionsBusy}
                  searchSuggestions={searchBar.searchSuggestions}
                  activeSuggestionIndex={searchBar.activeSuggestionIndex}
                  hoveredSuggestionIndex={searchBar.hoveredSuggestionIndex}
                  highlightedSuggestionIndex={searchBar.highlightedSuggestionIndex}
                  suggestionInteractionMode={searchBar.suggestionInteractionMode}
                  engineMeta={searchBar.engineMeta as { name: string; iconUrl?: string; accent: string } | null}
                  engineList={
                    searchBar.engineList as Array<{
                      id: string;
                      name: string;
                      iconUrl?: string;
                      accent: string;
                    }>
                  }
                  onSubmit={(e) => {
                    e.preventDefault();
                    searchBar.submitSearch();
                  }}
                  onKeyDown={searchBar.handleKeyDown}
                  onQueryChange={searchBar.handleQueryChange}
                  onSuggestionFocus={searchBar.handleSuggestionFocus}
                  onCycleEngine={searchBar.cycleSearchEngine}
                  onSelectEngine={searchBar.selectEngine}
                  onClearInput={searchBar.clearInput}
                  onActivateLocalSearch={searchBar.activateLocalSearch}
                  onApplySuggestion={searchBar.applySuggestion}
                  onDismissSuggestions={searchBar.dismissSuggestions}
                  setActiveSuggestionIndex={searchBar.setActiveSuggestionIndex}
                  setHoveredSuggestionIndex={searchBar.setHoveredSuggestionIndex}
                  setSuggestionInteractionMode={searchBar.setSuggestionInteractionMode}
                  onOpenEngineEditor={() => setEngineEditorOpen(true)}
                />
              </div>
            </div>
            <SiteContentArea
              themeMode={themeMode}
              hasActiveWallpaper={hasActiveWallpaper}
              isAuthenticated={isAuthenticated}
              editMode={editor.editMode}
              localSearchActive={searchBar.localSearchActive}
              localSearchQuery={searchBar.localSearchQuery}
              debouncedQuery={siteListState.debouncedQuery}
              listState={siteListState.listState}
              siteList={siteListState.siteList}
              viewEpoch={siteListState.viewEpoch}
              activeTagId={activeTagId}
              currentTitle={currentTitle}
              activeAppearance={activeAppearance}
              settingsOnlineCheckEnabled={settings.onlineCheckEnabled}
              activeDraggedSite={drag.activeDraggedSite}
              sensors={drag.sensors}
              snapToCursorModifier={drag.snapToCursorModifier}
              dragTransition={dragTransition}
              sentinelRef={siteListState.sentinelRef}
              requestIdRef={siteListState.requestIdRef}
              aiResults={searchBar.aiResults}
              aiResultsBusy={searchBar.aiResultsBusy}
              aiReasoning={searchBar.aiReasoning}
              aiError={searchBar.aiError}
              showAiHint={showAiHint}
              showAiPanel={showAiPanel}
              emptyState={emptyState}
              localSearchClosing={siteListState.localSearchClosing}
              onEditSite={(site) => {
                // 社交卡片站点走卡片编辑器，普通站点走站点编辑器
                if (site.cardType) {
                  const card = socialCards.cards.find((c) => c.id === site.id);
                  if (card) socialCards.openCardEditor(card);
                } else {
                  editor.openSiteEditor(site);
                }
              }}
              onDeleteSite={(site) => {
                if (site.cardType) {
                  const card = socialCards.cards.find((c) => c.id === site.id);
                  if (card) socialCards.openCardEditor(card);
                } else {
                  const snap: SiteFormState = {
                    id: site.id, name: site.name, url: site.url,
                    description: site.description, iconUrl: site.iconUrl ?? "",
                    iconBgColor: site.iconBgColor ?? "transparent",
                    skipOnlineCheck: site.skipOnlineCheck ?? false,
                    tagIds: site.tags.map((t) => t.id),
                  };
                  void editor.deleteCurrentSite(site.id, snap, buildSortContext(site.id));
                }
              }}
              onTagSelect={(id) => {
                setActiveTagId(id);
                searchBar.setSearchMenuOpen(false);
              }}
              onDragStart={drag.handleDragStart("site")}
              onDragCancel={drag.handleDragCancel}
              onDragEnd={(e) => void drag.handleSiteSort(e)}
              onCloseLocalSearch={() => {
                siteListState.closeLocalSearch();
                searchBar.closeLocalSearch();
              }}
              onTriggerAiRecommend={searchBar.triggerAiRecommend}
              onCloseAiPanel={searchBar.closeAiPanel}
              closeLocalSearch={searchBar.closeLocalSearch}
              onCardClick={socialCards.handleCardClick}
              onOpenSiteCreator={editor.openSiteCreator}
              onOpenTagCreator={editor.openTagCreator}
            />
            <SiteFooter
              themeMode={themeMode}
              hasActiveMobileWallpaper={hasActiveMobileWallpaper}
              hasActiveDesktopWallpaper={hasActiveDesktopWallpaper}
            />
          </section>
        </section>
      </div>

      <ToastLayer themeMode={themeMode} toasts={toasts} dismissToast={dismissToast} onUndo={handleToastUndo} />
      <FloatingActions
        themeMode={themeMode}
        showScrollTopButton={showScrollTopButton}
        buttons={floatingButtons}
        onScrollToTop={() => {
          const el = contentScrollRef.current;
          if (el) el.scrollTo({ top: 0, behavior: "smooth" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenFloatingSearch={() => setFloatingSearchOpen(true)}
      />
      <FloatingSearchDialog
        open={floatingSearchOpen}
        themeMode={themeMode}
        activeTagId={activeTagId}
        activeTagName={currentTitle}
        onClose={() => setFloatingSearchOpen(false)}
        engines={engineConfigs}
      />

      <SettingsModal
        open={settingsModalOpen}
        activeTab={settingsTab}
        onTabChange={setSettingsTab}
        onClose={() => {
          setSettingsModalOpen(false);
          setSettingsError("");
          config.discardPendingAnalysis();
          appearance.sealAiApiKey();
        }}
        themeMode={themeMode}
        role={role}
        settingsError={settingsError}
        onClearSettingsError={() => setSettingsError("")}
        /* ── 外观面板 ── */
        appearanceThemeTab={appearance.appearanceThemeTab}
        setAppearanceThemeTab={appearance.setAppearanceThemeTab}
        appearanceDraft={appearance.appearanceDraft}
        setAppearanceDraft={appearance.setAppearanceDraft}
        uploadingTheme={appearance.uploadingTheme}
        uploadingAssetTheme={appearance.uploadingAssetTheme}
        desktopWallpaperInputRef={appearance.desktopWallpaperInputRef}
        mobileWallpaperInputRef={appearance.mobileWallpaperInputRef}
        onUploadWallpaper={(t, d, f) => void appearance.uploadWallpaper(t, d as WallpaperDevice, f)}
        onRemoveWallpaper={appearance.removeWallpaper}
        onTriggerWallpaperFilePicker={(d) => {
          (d === "desktop"
            ? appearance.desktopWallpaperInputRef
            : appearance.mobileWallpaperInputRef
          ).current?.click();
        }}
        onCardFrostedChange={appearance.queueCardFrostedNotice}
        /* ── 数据面板 ── */
        busyAction={config.configBusyAction}
        analyzing={config.analyzing}
        onlineCheckEnabled={settings.onlineCheckEnabled}
        onlineCheckTime={settings.onlineCheckTime}
        onlineCheckBusy={onlineCheck.onlineCheckBusy}
        onlineCheckResult={onlineCheck.onlineCheckResult}
        onExport={() => void config.exportConfig()}
        onImportClick={config.handleImportClick}
        importError={config.importError}
        onReset={() => config.openConfigConfirm("reset")}
        onClear={() => config.openConfigConfirm("clear")}
        onOnlineCheckToggle={(e) => void onlineCheck.handleOnlineCheckToggle(e)}
        onOnlineCheckTimeChange={(h) => void onlineCheck.handleOnlineCheckSettingChange("onlineCheckTime", h)}
        onRunOnlineCheck={() => void onlineCheck.handleRunOnlineCheck()}
        exportCooldown={config.exportCooldown}
        exportCooldownSec={config.exportCooldownSec}
        /* ── 站点面板 ── */
        settingsDraft={appearance.settingsDraft}
        siteName={siteName.siteNameDraft}
        onSiteNameChange={siteName.setSiteNameDraft}
        logoInputRef={appearance.logoInputRef}
        faviconInputRef={appearance.faviconInputRef}
        onUploadAsset={(t, k, f) => void appearance.uploadAsset(t, k as AssetKind, f)}
        onRemoveAsset={appearance.removeAsset}
        onTriggerAssetFilePicker={(k) => {
          (k === "logo" ? appearance.logoInputRef : appearance.faviconInputRef).current?.click();
        }}
        floatingButtons={floatingButtons}
        onFloatingButtonsChange={setFloatingButtons}
        onSaveGlobal={(sn, fb, ai) => appearance.saveGlobalSettings(sn, fb, ai)}
        aiDraftConfig={appearance.aiDraftConfig}
        onAiDraftChange={appearance.updateAiDraft}
      />

      {config.configConfirmAction && isAuthenticated ? (
        <ConfigConfirmDialog
          action={config.configConfirmAction}
          themeMode={themeMode}
          error={config.configConfirmError}
          busy={config.configBusyAction === config.configConfirmAction}
          onClose={config.closeConfigConfirm}
          onSubmit={() => void config.submitConfigConfirm()}
        />
      ) : null}

      {config.importModeOpen && isAuthenticated ? (
        <ImportModeDialog
          filename={config.importModeFilename}
          busy={config.configBusyAction === "import" || config.analyzing}
          themeMode={themeMode}
          onConfirm={() => void config.handleConfirmExternalImport()}
          onClose={config.closeImportModeDialog}
        />
      ) : null}

      {config.sakuraImportConfirmOpen && isAuthenticated ? (
        <SakuraImportConfirmDialog
          filename={config.sakuraImportFilename}
          busy={config.configBusyAction === "import"}
          themeMode={themeMode}
          onConfirm={() => void config.handleConfirmSakuraImport()}
          onClose={config.closeSakuraImportConfirm}
        />
      ) : null}

      {config.bookmarkDialogOpen && isAuthenticated ? (
        <BookmarkImportDialog
          items={config.bookmarkItems}
          busy={config.configBusyAction === "import"}
          themeMode={themeMode}
          onImportAll={(items) => void config.handleImportAllBookmarks(items)}
          onEditItem={(item) => {
            editor.openSiteCreator();
            config.handleEditBookmarkItem(item);
          }}
          onDeleteItem={config.deleteBookmarkItem}
          onClose={config.closeBookmarkDialog}
        />
      ) : null}

      <CardTypePicker
        open={cardTypePickerOpen}
        themeMode={themeMode}
        onSelect={(type: CardSuperType) => {
          setCardTypePickerOpen(false);
          if (type === "site") {
            editor.openSiteCreator();
          } else {
            socialCards.openCardCreator();
          }
        }}
        onClose={() => setCardTypePickerOpen(false)}
      />

      <EditorModal
        open={!!editor.editorPanel && editor.editMode}
        themeMode={themeMode}
        isAuthenticated={isAuthenticated}
        editorPanel={editor.editorPanel}
        siteForm={editor.siteForm}
        setSiteForm={editor.setSiteForm}
        tagForm={editor.tagForm}
        setTagForm={editor.setTagForm}
        tags={tags}
        adminDataTags={adminData?.tags}
        onSubmitSite={(extraTagIds) => {
          // 书签编辑模式：将表单数据回写到书签列表，不走 API
          if (config.bookmarkEditUid) {
            config.handleSaveBookmarkEdit(editor.siteForm);
            editor.closeEditorPanel();
            return;
          }
          void editor.submitSiteForm(extraTagIds);
        }}
        onSubmitTag={() => void editor.submitTagForm()}
        onDeleteSite={
          config.bookmarkEditUid
            ? undefined
            : editor.siteForm.id ? () => void editor.deleteCurrentSite(editor.siteForm.id as string, editor.siteForm, buildSortContext(editor.siteForm.id as string)) : undefined
        }
        onDeleteTag={
          editor.tagForm.id === SOCIAL_TAG_ID
            ? () => { editor.closeEditorPanel(); openSocialTagDialog(); }
            : editor.tagForm.id ? () => {
              const tid = editor.tagForm.id as string;
              const siteIds = adminData?.sites
                .filter((s) => s.tags.some((t) => t.id === tid))
                .map((s) => s.id) ?? [];
              const tagSortCtx: TagDeleteSortContext | undefined = adminData
                ? { orderedTagIds: [...adminData.tags].sort((a, b) => a.sortOrder - b.sortOrder).map((t) => t.id) }
                : undefined;
              void editor.deleteCurrentTag(tid, editor.tagForm, siteIds, tagSortCtx);
            } : undefined
        }
        onTagsChange={async () => {
          await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
        }}
        onClose={() => {
          if (config.bookmarkEditUid) {
            config.handleCancelBookmarkEdit();
          }
          editor.closeEditorPanel();
        }}
        bookmarkEdit={!!config.bookmarkEditUid}
        bookmarkRecommendedTags={config.bookmarkEditUid ? config.bookmarkEditRecommendedTags : undefined}
        bookmarkAutoSelectIcon={!!config.bookmarkEditUid}
      />

      <SocialCardTypePicker
        open={socialCards.showTypePicker}
        themeMode={themeMode}
        onSelect={(type: SocialCardType) => {
          socialCards.setShowTypePicker(false);
          socialCards.setCardForm({ cardType: type, fieldValue: "" });
        }}
        onClose={() => socialCards.setShowTypePicker(false)}
      />

      <SocialCardEditor
        open={!!socialCards.cardForm && editor.editMode}
        themeMode={themeMode}
        cardForm={socialCards.cardForm ?? { cardType: "qq", fieldValue: "" }}
        setCardForm={socialCards.setCardForm}
        onSubmit={() => void socialCards.submitCardForm()}
        onDelete={socialCards.cardForm?.id ? () => void socialCards.deleteCard(socialCards.cardForm!.id!) : undefined}
        onClose={socialCards.closeCardEditor}
      />

      <DeleteSocialTagDialog
        open={deleteSocialTagDialogOpen}
        themeMode={themeMode}
        onConfirm={confirmDeleteSocialTag}
        onClose={closeSocialTagDialog}
      />

      <DeleteTagDialog
        open={deleteTagDialogOpen}
        themeMode={themeMode}
        tagName={deleteTagTarget?.name ?? ""}
        siteCount={deleteTagTarget ? (adminData?.sites.filter((s) => s.tags.some((t) => t.id === deleteTagTarget.id)).length ?? 0) : 0}
        onConfirm={confirmDeleteTag}
        onClose={closeDeleteTagDialog}
      />

      <SwitchUserDialog
        open={switchUserOpen}
        themeMode={themeMode}
        currentUserId={initialSession?.userId ?? ""}
        users={switchableUsers}
        registrationEnabled={settings.registrationEnabled}
        onSwitched={handleUserSwitched}
        onRemoveUser={handleRemoveSwitchableUser}
        onClose={() => setSwitchUserOpen(false)}
      />

      {drawerOpen && isAuthenticated ? (
        <AdminDrawer
          open={drawerOpen}
          themeMode={themeMode}
          isAuthenticated={isAuthenticated}
          adminSection={adminSection}
          setAdminSection={setAdminSection}
          adminData={adminData}
          tags={tags}
          siteForm={editor.siteForm}
          setSiteForm={editor.setSiteForm}
          tagForm={editor.tagForm}
          setTagForm={editor.setTagForm}
          siteActiveGroup={editor.siteAdminGroup}
          setSiteActiveGroup={editor.setSiteAdminGroup}
          tagActiveGroup={editor.tagAdminGroup}
          setTagActiveGroup={editor.setTagAdminGroup}
          onSubmitSite={(extraTagIds) => void editor.submitSiteForm(extraTagIds)}
          onSubmitTag={() => void editor.submitTagForm()}
          onError={setErrorMessage}
          onTagsChange={async () => {
            await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
          }}
          onStartEditSite={(s) => {
            editor.setSiteAdminGroup("edit");
            editor.setSiteForm({
              id: s.id,
              name: s.name,
              url: s.url,
              description: s.description,
              iconUrl: s.iconUrl ?? "",
              iconBgColor: s.iconBgColor ?? "transparent",
              skipOnlineCheck: s.skipOnlineCheck ?? false,
              tagIds: s.tags.map((t) => t.id),
            });
            editor.saveOriginalSnapshot();
          }}
          onStartEditTag={(t) => {
            editor.setTagAdminGroup("edit");
            editor.setTagForm({
              id: t.id,
              name: t.name,
              description: t.description ?? "",
            });
            editor.saveOriginalSnapshot();
          }}
          onDeleteSite={(id) => {
            const s = adminData?.sites.find((site) => site.id === id);
            const snap = s ? {
              id: s.id, name: s.name, url: s.url,
              description: s.description, iconUrl: s.iconUrl ?? "",
              iconBgColor: s.iconBgColor ?? "transparent",
              skipOnlineCheck: s.skipOnlineCheck ?? false,
              tagIds: s.tags.map((t) => t.id),
            } : undefined;
            void editor.deleteCurrentSite(id, snap, buildSortContext(id));
          }}
          onDeleteTag={(id) => {
            const t = adminData?.tags.find((tag) => tag.id === id);
            const snap = t ? {
              id: t.id, name: t.name,
              description: t.description ?? "",
            } : undefined;
            // 获取该标签关联的站点 ID 列表，用于撤销时恢复关联
            const siteIds = adminData?.sites
              .filter((s) => s.tags.some((tag) => tag.id === id))
              .map((s) => s.id) ?? [];
            const tagSortCtx: TagDeleteSortContext | undefined = adminData
              ? { orderedTagIds: [...adminData.tags].sort((a, b) => a.sortOrder - b.sortOrder).map((t) => t.id) }
              : undefined;
            void editor.deleteCurrentTag(id, snap, siteIds, tagSortCtx);
          }}
          onClose={() => {
            setDrawerOpen(false);
            config.discardPendingAnalysis();
          }}
        />
      ) : null}

      {engineEditorOpen && isAuthenticated ? (
        <SearchEngineEditor
          engines={engineConfigs}
          themeMode={themeMode}
          onChange={setEngineConfigs}
          onClose={() => setEngineEditorOpen(false)}
        />
      ) : null}
    </main>
  );
}
