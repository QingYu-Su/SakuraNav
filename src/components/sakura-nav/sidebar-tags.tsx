/**
 * 标签侧边栏组件
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
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/utils";
import { SortableTagRow, TagRowCard, TagRowContent } from "@/components/ui";
import { getSidebarChromeClass } from "./style-helpers";
import type { Tag, ThemeMode } from "@/lib/base/types";

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragCancel={onDragCancel}
        onDragEnd={onDragEnd}
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
                  showPopover={!isMobile}
                  onEdit={() => onEditTag(tag)}
                  onDelete={() => onDeleteTag(tag)}
                  onSelect={() => onSelectTag(tag.id)}
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
  );
}

const dragTransition = {
  duration: 240,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};
