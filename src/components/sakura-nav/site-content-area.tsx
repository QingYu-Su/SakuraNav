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
import { LoaderCircle, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortableSiteCard, SiteCardShell, SiteCardContent } from "@/components/ui";
import type { RefObject } from "react";
import { useSensors } from "@dnd-kit/core";
import type { PaginatedSites, Site, ThemeMode } from "@/lib/types";

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
  activeAppearance: { desktopCardFrosted?: boolean; mobileCardFrosted?: boolean };
  settingsOnlineCheckEnabled: boolean;
  activeDraggedSite: Site | null;
  sensors: ReturnType<typeof useSensors>;
  snapToCursorModifier: Modifier;
  dragTransition: { duration: number; easing: string };
  sentinelRef: RefObject<HTMLDivElement | null>;
  requestIdRef: RefObject<number>;
  aiResults: Array<{ site: Site; reason?: string }>;
  aiResultsBusy: boolean;
  aiReasoning: string | null;
  showAiHint: boolean;
  showAiPanel: boolean;
  emptyState: string;
  localSearchClosing: boolean;
  onOpenSiteCreator: () => void;
  onOpenTagCreator: () => void;
  onEditSite: (site: Site) => void;
  onTagSelect: (tagId: string) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragCancel: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onCloseLocalSearch: () => void;
  onTriggerAiRecommend: () => void;
  onCloseAiPanel: () => void;
  setDebouncedQuery: (q: string) => void;
  closeLocalSearch: () => void;
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
  settingsOnlineCheckEnabled,
  activeDraggedSite,
  sensors,
  snapToCursorModifier,
  dragTransition,
  sentinelRef,
  requestIdRef: _requestIdRef,
  aiResults,
  aiResultsBusy,
  aiReasoning,
  showAiHint,
  showAiPanel,
  emptyState,
  localSearchClosing,
  onOpenSiteCreator: _onOpenSiteCreator,
  onOpenTagCreator: _onOpenTagCreator,
  onEditSite,
  onTagSelect,
  onDragStart,
  onDragCancel,
  onDragEnd,
  onCloseLocalSearch,
  onTriggerAiRecommend,
  onCloseAiPanel,
  setDebouncedQuery: _setDebouncedQuery,
  closeLocalSearch: _closeLocalSearch,
}: SiteContentAreaProps) {
  return (
    <div className="mt-8 flex-1">
      {localSearchActive ? (
        <div className="mx-auto w-full max-w-[1440px] rounded-[28px] border border-white/10 bg-white/6 p-4">
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
                className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/12 bg-white/8 text-white/60 transition hover:bg-white/14 hover:text-white"
                aria-label="关闭站内搜索"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {showAiHint && localSearchQuery ? (
            <div className="mb-3 flex items-center justify-center rounded-[22px] border border-dashed border-purple-400/20 bg-purple-500/6 px-4 py-3 text-sm">
              <span className="opacity-60">没有找到想要的网站？试试&nbsp;</span>
              <button
                type="button"
                onClick={onTriggerAiRecommend}
                className="inline-flex items-center gap-1 font-semibold text-purple-300 transition hover:text-purple-200"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI 智能推荐
              </button>
            </div>
          ) : null}

          {showAiPanel ? (
            <div className="mb-3 rounded-[22px] border border-purple-400/20 bg-purple-500/8 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="flex items-center gap-2 text-base font-semibold">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    AI 智能推荐
                  </h4>
                  {aiReasoning ? (
                    <p className="mt-1 text-sm text-purple-300/80">{aiReasoning}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onCloseAiPanel}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/12 bg-white/8 text-white/60 transition hover:bg-white/14 hover:text-white"
                  aria-label="关闭 AI 推荐"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {aiResultsBusy && !aiResults.length ? (
                <div className="flex items-center gap-2 rounded-[22px] border border-dashed border-purple-400/20 bg-purple-500/6 px-4 py-5 text-sm text-purple-300/70">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  AI 正在分析所有网站，为你寻找最匹配的结果...
                </div>
              ) : aiResults.length ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
                  {aiResults.map(({ site, reason }) => (
                    <a
                      key={site.id}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-[22px] border border-purple-400/16 bg-purple-500/8 p-4 transition hover:-translate-y-0.5 hover:bg-purple-500/14"
                    >
                      <div className="flex items-start gap-3">
                        {site.iconUrl ? (
                          <img src={site.iconUrl} alt={`${site.name} icon`} className="h-11 w-11 rounded-2xl border border-purple-400/14 bg-purple-400/14 object-cover" />
                        ) : (
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/14 bg-purple-400/14 text-sm font-semibold">
                            {site.name.charAt(0)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <h5 className="truncate text-sm font-semibold">{site.name}</h5>
                          {reason ? (
                            <p className="mt-1 text-xs text-purple-300/90">
                              <span className="text-purple-400/70">推荐理由：</span>{reason}
                            </p>
                          ) : null}
                          {site.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-white/55">{site.description}</p>
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
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-52 animate-pulse rounded-[28px] border border-white/18 bg-white/12" />
              ))}
            </div>
          ) : siteList.items.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
              {siteList.items.map((site) => (
                <a
                  key={site.id}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-[22px] border border-white/12 bg-white/7 p-4 transition hover:-translate-y-0.5 hover:bg-white/11"
                >
                  <div className="flex items-start gap-3">
                    {site.iconUrl ? (
                      <img src={site.iconUrl} alt={`${site.name} icon`} className="h-11 w-11 rounded-2xl border border-white/14 bg-white/14 object-cover" />
                    ) : (
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/14 bg-white/14 text-sm font-semibold">
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
            <div className="flex items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm opacity-58">
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
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-52 animate-pulse rounded-[28px] border border-white/18 bg-white/12" />
              ))}
            </div>
          ) : emptyState ? (
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
                      draggable={isAuthenticated && editMode && !debouncedQuery}
                      editable={isAuthenticated && editMode}
                      themeMode={themeMode}
                      wallpaperAware={hasActiveWallpaper}
                      desktopCardFrosted={activeAppearance.desktopCardFrosted ?? false}
                      mobileCardFrosted={activeAppearance.mobileCardFrosted ?? false}
                      onEdit={() => onEditSite(site)}
                      onTagSelect={(tagId) => onTagSelect(tagId)}
                      showOnlineIndicator={settingsOnlineCheckEnabled}
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
                    showOnlineIndicator={settingsOnlineCheckEnabled}
                  >
                    <SiteCardContent
                      site={activeDraggedSite}
                      editable={isAuthenticated && editMode}
                      draggable={false}
                      onEdit={() => onEditSite(activeDraggedSite!)}
                      onTagSelect={(tagId) => onTagSelect(tagId)}
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
        </>
      )}
    </div>
  );
}
