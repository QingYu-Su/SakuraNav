/**
 * 标签侧边栏组件
 * @description 包含标签搜索过滤（防抖）和拖拽排序功能
 */

import {
  closestCenter,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Modifier } from "@dnd-kit/core";
import { createPortal } from "react-dom";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { SortableTagRow, TagRowCard, TagRowContent } from "@/components/ui";
import { getSidebarChromeClass } from "./style-helpers";
import type { Tag, ThemeMode } from "@/lib/base/types";

// ──────────────────────────────────────
// 常量
// ──────────────────────────────────────

/** 标签搜索防抖延迟（ms） */
const TAG_SEARCH_DEBOUNCE_MS = 300;

// ──────────────────────────────────────
// 类型
// ──────────────────────────────────────

type SidebarTagsProps = {
  themeMode: ThemeMode;
  hasActiveWallpaper: boolean;
  mobileTagsOpen: boolean;
  isAuthenticated: boolean;
  editMode: boolean;
  tags: Tag[];
  activeTagId: string | null;
  sensors: ReturnType<typeof useSensors>;
  portalContainer: HTMLElement | null;
  snapToCursorModifier: Modifier;
  activeDraggedTag: Tag | null;
  activeDragSize: { width: number; height: number } | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragCancel: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onSelectTag: (tagId: string) => void;
  onEditTag: (tag: Tag) => void;
  onDeleteTag: (tag: Tag) => void;
};

export function SidebarTags({
  themeMode,
  hasActiveWallpaper,
  mobileTagsOpen,
  isAuthenticated,
  editMode,
  tags,
  activeTagId,
  sensors,
  portalContainer,
  snapToCursorModifier,
  activeDraggedTag,
  activeDragSize,
  onDragStart,
  onDragCancel,
  onDragEnd,
  onSelectTag,
  onEditTag,
  onDeleteTag,
}: SidebarTagsProps) {
  const isDark = themeMode === "dark";
  const sidebarChromeClass = getSidebarChromeClass(themeMode, hasActiveWallpaper);

  // 检测移动端视图，移动端标签栏禁用 hover 弹窗
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── 标签搜索 ──
  const [tagSearch, setTagSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 防抖：输入后延迟应用过滤关键词
  const handleTagSearchChange = useCallback((value: string) => {
    setTagSearch(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value.trim().toLowerCase());
    }, TAG_SEARCH_DEBOUNCE_MS);
  }, []);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // 根据搜索词过滤标签
  const filteredTags = useMemo(() => {
    if (!debouncedSearch) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(debouncedSearch));
  }, [tags, debouncedSearch]);

  // 清空搜索
  const clearTagSearch = useCallback(() => {
    setTagSearch("");
    setDebouncedSearch("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    searchInputRef.current?.focus();
  }, []);

  return (
    <aside
      className={cn(
        "shrink-0 p-4 pb-20 lg:pb-4 lg:overflow-y-auto",
        sidebarChromeClass,
        "lg:block",
        mobileTagsOpen ? "block" : "hidden lg:block",
        "w-full lg:w-[240px]",
      )}
    >
      <div className="mb-5 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.26em] opacity-60">Labels</p>
          <h2 className="mt-1 text-xl font-semibold">分类标签</h2>
        </div>
      </div>

      {/* 标签搜索栏 */}
      <div className="relative mb-4">
        <Search className={cn(
          "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
          isDark ? "text-white/35" : "text-slate-400",
        )} />
        <input
          ref={searchInputRef}
          type="text"
          value={tagSearch}
          onChange={(e) => handleTagSearchChange(e.target.value)}
          placeholder="搜索标签"
          className={cn(
            "w-full rounded-xl border px-3 py-2 pl-9 pr-8 text-xs outline-none transition-colors",
            isDark
              ? "border-white/10 bg-white/6 placeholder:text-white/30 focus:border-white/20 focus:bg-white/8"
              : "border-slate-200/60 bg-white/60 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white/80",
          )}
        />
        {tagSearch && (
          <button
            type="button"
            onClick={clearTagSearch}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-md transition-colors",
              isDark
                ? "text-white/30 hover:text-white/60 hover:bg-white/10"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
            )}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragCancel={onDragCancel}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={filteredTags.map((tag) => tag.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {filteredTags.length === 0 ? (
              <p className={cn(
                "px-2 py-6 text-center text-xs",
                isDark ? "text-white/30" : "text-slate-400",
              )}>
                未找到匹配的标签
              </p>
            ) : (
              filteredTags.map((tag) => (
                <SortableTagRow
                  key={tag.id}
                  tag={tag}
                  active={tag.id === activeTagId}
                  collapsed={false}
                  themeMode={themeMode}
                  wallpaperAware={hasActiveWallpaper}
                  draggable={isAuthenticated && editMode}
                  editable={isAuthenticated && editMode}
                  showPopover={!isMobile}
                  onEdit={() => onEditTag(tag)}
                  onDelete={() => onDeleteTag(tag)}
                  onSelect={() => onSelectTag(tag.id)}
                />
              ))
            )}
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
  );
}

const dragTransition = {
  duration: 240,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};
