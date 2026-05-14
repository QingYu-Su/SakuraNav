/**
 * 导航站布局组件 — 消费 Context，渲染所有子组件
 * @description 从 Context 提取数据并计算派生值，将 props 传递给各子组件
 * 新增 UI 组件时在此文件中添加渲染逻辑，主组件无需修改
 */

"use client";

import { fontPresets, siteConfig } from "@/lib/config/config";
import { cn, isMobileViewport } from "@/lib/utils/utils";
import { siteToFormState } from "@/components/admin/types";
import { dragTransition } from "@/hooks/use-drag-sort";
import { useSakuraNavContext } from "./sakura-nav-context";
import {
  BackgroundLayer, AppHeader, SidebarTags, SearchBarSection,
  SiteContentArea, SiteFooter, FloatingActions, ToastLayer,
  ContentTitleBar, SakuraDialogLayer,
} from "@/components/sakura-nav";
import { buildThemeBackground } from "./style-helpers";
import { SiteContextMenu } from "@/components/ui/site-context-menu";
import { SnapshotHistoryDialog } from "@/components/dialogs";

export function SakuraNavLayout() {
  const ctx = useSakuraNavContext();
  const {
    themeMode, appearances, toggleThemeMode,
    isAuthenticated,
    nickname, username, avatarUrl, avatarColor, handleLogout,
    tags, activeTagId, setActiveTagId,
    mobileTagsOpen, setMobileTagsOpen, contentScrollRef,
    appearance, editor, socialCards, noteCards,
    searchBar, siteListState, siteName, drag,
    toasts, dismissToast, handleToastUndo,
    dlState, dlCallbacks,
    syncNavigationData, syncAdminBootstrap, buildSortContext,
    floatingButtons,
    tagDelete,
    locateCardId, clearLocateCard, locateToCard,
  } = ctx;

  // ── 派生数据 ──

  const activeAppearance = appearances[themeMode];
  const activeFont = fontPresets[activeAppearance.fontPreset];
  const hasActiveWallpaper = Boolean(activeAppearance.desktopWallpaperUrl || activeAppearance.mobileWallpaperUrl);
  const { desktopCardFrosted, mobileCardFrosted } = activeAppearance;
  const hasActiveMobileWallpaper = Boolean(activeAppearance.mobileWallpaperUrl);
  const hasActiveDesktopWallpaper = Boolean(activeAppearance.desktopWallpaperUrl);
  const activeHeaderLogo = (themeMode === "dark" ? appearance.settingsDraft.darkLogoUrl : appearance.settingsDraft.lightLogoUrl) || siteConfig.logoSrc;
  const displayName = siteName.siteNameDraft || siteConfig.appName;
  const currentTitle = activeTagId
    ? tags.find((t) => t.id === activeTagId)?.name ?? "全部卡片"
    : "全部卡片";
  const showAiHint = searchBar.localSearchActive && !!searchBar.localSearchQuery && !searchBar.aiResultsBusy && searchBar.aiResults.length === 0 && !searchBar.aiError && !searchBar.workflowBusy && searchBar.workflowSteps.length === 0 && !searchBar.workflowError;
  const showAiPanel = Boolean(
    searchBar.localSearchActive && (searchBar.aiResultsBusy || searchBar.aiResults.length > 0 || !!searchBar.aiError),
  );
  const showWorkflowPanel = Boolean(
    searchBar.localSearchActive && (searchBar.workflowBusy || searchBar.workflowSteps.length > 0 || searchBar.workflowError),
  );
  const emptyState =
    siteListState.listState === "ready" && siteListState.siteList.items.length === 0
      ? siteListState.debouncedQuery
        ? "当前搜索没有匹配的卡片，试试换个关键词。"
        : activeTagId
          ? "这个标签下还没有卡片。"
          : "这里还没有卡片，登录后可以开始创建。"
      : "";

  const pageStyle = {
    fontFamily: activeFont.cssVariable,
    fontSize: `${activeAppearance.fontSize}px`,
    color: activeAppearance.textColor,
  } as const;

  // ── 渲染布局骨架 ──

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
            dlCallbacks.openSettings();
            appearance.setAppearanceThemeTab(themeMode);
          }}
          onToggleTheme={toggleThemeMode}
          onLogout={() => void handleLogout()}
          onLogin={() => {
            if (isMobileViewport()) {
              window.location.href = "/login";
            } else {
              window.open("/login", "_blank");
            }
          }}
          onOpenProfile={() => {
            if (isMobileViewport()) {
              window.location.href = "/profile";
            } else {
              window.open("/profile", "_blank");
            }
          }}
          onSwitchUser={() => ctx.setSwitchUserOpen(true)}
        />
        <section
          className="content-backdrop-root flex flex-1 min-h-0 max-lg:flex-col"
          style={{
            "--content-bg-m": buildThemeBackground(themeMode, "mobile", appearances),
            "--content-bg-d": buildThemeBackground(themeMode, "desktop", appearances),
          } as React.CSSProperties}
        >
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
            onDeleteTag={tagDelete.handleDeleteTag}
          />
          <section ref={contentScrollRef} className={cn("flex min-w-0 flex-1 flex-col px-4 pt-6 pb-20 sm:px-6 lg:px-8 lg:pb-6 lg:overflow-y-auto", mobileTagsOpen && "max-lg:hidden")}>
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
                  onOpenCardCreator={dlCallbacks.openCardTypePicker}
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
                      id: string; name: string; iconUrl?: string; accent: string;
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
                  onOpenEngineEditor={dlCallbacks.openEngineEditor}
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
              locateCardId={locateCardId}
              onClearLocate={clearLocateCard}
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
              workflowSteps={searchBar.workflowSteps}
              workflowBusy={searchBar.workflowBusy}
              workflowReasoning={searchBar.workflowReasoning}
              workflowError={searchBar.workflowError}
              showWorkflowPanel={showWorkflowPanel}
              emptyState={emptyState}
              localSearchClosing={siteListState.localSearchClosing}
              resultsDismissed={siteListState.resultsDismissed}
              onClearSearchResults={siteListState.abortAndClearResults}
              onEditSite={(site) => {
                if (site.cardType === "note") {
                  const card = noteCards.cards.find((c) => c.id === site.id);
                  if (card) noteCards.openCardEditor(card);
                } else if (site.cardType) {
                  const card = socialCards.cards.find((c) => c.id === site.id);
                  if (card) socialCards.openCardEditor(card);
                } else {
                  editor.openSiteEditor(site);
                }
              }}
              onDeleteSite={(site) => {

                if (site.cardType === "note") {
                  void noteCards.deleteCard(site.id);
                } else if (site.cardType) {
                  void socialCards.deleteCard(site.id);
                } else {
                  void editor.deleteCurrentSite(site.id, siteToFormState(site), buildSortContext(site.id));
                }
              }}
              onTagSelect={(id) => {
                setActiveTagId(id);
                searchBar.setSearchMenuOpen(false);
                if (locateCardId) clearLocateCard();
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
              onTriggerAiWorkflow={searchBar.triggerAiWorkflow}
              onCloseWorkflowPanel={searchBar.closeWorkflowPanel}
              closeLocalSearch={searchBar.closeLocalSearch}
              onCardClick={socialCards.handleCardClick}
              onNoteCardClick={(card) => {
                // 优先使用 cards 数组中的最新数据（编辑保存后 cards 已更新，但 site 列表可能未刷新）
                const freshCard = noteCards.cards.find((c) => c.id === card.id);
                noteCards.setViewCard(freshCard ?? card);
              }}
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
      <SiteContextMenu themeMode={themeMode} onMemoChange={() => void Promise.all([syncNavigationData(), syncAdminBootstrap()])} onLocateNote={(noteId) => locateToCard(noteId)} />
      <FloatingActions
        themeMode={themeMode}
        showScrollTopButton={dlState.showScrollTopButton}
        buttons={floatingButtons}
        isAuthenticated={isAuthenticated}
        editMode={editor.editMode}
        onScrollToTop={() => {
          const el = contentScrollRef.current;
          if (el) el.scrollTo({ top: 0, behavior: "smooth" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenFloatingSearch={dlCallbacks.openFloatingSearch}
        onOpenSnapshotHistory={() => ctx.setSnapshotDialogOpen(true)}
        onOpenTagCreator={editor.openTagCreator}
        onOpenCardTypePicker={dlCallbacks.openCardTypePicker}
      />

      {/* ── 快照历史弹窗 ── */}
      <SnapshotHistoryDialog
        open={ctx.snapshotDialogOpen}
        themeMode={themeMode}
        snapshots={ctx.snapshots}
        loading={ctx.snapshotLoading}
        busy={ctx.snapshotBusy}
        onLoadSnapshots={ctx.loadSnapshots}
        onRestore={ctx.restoreSnapshot}
        onDelete={ctx.deleteSnapshot}
        onRename={ctx.renameSnapshot}
        onClose={() => ctx.setSnapshotDialogOpen(false)}
      />

      {/* ── 弹窗/对话框统一渲染层（直接消费 Context，无需传 props） ── */}
      <SakuraDialogLayer />
    </main>
  );
}
