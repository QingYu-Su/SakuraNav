/**
 * 站点内容区域组件
 * @description 主内容区域，包含标题栏、站内搜索结果、网站卡片网格、加载状态等
 */

import {
  closestCenter,
  DndContext,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import type { Modifier, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { LoaderCircle, Sparkles, X, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { SortableSiteCard, SiteCardShell, SiteCardContent, SocialCardContent } from "@/components/ui";
import type { RefObject } from "react";
import { useSensors } from "@dnd-kit/core";
import type { PaginatedSites, Site, SocialCard, ThemeMode } from "@/lib/base/types";
import { SOCIAL_TAG_ID, isSocialCardSite, siteToSocialCard } from "@/lib/base/types";
import { getLocalSearchResultCardClass, getLocalSearchIconClass, getLocalSearchContainerClass, getLocalSearchCloseBtnClass, getLocalSearchAiHintClass, getLocalSearchAiPanelClass, getLocalSearchAiCardClass, getLocalSearchAiIconClass, getLocalSearchSkeletonClass, getLocalSearchEmptyClass, getFrostedGlassStyle } from "./style-helpers";

type SiteContentAreaProps = {
  themeMode: ThemeMode;
  hasActiveWallpaper: boolean;
  isAuthenticated: boolean;
  editMode: boolean;
  localSearchActive: boolean;
  localSearchQuery: string;
  debouncedQuery: string;
  listState: "loading" | "refreshing" | "ready" | "loading-more" | "error";
  siteList: PaginatedSites;
  viewEpoch: number;
  activeTagId: string | null;
  currentTitle: string;
  activeAppearance: { desktopCardFrosted?: number; mobileCardFrosted?: number };
  settingsOnlineCheckEnabled?: boolean;
  activeDraggedSite: Site | null;
  sensors: ReturnType<typeof useSensors>;
  snapToCursorModifier: Modifier;
  dragTransition: { duration: number; easing: string };
  sentinelRef: RefObject<HTMLDivElement | null>;
  requestIdRef: RefObject<number>;
  aiResults: Array<{ site: Site; reason?: string }>;
  aiResultsBusy: boolean;
  aiReasoning: string | null;
  aiError: string;
  showAiHint: boolean;
  showAiPanel: boolean;
  emptyState: string;
  localSearchClosing: boolean;
  onOpenSiteCreator?: () => void;
  onOpenTagCreator?: () => void;
  onEditSite: (site: Site) => void;
  onDeleteSite?: (site: Site) => void;
  onTagSelect: (tagId: string) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragCancel: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onCloseLocalSearch: () => void;
  onTriggerAiRecommend: () => void;
  onCloseAiPanel: () => void;
  closeLocalSearch: () => void;
  /** 社交卡片点击处理 */
  onCardClick: (card: SocialCard) => void;
};

export function SiteContentArea({
  themeMode,
  hasActiveWallpaper,
  isAuthenticated,
  editMode,
  localSearchActive,
  localSearchQuery,
  debouncedQuery,
  listState,
  siteList,
  viewEpoch,
  activeTagId: _activeTagId,
  currentTitle: _currentTitle,
  activeAppearance,
  settingsOnlineCheckEnabled: _settingsOnlineCheckEnabled,
  activeDraggedSite,
  sensors,
  snapToCursorModifier,
  dragTransition,
  sentinelRef,
  requestIdRef: _requestIdRef,
  aiResults,
  aiResultsBusy,
  aiReasoning,
  aiError,
  showAiHint,
  showAiPanel,
  emptyState,
  localSearchClosing,
  onEditSite,
  onDeleteSite,
  onTagSelect,
  onDragStart,
  onDragCancel,
  onDragEnd,
  onCloseLocalSearch,
  onTriggerAiRecommend,
  onCloseAiPanel,
  closeLocalSearch: _closeLocalSearch,
  onCardClick,
  onOpenSiteCreator: _onOpenSiteCreator,
  onOpenTagCreator: _onOpenTagCreator,
}: SiteContentAreaProps) {
  const desktopCardFrosted = activeAppearance.desktopCardFrosted ?? 0;
  const mobileCardFrosted = activeAppearance.mobileCardFrosted ?? 0;
  const frostedStyle = getFrostedGlassStyle(themeMode, desktopCardFrosted, mobileCardFrosted);
  const isSocialTagView = _activeTagId === SOCIAL_TAG_ID;

  /** 渲染单个可排序卡片（自动区分网站/社交卡片） */
  function renderSortableCard(site: Site, index: number) {
    const isCard = isSocialCardSite(site);
    return (
      <SortableSiteCard
        key={site.id}
        site={site}
        index={index}
        viewEpoch={viewEpoch}
        draggable={isAuthenticated && editMode && !debouncedQuery}
        editable={isAuthenticated && editMode}
        onEdit={() => onEditSite(site)}
        onDelete={onDeleteSite ? () => onDeleteSite(site) : undefined}
        onTagSelect={(tagId) => onTagSelect(tagId)}
        themeMode={themeMode}
        wallpaperAware={hasActiveWallpaper}
        desktopCardFrosted={activeAppearance.desktopCardFrosted ?? 0}
        mobileCardFrosted={activeAppearance.mobileCardFrosted ?? 0}
        showOnlineIndicator={!site.skipOnlineCheck && site.accessRules?.mode !== "conditional"}
        onCardClick={isCard ? () => {
          const card = siteToSocialCard(site);
          if (card) onCardClick(card);
        } : undefined}
      />
    );
  }

  /** 拖拽覆盖层内容 */
  const dragOverlayContent = activeDraggedSite ? (
    isSocialCardSite(activeDraggedSite) ? (
      <SiteCardShell
        site={activeDraggedSite}
        overlay
        themeMode={themeMode}
        wallpaperAware={hasActiveWallpaper}
        desktopCardFrosted={activeAppearance.desktopCardFrosted ?? 0}
        mobileCardFrosted={activeAppearance.mobileCardFrosted ?? 0}
      >
        <SocialCardContent
          card={siteToSocialCard(activeDraggedSite)!}
          editable={false}
          draggable={false}
          themeMode={themeMode}
          wallpaperAware={hasActiveWallpaper}
        />
      </SiteCardShell>
    ) : (
      <SiteCardShell
        site={activeDraggedSite}
        overlay
        themeMode={themeMode}
        wallpaperAware={hasActiveWallpaper}
        desktopCardFrosted={activeAppearance.desktopCardFrosted ?? 0}
        mobileCardFrosted={activeAppearance.mobileCardFrosted ?? 0}
      >
        <SiteCardContent
          site={activeDraggedSite}
          editable={false}
          draggable={false}
          onTagSelect={(tagId) => onTagSelect(tagId)}
          themeMode={themeMode}
          wallpaperAware={hasActiveWallpaper}
          showOnlineIndicator={!activeDraggedSite.skipOnlineCheck && activeDraggedSite.accessRules?.mode !== "conditional"}
        />
      </SiteCardShell>
    )
  ) : null;

  return (
    <div className="mt-8 flex-1">
      {localSearchActive ? (
        <div className={getLocalSearchContainerClass(themeMode, desktopCardFrosted, mobileCardFrosted)} style={frostedStyle}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">站内搜索结果</h3>
              <p className="mt-1 text-sm opacity-62">
                {localSearchQuery ? `搜索："${localSearchQuery}"` : "站内搜索结果"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {listState === "loading" || listState === "refreshing" || debouncedQuery !== localSearchQuery ? <LoaderCircle className="h-4 w-4 animate-spin opacity-68" /> : null}
              <button
                type="button"
                onClick={onCloseLocalSearch}
                className={getLocalSearchCloseBtnClass(themeMode, desktopCardFrosted, mobileCardFrosted)}
                style={frostedStyle}
                aria-label="关闭站内搜索"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {showAiHint && localSearchQuery ? (
            <div className={getLocalSearchAiHintClass(themeMode, desktopCardFrosted, mobileCardFrosted)} style={frostedStyle}>
              <span className="opacity-60">没有找到想要的网站？试试&nbsp;</span>
              <button
                type="button"
                onClick={onTriggerAiRecommend}
                className={cn("inline-flex items-center gap-1 font-semibold transition", themeMode === "light" ? "text-purple-600 hover:text-purple-700" : "text-purple-300 hover:text-purple-200")}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI 智能推荐
              </button>
            </div>
          ) : null}

          {showAiPanel ? (
            <div className={getLocalSearchAiPanelClass(themeMode, desktopCardFrosted, mobileCardFrosted)} style={frostedStyle}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="flex items-center gap-2 text-base font-semibold">
                    <Sparkles className={cn("h-4 w-4", themeMode === "light" ? "text-purple-500" : "text-purple-400")} />
                    AI 智能推荐
                  </h4>
                  {aiReasoning ? (
                    <p className={cn("mt-1 text-sm", themeMode === "light" ? "text-purple-600/80" : "text-purple-300/80")}>{aiReasoning}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onCloseAiPanel}
                  className={getLocalSearchCloseBtnClass(themeMode, desktopCardFrosted, mobileCardFrosted)}
                  style={frostedStyle}
                  aria-label="关闭 AI 推荐"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {aiError ? (
                <div className={cn("flex items-center gap-2 rounded-[22px] border border-dashed px-4 py-3 text-sm", themeMode === "light" ? "border-amber-300/30 bg-amber-500/5 text-amber-600" : "border-amber-400/20 bg-amber-500/8 text-amber-300")}>
                  <CircleAlert className="h-4 w-4 shrink-0" />
                  {aiError}
                </div>
              ) : aiResultsBusy && !aiResults.length ? (
                <div className={cn("flex items-center gap-2 rounded-[22px] border border-dashed px-4 py-5 text-sm", themeMode === "light" ? "border-purple-300/24 bg-purple-500/5 text-purple-600/70" : "border-purple-400/20 bg-purple-500/6 text-purple-300/70")}>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  AI 正在分析所有网站，为你寻找最匹配的结果...
                </div>
              ) : aiResults.length ? (
                <div className="site-card-grid gap-3">
                  {aiResults.map(({ site, reason }) => (
                    <a
                      key={site.id}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={getLocalSearchAiCardClass(themeMode, desktopCardFrosted, mobileCardFrosted)}
                      style={frostedStyle}
                    >
                      <div className="flex items-start gap-3">
                        {site.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={site.iconUrl} alt={`${site.name} icon`} className={getLocalSearchAiIconClass(themeMode, desktopCardFrosted, mobileCardFrosted)} style={frostedStyle} />
                        ) : (
                          <span className={cn(getLocalSearchAiIconClass(themeMode, desktopCardFrosted, mobileCardFrosted), "inline-flex items-center justify-center text-sm font-semibold")} style={frostedStyle}>
                            {site.name.charAt(0)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <h5 className="truncate text-sm font-semibold">{site.name}</h5>
                          {reason ? (
                            <p className={cn("mt-1 text-xs", themeMode === "light" ? "text-purple-700/80" : "text-purple-300/90")}>
                              <span className={cn("", themeMode === "light" ? "text-purple-500/70" : "text-purple-400/70")}>推荐理由：</span>{reason}
                            </p>
                          ) : null}
                          {site.description ? (
                            <p className={cn("mt-1 line-clamp-2 text-xs", themeMode === "light" ? "text-slate-500" : "text-white/55")}>{site.description}</p>
                          ) : null}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {listState === "loading" || listState === "refreshing" || debouncedQuery !== localSearchQuery ? (
            <div className="site-card-grid gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className={getLocalSearchSkeletonClass(themeMode)} />
              ))}
            </div>
          ) : siteList.items.length > 0 ? (
            <div className="site-card-grid gap-3">
              {siteList.items.map((site) => (
                <a
                  key={site.id}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={getLocalSearchResultCardClass(themeMode, desktopCardFrosted, mobileCardFrosted)}
                  style={frostedStyle}
                >
                  <div className="flex items-start gap-3">
                    {site.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={site.iconUrl} alt={`${site.name} icon`} className={getLocalSearchIconClass(themeMode, desktopCardFrosted, mobileCardFrosted)} style={frostedStyle} />
                    ) : (
                      <span className={cn(getLocalSearchIconClass(themeMode, desktopCardFrosted, mobileCardFrosted), "inline-flex items-center justify-center text-sm font-semibold")} style={frostedStyle}>
                        {site.name.charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold">{site.name}</h4>
                      <p className="mt-1 line-clamp-2 text-sm opacity-65">{site.description}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className={getLocalSearchEmptyClass(themeMode)}>
              当前范围内没有匹配的网站。
            </div>
          )}
        </div>
      ) : (
        <>
          {listState === "refreshing" ? (
            <div className="mx-auto mb-4 w-full max-w-[1440px]">
              <div className="relative h-1 overflow-hidden rounded-full bg-white/12 animate-progress-sweep" />
            </div>
          ) : null}

          {localSearchClosing || listState === "loading" ? (
            <div className="site-card-grid gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className={getLocalSearchSkeletonClass(themeMode)} />
              ))}
            </div>
          ) : emptyState && !isSocialTagView ? (
            <div className="mx-auto flex w-full max-w-[1440px] items-center justify-center rounded-[24px] border border-dashed border-white/20 bg-white/10 px-6 py-5 text-center">
              <p className="text-sm leading-7 opacity-60">{emptyState}</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={onDragStart}
              onDragCancel={onDragCancel}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={siteList.items.map((site) => site.id)}
                strategy={rectSortingStrategy}
              >
                <div
                  className={cn(
                    "mx-auto w-full max-w-[1440px] site-card-grid gap-4 transition-all duration-300 ease-out",
                    listState === "refreshing" ? "scale-[0.985] opacity-55 blur-[2px] saturate-75" : "",
                  )}
                >
                  {siteList.items.map((site, index) => renderSortableCard(site, index))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={dragTransition} modifiers={[snapToCursorModifier]}>
                {dragOverlayContent}
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

        </>
      )}
    </div>
  );
}
