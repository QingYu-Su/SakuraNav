/**
 * 卡片头部组件
 * @description 所有卡片的共用头部：左侧编辑按钮 + 中间拖拽手柄 + 右侧删除按钮
 * 横向 flex 布局，编辑和删除按钮等高对齐，大小不受卡片内容影响
 */

"use client";

import { PencilLine, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";
import { Tooltip } from "@/components/ui/tooltip";

export function CardHeader({
  editable,
  draggable,
  themeMode,
  wallpaperAware,
  dragHandleProps,
  onEdit,
  onDelete,
}: {
  editable: boolean;
  draggable: boolean;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  dragHandleProps?: Record<string, unknown>;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isDark = themeMode === "dark";

  /** 编辑按钮样式 — 较高对比度，方便辨识 */
  const btnClass = wallpaperAware
    ? isDark
      ? "border-white/25 bg-white/16 hover:bg-white/24 text-white hover:text-white shadow-sm"
      : "border-slate-500/25 bg-white/60 hover:bg-white/80 text-slate-800 hover:text-slate-900 shadow-sm"
    : isDark
      ? "border-white/22 bg-white/14 hover:bg-white/22 text-white hover:text-white shadow-sm"
      : "border-slate-500/25 bg-white/60 hover:bg-white/80 text-slate-800 hover:text-slate-900 shadow-sm";

  /** 删除按钮样式 — 醒目红色，hover 加深 */
  const deleteBtnClass = wallpaperAware
    ? isDark
      ? "border-red-500/30 bg-red-500/16 hover:bg-red-500/28 hover:border-red-500/40 text-red-400 hover:text-red-300 shadow-sm"
      : "border-red-400/35 bg-red-100/50 hover:bg-red-200/70 hover:border-red-400/45 text-red-500 hover:text-red-600 shadow-sm"
    : isDark
      ? "border-red-500/25 bg-red-500/12 hover:bg-red-500/24 hover:border-red-500/38 text-red-400 hover:text-red-300 shadow-sm"
      : "border-red-400/35 bg-red-100/50 hover:bg-red-200/70 hover:border-red-400/45 text-red-500 hover:text-red-600 shadow-sm";

  return (
    <div className="flex w-full shrink-0 items-center justify-between">
      {/* 左侧：编辑按钮 */}
      {editable ? (
        <Tooltip tip="编辑卡片" themeMode={themeMode}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit?.(); }}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition hover:scale-110 hover:shadow-md -ml-0.5",
              btnClass,
            )}
          >
            <PencilLine className="h-3.5 w-3.5 opacity-80" />
          </button>
        </Tooltip>
      ) : (
        <div className="h-7 w-7" aria-hidden="true" />
      )}

      {/* 中间：拖拽手柄（py-2 扩大可触摸区域，视觉横条仍为 3px） */}
      <div
        className={cn("group/drag rounded-full py-2", draggable && "cursor-grab active:cursor-grabbing")}
        style={{ touchAction: "none" }}
        {...(draggable ? dragHandleProps : {})}
      >
        {draggable ? (
          <div className="h-[3px] w-20 rounded-full bg-current opacity-20 transition-all duration-200 group-hover/drag:w-24 group-hover/drag:opacity-40" />
        ) : (
          <div className="h-[3px] w-20" aria-hidden="true" />
        )}
      </div>

      {/* 右侧：删除按钮 */}
      {editable && onDelete ? (
        <Tooltip tip="删除卡片" themeMode={themeMode}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete?.(); }}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition hover:scale-110 hover:shadow-md -mr-0.5",
              deleteBtnClass,
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      ) : (
        <div className="h-7 w-7" aria-hidden="true" />
      )}
    </div>
  );
}
