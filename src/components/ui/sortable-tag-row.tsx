/**
 * 可排序标签行组件
 * @description 支持拖拽排序的标签行，结合 dnd-kit 实现拖拽交互
 */

"use client";

import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PencilLine, Trash2 } from "lucide-react";
import { type Tag, type ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
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
  deletable,
  onEdit,
  onDelete,
  onSelect,
}: {
  tag: Tag;
  active: boolean;
  collapsed: boolean;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  draggable: boolean;
  editable: boolean;
  /** 是否可删除（用于虚拟标签，如社交卡片标签） */
  deletable?: boolean;
  onEdit: () => void;
  /** 删除回调 */
  onDelete?: () => void;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
    disabled: !draggable,
    animateLayoutChanges: defaultAnimateLayoutChanges,
    transition: dragTransition,
  });

  /** 编辑模式：标签卡片固定宽度，右侧留出按钮空间；可删除标签同理 */
  const showAction = editable || deletable;
  const cardWidth = showAction ? CARD_WIDTH : undefined;

  const editButtonClass = wallpaperAware
    ? themeMode === "light"
      ? "border-slate-900/8 bg-white/30 hover:bg-white/42 text-slate-700"
      : "border-white/14 bg-white/10 hover:bg-white/16 text-white/80"
    : themeMode === "light"
      ? "border-slate-900/8 bg-white/30 hover:bg-white/42 text-slate-700"
      : "border-white/12 bg-white/10 hover:bg-white/18 text-white/80";

  const deleteButtonClass = wallpaperAware
    ? themeMode === "light"
      ? "border-red-300/50 bg-red-50/60 hover:bg-red-100/60 text-red-500"
      : "border-red-500/20 bg-red-500/8 hover:bg-red-500/16 text-red-400"
    : themeMode === "light"
      ? "border-red-300/50 bg-red-50/60 hover:bg-red-100/60 text-red-500"
      : "border-red-500/20 bg-red-500/8 hover:bg-red-500/16 text-red-400";

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
          width: cardWidth,
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
      {showAction ? (
        <button
          type="button"
          onClick={deletable ? onDelete : onEdit}
          className={cn(
            "absolute top-0 flex h-full items-center justify-center rounded-2xl border transition hover:scale-110 hover:shadow-md",
            deletable ? deleteButtonClass : editButtonClass,
          )}
          style={{
            left: CARD_WIDTH + 8,
            width: 40,
          }}
        >
          {deletable
            ? <Trash2 className="h-4 w-4 opacity-80" />
            : <PencilLine className="h-4 w-4 opacity-80" />}
        </button>
      ) : null}
    </div>
  );
}
