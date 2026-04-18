/**
 * SakuraNav 主应用组件
 * @description 导航站的核心编排组件，整合各子模块
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { fontPresets, siteConfig } from "@/lib/config/config";
import type {
  AppSettings,
  AdminBootstrap,
  SessionUser,
  Tag,
  ThemeAppearance,
  ThemeMode,
} from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import { cn } from "@/lib/utils/utils";
import { useTheme } from "@/hooks/use-theme";
import { useSiteList } from "@/hooks/use-site-list";
import { useAppearance } from "@/hooks/use-appearance";
import { useDragSort, dragTransition } from "@/hooks/use-drag-sort";
import { useSearchBar } from "@/hooks/use-search-bar";
import { useToastNotify } from "@/hooks/use-toast-notify";
import { useConfigActions } from "@/hooks/use-config-actions";
import { useSiteTagEditor } from "@/hooks/use-site-tag-editor";
import { useSiteName } from "@/hooks/use-site-name";
import { useOnlineCheck } from "@/hooks/use-online-check";
import { useSearchEngineConfig } from "@/hooks/use-search-engine-config";
import { SearchEngineEditor } from "@/components/admin/search-engine-editor";
import { FloatingSearchDialog, ConfigConfirmDialog, WallpaperUrlDialog, AssetUrlDialog } from "@/components/dialogs";
import type { WallpaperDevice } from "@/components/dialogs/wallpaper-url-dialog";
import type { AssetKind } from "@/components/dialogs/asset-url-dialog";
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
  ContentTitleBar,
} from "@/components/sakura-nav";

type Props = {
  initialTags: Tag[];
  initialAppearances: Record<ThemeMode, ThemeAppearance>;
  initialSettings: AppSettings;
  initialSession: SessionUser | null;
  defaultTheme: ThemeMode;
};

export function SakuraNavApp({
  initialTags,
  initialAppearances,
  initialSettings,
  initialSession,
  defaultTheme,
}: Props) {
  /* ---------- 主题 ---------- */
  const { themeMode, setThemeMode } = useTheme(defaultTheme);

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
  const { engineConfigs, setEngineConfigs } = useSearchEngineConfig();
  const [engineEditorOpen, setEngineEditorOpen] = useState(false);

  /* ---------- 搜索栏 ---------- */
  const searchBar = useSearchBar({ engines: engineConfigs });

  /* ---------- 主题切换 ---------- */
  function toggleThemeMode() {
    searchBar.setSearchMenuOpen(false);
    setThemeMode((c) => (c === "light" ? "dark" : "light"));
  }

  /* ---------- Toast ---------- */
  const { toasts, dismissToast, setMessage, setErrorMessage } = useToastNotify();

  /* ---------- 站点列表 ---------- */
  const siteListState = useSiteList({
    activeTagId,
    isAuthenticated,
    localSearchActive: searchBar.localSearchActive,
    localSearchQuery: searchBar.localSearchQuery,
    refreshNonce,
    onError: setErrorMessage,
  });

  /* ---------- 管理核心状态 ---------- */
  const [adminData, setAdminData] = useState<AdminBootstrap | null>(null);

  /* ---------- 外观草稿 ---------- */
  const appearance = useAppearance({
    initialAppearances,
    initialSettings,
    isAuthenticated,
    settings,
    appearances,
    adminData,
    setAppearances,
    setSettings,
    setAdminData,
    setMessage,
    setErrorMessage,
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
  }, [isAuthenticated, applyAdminBootstrap]);

  /* ---------- 站点/标签编辑器 ---------- */
  const editor = useSiteTagEditor({
    activeTagId,
    setMessage,
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
    setMessage,
    setErrorMessage,
  });

  /* ---------- 站点名称 ---------- */
  const siteName = useSiteName({ settings, setSettings });

  /* ---------- 在线检查 ---------- */
  const onlineCheck = useOnlineCheck({
    isAuthenticated,
    settings,
    setSettings,
    syncNavigationData,
  });

  /* ---------- 抽屉/弹窗状态 ---------- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<"sites" | "tags" | "appearance" | "config">("sites");
  const [appearanceDrawerOpen, setAppearanceDrawerOpen] = useState(false);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

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
    setMessage,
    setErrorMessage,
    onSortError: async () => {
      await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
    },
  });

  // ── Effects ──

  useEffect(() => {
    // 当 activeTagId 对应的标签被删除时清空选中
    if (activeTagId && !tags.some((t) => t.id === activeTagId)) {
      setActiveTagId(null);
    }
  }, [activeTagId, tags]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTopButton(window.scrollY > 260);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (!searchBar.searchFormRef.current?.contains(e.target as Node)) searchBar.closeSuggestionMenus();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchBar]);

  useEffect(() => {
    document.title = settings.siteName || siteConfig.appName;
  }, [settings.siteName]);

  useEffect(() => {
    const faviconUrl = appearances[themeMode].faviconUrl || siteConfig.logoSrc;
    const link: HTMLLinkElement =
      document.querySelector("link[rel='icon']") || document.createElement("link");
    link.rel = "icon";
    link.href = faviconUrl;
    if (!document.querySelector("link[rel='icon']")) document.head.appendChild(link);
  }, [appearances, themeMode]);

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
      setDrawerOpen(false);
      setAppearanceDrawerOpen(false);
      setConfigDrawerOpen(false);
      editor.resetEditor();
      setAdminData(null);
      setMessage("已退出登录，编辑权限已关闭。");
      await syncNavigationData();
    })();
  }

  // ── Derived ──

  const activeAppearance = appearances[themeMode];
  const activeFont = fontPresets[activeAppearance.fontPreset];
  const hasActiveWallpaper = Boolean(
    activeAppearance.desktopWallpaperUrl || activeAppearance.mobileWallpaperUrl,
  );
  const hasActiveMobileWallpaper = Boolean(activeAppearance.mobileWallpaperUrl);
  const hasActiveDesktopWallpaper = Boolean(activeAppearance.desktopWallpaperUrl);
  const activeHeaderLogo = activeAppearance.logoUrl || siteConfig.logoSrc;
  const displayName = settings.siteName || siteConfig.appName;
  const currentTitle = activeTagId
    ? tags.find((t) => t.id === activeTagId)?.name ?? "全部网站"
    : "全部网站";
  const localResultsReady =
    searchBar.localSearchActive &&
    siteListState.listState === "ready" &&
    siteListState.debouncedQuery === searchBar.localSearchQuery;
  const showAiHint = localResultsReady && !searchBar.aiResultsBusy && searchBar.aiResults.length === 0;
  const showAiPanel =
    searchBar.localSearchActive && (searchBar.aiResultsBusy || searchBar.aiResults.length > 0);
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
        "relative min-h-screen overflow-hidden transition-colors duration-500",
        themeMode === "dark" ? "text-slate-100" : "text-slate-900",
      )}
      data-theme={themeMode}
      style={pageStyle}
    >
      <BackgroundLayer themeMode={themeMode} appearances={appearances} />
      <div className="relative flex min-h-screen w-full flex-col">
        <AppHeader
          themeMode={themeMode}
          hasActiveWallpaper={hasActiveWallpaper}
          isAuthenticated={isAuthenticated}
          editMode={editor.editMode}
          mobileTagsOpen={mobileTagsOpen}
          displayName={displayName}
          activeHeaderLogo={activeHeaderLogo}
          onLogoClick={() => {
            setActiveTagId(null);
            searchBar.setQuery("");
            searchBar.setSearchMenuOpen(false);
          }}
          onToggleMobileTags={() => setMobileTagsOpen((v) => !v)}
          onToggleEditMode={editor.toggleEditMode}
          onOpenAppearanceDrawer={() => {
            setConfigDrawerOpen(false);
            setAppearanceDrawerOpen(true);
            appearance.setAppearanceThemeTab(themeMode);
          }}
          onOpenConfigDrawer={() => {
            setAppearanceDrawerOpen(false);
            setConfigDrawerOpen(true);
          }}
          onToggleTheme={toggleThemeMode}
          onLogout={() => void handleLogout()}
        />
        <section className="flex flex-1 max-lg:flex-col">
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
          />
          <section className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-5 text-center">
              <div className="w-full space-y-4">
                <ContentTitleBar
                  themeMode={themeMode}
                  hasActiveWallpaper={hasActiveWallpaper}
                  isAuthenticated={isAuthenticated}
                  editMode={editor.editMode}
                  activeTagId={activeTagId}
                  currentTitle={currentTitle}
                  displayedCount={siteListState.siteList.items.length}
                  totalCount={siteListState.siteList.total}
                  onOpenSiteCreator={editor.openSiteCreator}
                  onOpenTagCreator={editor.openTagCreator}
                />
                <SearchBarSection
                  themeMode={themeMode}
                  hasActiveWallpaper={hasActiveWallpaper}
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
                  onOpenEngineEditor={() => setEngineEditorOpen(true)}
                  setActiveSuggestionIndex={searchBar.setActiveSuggestionIndex}
                  setHoveredSuggestionIndex={searchBar.setHoveredSuggestionIndex}
                  setSuggestionInteractionMode={searchBar.setSuggestionInteractionMode}
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
              showAiHint={showAiHint}
              showAiPanel={showAiPanel}
              emptyState={emptyState}
              localSearchClosing={siteListState.localSearchClosing}
              onOpenSiteCreator={editor.openSiteCreator}
              onOpenTagCreator={editor.openTagCreator}
              onEditSite={editor.openSiteEditor}
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
              setDebouncedQuery={siteListState.setDebouncedQuery}
              closeLocalSearch={searchBar.closeLocalSearch}
            />
            <SiteFooter
              themeMode={themeMode}
              hasActiveMobileWallpaper={hasActiveMobileWallpaper}
              hasActiveDesktopWallpaper={hasActiveDesktopWallpaper}
            />
          </section>
        </section>
      </div>

      <ToastLayer toasts={toasts} dismissToast={dismissToast} />
      <FloatingActions
        showScrollTopButton={showScrollTopButton}
        onScrollToTop={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        onOpenFloatingSearch={() => setFloatingSearchOpen(true)}
      />
      <FloatingSearchDialog
        open={floatingSearchOpen}
        activeTagId={activeTagId}
        activeTagName={currentTitle}
        onClose={() => setFloatingSearchOpen(false)}
        engines={engineConfigs}
      />

      <AppearanceDrawer
        open={appearanceDrawerOpen}
        isAuthenticated={isAuthenticated}
        appearanceThemeTab={appearance.appearanceThemeTab}
        setAppearanceThemeTab={appearance.setAppearanceThemeTab}
        appearanceDraft={appearance.appearanceDraft}
        setAppearanceDraft={appearance.setAppearanceDraft}
        uploadingTheme={appearance.uploadingTheme}
        appearanceMenuTarget={appearance.appearanceMenuTarget}
        assetMenuTarget={appearance.assetMenuTarget}
        uploadingAssetTheme={appearance.uploadingAssetTheme}
        desktopWallpaperInputRef={appearance.desktopWallpaperInputRef}
        mobileWallpaperInputRef={appearance.mobileWallpaperInputRef}
        logoInputRef={appearance.logoInputRef}
        faviconInputRef={appearance.faviconInputRef}
        onUploadWallpaper={(t, d, f) => void appearance.uploadWallpaper(t, d as WallpaperDevice, f)}
        onOpenWallpaperUrlDialog={appearance.openWallpaperUrlDialog}
        onOpenWallpaperMenu={appearance.setAppearanceMenuTarget}
        onRemoveWallpaper={appearance.removeWallpaper}
        onTriggerWallpaperFilePicker={(d) => {
          (d === "desktop"
            ? appearance.desktopWallpaperInputRef
            : appearance.mobileWallpaperInputRef
          ).current?.click();
          appearance.setAppearanceMenuTarget(null);
        }}
        onUploadAsset={(t, k, f) => void appearance.uploadAsset(t, k as AssetKind, f)}
        onOpenAssetUrlDialog={appearance.openAssetUrlDialog}
        onOpenAssetMenu={appearance.setAssetMenuTarget}
        onRemoveAsset={appearance.removeAsset}
        onTriggerAssetFilePicker={(k) => {
          (k === "logo" ? appearance.logoInputRef : appearance.faviconInputRef).current?.click();
          appearance.setAssetMenuTarget(null);
        }}
        onTypographyChange={appearance.queueTypographyNotice}
        onRestoreTypographyDefaults={appearance.restoreThemeTypographyDefaults}
        onCardFrostedChange={appearance.queueCardFrostedNotice}
        onClose={() => {
          setAppearanceDrawerOpen(false);
          appearance.setAppearanceMenuTarget(null);
        }}
      />

      <ConfigDrawer
        open={configDrawerOpen}
        isAuthenticated={isAuthenticated}
        siteName={siteName.siteNameDraft}
        siteNameBusy={siteName.siteNameBusy}
        selectedFile={config.configImportFile}
        busyAction={config.configBusyAction}
        onlineCheckEnabled={settings.onlineCheckEnabled}
        onlineCheckTime={settings.onlineCheckTime}
        onlineCheckBusy={onlineCheck.onlineCheckBusy}
        onlineCheckResult={onlineCheck.onlineCheckResult}
        onSiteNameChange={siteName.debouncedSiteNameSave}
        onFileChange={config.setConfigImportFile}
        onExport={() => config.openConfigConfirm("export")}
        onImport={() => config.openConfigConfirm("import")}
        onReset={() => config.openConfigConfirm("reset")}
        onOnlineCheckToggle={(e) => void onlineCheck.handleOnlineCheckToggle(e)}
        onOnlineCheckTimeChange={(h) => void onlineCheck.handleOnlineCheckSettingChange("onlineCheckTime", h)}
        onRunOnlineCheck={() => void onlineCheck.handleRunOnlineCheck()}
        onClose={() => setConfigDrawerOpen(false)}
      />

      {config.configConfirmAction && isAuthenticated ? (
        <ConfigConfirmDialog
          action={config.configConfirmAction}
          password={config.configConfirmPassword}
          error={config.configConfirmError}
          busy={config.configBusyAction === config.configConfirmAction}
          onPasswordChange={config.handlePasswordChange}
          onClose={config.closeConfigConfirm}
          onSubmit={() => void config.submitConfigConfirm()}
        />
      ) : null}

      {appearance.wallpaperUrlTarget && isAuthenticated ? (
        <WallpaperUrlDialog
          target={appearance.wallpaperUrlTarget}
          value={appearance.wallpaperUrlValue}
          error={appearance.wallpaperUrlError}
          busy={appearance.wallpaperUrlBusy}
          onValueChange={(v) => {
            appearance.setWallpaperUrlValue(v);
            if (appearance.wallpaperUrlError) appearance.setWallpaperUrlError("");
          }}
          onClose={appearance.closeWallpaperUrlDialog}
          onSubmit={appearance.submitWallpaperUrl}
        />
      ) : null}

      {appearance.assetUrlTarget && isAuthenticated ? (
        <AssetUrlDialog
          target={appearance.assetUrlTarget}
          value={appearance.assetUrlValue}
          error={appearance.assetUrlError}
          busy={appearance.assetUrlBusy}
          onValueChange={(v) => {
            appearance.setAssetUrlValue(v);
            if (appearance.assetUrlError) appearance.setAssetUrlError("");
          }}
          onClose={appearance.closeAssetUrlDialog}
          onSubmit={appearance.submitAssetUrl}
        />
      ) : null}

      <EditorModal
        open={!!editor.editorPanel && editor.editMode}
        isAuthenticated={isAuthenticated}
        editorPanel={editor.editorPanel}
        siteForm={editor.siteForm}
        setSiteForm={editor.setSiteForm}
        tagForm={editor.tagForm}
        setTagForm={editor.setTagForm}
        tags={tags}
        adminDataTags={adminData?.tags}
        onSubmitSite={() => void editor.submitSiteForm()}
        onSubmitTag={() => void editor.submitTagForm()}
        onDeleteSite={
          editor.siteForm.id ? () => void editor.deleteCurrentSite(editor.siteForm.id as string) : undefined
        }
        onDeleteTag={editor.tagForm.id ? () => void editor.deleteCurrentTag(editor.tagForm.id as string) : undefined}
        onTagsChange={async () => {
          await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
        }}
        onClose={editor.closeEditorPanel}
      />

      {drawerOpen && isAuthenticated ? (
        <AdminDrawer
          open={drawerOpen}
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
          onSubmitSite={() => void editor.submitSiteForm()}
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
              tagIds: s.tags.map((t) => t.id),
            });
          }}
          onStartEditTag={(t) => {
            editor.setTagAdminGroup("edit");
            editor.setTagForm({
              id: t.id,
              name: t.name,
              isHidden: t.isHidden,
              description: t.description ?? "",
            });
          }}
          onDeleteSite={(id) => void editor.deleteCurrentSite(id)}
          onDeleteTag={(id) => void editor.deleteCurrentTag(id)}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}

      {engineEditorOpen && isAuthenticated ? (
        <SearchEngineEditor
          engines={engineConfigs}
          onChange={setEngineConfigs}
          onClose={() => setEngineEditorOpen(false)}
        />
      ) : null}
    </main>
  );
}
