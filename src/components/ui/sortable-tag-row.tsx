/**
 * 可排序标签行组件
 * @description 支持拖拽排序的标签行，结合 dnd-kit 实现拖拽交互
 */

"use client";

import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PencilLine } from "lucide-react";
import { type Tag, type ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TagRowCard } from "./tag-row-card";
import { TagRowContent } from "./tag-row-content";

const dragTransition = {
  duration: 240,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

/** 浏览模式下标签栏宽度 (px) */
const BROWSE_SIDEBAR_WIDTH = 200;
/** 标签栏 padding (px) */
const SIDEBAR_PADDING = 16;
/** 浏览模式下卡片宽度 = sidebar - padding * 2 */
const CARD_WIDTH = BROWSE_SIDEBAR_WIDTH - SIDEBAR_PADDING * 2;

export function SortableTagRow({
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

  const editButtonClass = wallpaperAware
    ? themeMode === "light"
      ? "border-slate-900/8 bg-white/30 hover:bg-white/42 text-slate-700"
      : "border-white/14 bg-white/10 hover:bg-white/16 text-white/80"
    : "border-white/12 bg-white/10 hover:bg-white/18 text-white/80";

  return (
    <div className="relative">
      <TagRowCard
        ref={setNodeRef}
        tag={tag}
        active={active}
        collapsed={collapsed}
        themeMode={themeMode}
        wallpaperAware={wallpaperAware}
        dragging={isDragging}
        style={{
          width: editable ? CARD_WIDTH : undefined,
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
      {editable ? (
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "absolute top-0 flex h-full items-center justify-center rounded-2xl border transition",
            editButtonClass,
          )}
          style={{
            left: CARD_WIDTH + 8,
            width: 40,
          }}
        >
          <PencilLine className="h-4 w-4 opacity-80" />
        </button>
      ) : null}
    </div>
  );
}
