/**
 * 访问控制子组件
 * @description 备选 URL 列表中的可拖拽条目子组件
 */

"use client";

import {
  ExternalLink, GripVertical, Trash2, PencilLine,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type ThemeMode, type AlternateUrl,
} from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { Tooltip } from "@/components/ui/tooltip";
import {
  getDialogSubtleClass, getDialogListItemClass,
} from "@/components/sakura-nav/style-helpers";

// ──────────────────────────────────────
// 可拖拽排序的 URL 条目
// ──────────────────────────────────────

export function SortableUrlItem({
  alt, isDark, themeMode,
  onEdit, onDelete,
}: {
  alt: AlternateUrl;
  isDark: boolean;
  themeMode: ThemeMode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dragTransition = { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: alt.id, transition: dragTransition });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style}>
      <div className={cn("group flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition", getDialogListItemClass(themeMode))}>
        {/* 拖拽手柄 */}
        <button type="button"
          className={cn("cursor-grab touch-none p-0.5 rounded-lg transition hover:bg-white/10",
            isDark ? "text-white/30 hover:text-white/50" : "text-slate-400 hover:text-slate-600",
          )}
          {...attributes} {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* 主内容 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {alt.label ? (
              <span className="truncate text-sm font-medium">{alt.label}</span>
            ) : (
              <span className={cn("truncate text-sm", getDialogSubtleClass(themeMode))}>未命名</span>
            )}
          </div>
          <Tooltip tip="点击跳转到该网站" themeMode={themeMode}>
            <a href={alt.url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn("mt-0.5 flex items-center gap-1 truncate text-xs transition group/url", getDialogSubtleClass(themeMode), "hover:underline")}
            >
              {alt.url}
              <ExternalLink className={cn("h-3 w-3 shrink-0 transition-opacity opacity-0 group-hover/url:opacity-100")} />
            </a>
          </Tooltip>
        </div>

        {/* 操作按钮 */}
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip tip="编辑" themeMode={themeMode}>
            <button type="button" onClick={onEdit}
              className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark ? "border-white/10 bg-white/6 text-white/50 hover:bg-white/12" : "border-slate-200/60 bg-slate-50 text-slate-400 hover:bg-slate-100",
              )}
            ><PencilLine className="h-3.5 w-3.5" /></button>
          </Tooltip>
          <Tooltip tip="删除" themeMode={themeMode}>
            <button type="button" onClick={onDelete}
              className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark ? "border-white/10 bg-white/6 text-white/50 hover:bg-red-500/15 hover:text-red-400"
                  : "border-slate-200/60 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500",
              )}
            ><Trash2 className="h-3.5 w-3.5" /></button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
