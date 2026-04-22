/**
 * 卡片头部组件
 * @description 所有卡片的共用头部：左侧编辑按钮 + 中间拖拽手柄 + 右侧删除按钮
 * 横向 flex 布局，编辑和删除按钮等高对齐，大小不受卡片内容影响
 */

"use client";

import { PencilLine, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";

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

  /** 按钮主题样式 */
  const btnClass = wallpaperAware
    ? isDark
      ? "border-white/14 bg-white/10 hover:bg-white/16 text-white/80"
      : "border-slate-900/8 bg-white/30 hover:bg-white/42 text-slate-700"
    : isDark
      ? "border-white/12 bg-white/10 hover:bg-white/18 text-white/80"
      : "border-slate-900/8 bg-white/30 hover:bg-white/42 text-slate-700";

  /** 删除按钮样式（默认红色，hover 加深） */
  const deleteBtnClass = wallpaperAware
    ? isDark
      ? "border-red-400/20 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400/30 text-red-400/80 hover:text-red-300"
      : "border-red-200/30 bg-red-50/40 hover:bg-red-100/60 hover:border-red-300/40 text-red-400 hover:text-red-500"
    : isDark
      ? "border-red-400/18 bg-red-500/8 hover:bg-red-500/18 hover:border-red-400/30 text-red-400/80 hover:text-red-300"
      : "border-red-200/30 bg-red-50/40 hover:bg-red-100/60 hover:border-red-300/40 text-red-400 hover:text-red-500";

  return (
    <div className="flex w-full shrink-0 items-center justify-between">
      {/* 左侧：编辑按钮 */}
      {editable ? (
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
      ) : (
        <div className="h-7 w-7" aria-hidden="true" />
      )}
    </div>
  );
}
