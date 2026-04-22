/**
 * 可排序标签行组件
 * @description 支持拖拽排序的标签行，结合 dnd-kit 实现拖拽交互
 * 编辑模式下卡片内部右侧显示编辑/删除按钮（参考 CardHeader 样式）
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

export function SortableTagRow({
  tag,
  active,
  collapsed,
  themeMode,
  wallpaperAware,
  draggable,
  editable,
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
  onEdit: () => void;
  /** 删除回调（弹出确认对话框） */
  onDelete: () => void;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
    disabled: !draggable,
    animateLayoutChanges: defaultAnimateLayoutChanges,
    transition: dragTransition,
  });

  /** 编辑模式下的按钮主题样式（参考 CardHeader） */
  const isDark = themeMode === "dark";
  const editBtnClass = wallpaperAware
    ? isDark
      ? "border-white/14 bg-white/10 hover:bg-white/16 text-white/80"
      : "border-slate-900/8 bg-white/30 hover:bg-white/42 text-slate-700"
    : isDark
      ? "border-white/12 bg-white/10 hover:bg-white/18 text-white/80"
      : "border-slate-900/8 bg-white/30 hover:bg-white/42 text-slate-700";

  const deleteBtnClass = wallpaperAware
    ? isDark
      ? "border-red-400/20 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400/30 text-red-400/80 hover:text-red-300"
      : "border-red-200/30 bg-red-50/40 hover:bg-red-100/60 hover:border-red-300/40 text-red-400 hover:text-red-500"
    : isDark
      ? "border-red-400/18 bg-red-500/8 hover:bg-red-500/18 hover:border-red-400/30 text-red-400/80 hover:text-red-300"
      : "border-red-200/30 bg-red-50/40 hover:bg-red-100/60 hover:border-red-300/40 text-red-400 hover:text-red-500";

  /** 编辑模式下显示操作按钮列 */
  const showActions = editable;

  return (
    <TagRowCard
      ref={setNodeRef}
      tag={tag}
      active={active}
      collapsed={collapsed}
      themeMode={themeMode}
      wallpaperAware={wallpaperAware}
      dragging={isDragging}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* 内容区域：min-w-0 确保文本截断，编辑模式下右侧预留按钮空间 */}
      <div className={cn("min-w-0 flex-1", showActions && "pr-8")}>
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
      </div>

      {/* 编辑模式下的操作按钮列：绝对定位，不影响卡片高度 */}
      {showActions ? (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(); }}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-md border transition hover:scale-110 hover:shadow-md",
              editBtnClass,
            )}
          >
            <PencilLine className="h-3 w-3 opacity-80" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-md border transition hover:scale-110 hover:shadow-md",
              deleteBtnClass,
            )}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ) : null}
    </TagRowCard>
  );
}
