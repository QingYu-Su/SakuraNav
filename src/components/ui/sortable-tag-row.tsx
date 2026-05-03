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
import { Tooltip } from "@/components/ui/tooltip";

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

  /** 编辑模式下的按钮主题样式（参考 CardHeader）— 较高对比度 */
  const isDark = themeMode === "dark";
  const editBtnClass = wallpaperAware
    ? isDark
      ? "border-white/25 bg-white/16 hover:bg-white/24 text-white hover:text-white shadow-sm"
      : "border-slate-500/25 bg-white/60 hover:bg-white/80 text-slate-800 hover:text-slate-900 shadow-sm"
    : isDark
      ? "border-white/22 bg-white/14 hover:bg-white/22 text-white hover:text-white shadow-sm"
      : "border-slate-500/25 bg-white/60 hover:bg-white/80 text-slate-800 hover:text-slate-900 shadow-sm";

  const deleteBtnClass = wallpaperAware
    ? isDark
      ? "border-red-500/30 bg-red-500/16 hover:bg-red-500/28 hover:border-red-500/40 text-red-400 hover:text-red-300 shadow-sm"
      : "border-red-400/35 bg-red-100/50 hover:bg-red-200/70 hover:border-red-400/45 text-red-500 hover:text-red-600 shadow-sm"
    : isDark
      ? "border-red-500/25 bg-red-500/12 hover:bg-red-500/24 hover:border-red-500/38 text-red-400 hover:text-red-300 shadow-sm"
      : "border-red-400/35 bg-red-100/50 hover:bg-red-200/70 hover:border-red-400/45 text-red-500 hover:text-red-600 shadow-sm";

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
          <Tooltip tip="编辑标签" themeMode={themeMode}>
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
          </Tooltip>
          <Tooltip tip="删除标签" themeMode={themeMode}>
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
          </Tooltip>
        </div>
      ) : null}
    </TagRowCard>
  );
}
