/**
 * 内容标题栏组件
 * @description 显示当前视图标题、网站计数，以及编辑模式下的新建按钮
 */

"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";

type ContentTitleBarProps = {
  themeMode: ThemeMode;
  hasActiveWallpaper: boolean;
  isAuthenticated: boolean;
  editMode: boolean;
  activeTagId: string | null;
  currentTitle: string;
  displayedCount: number;
  totalCount: number;
  onOpenSiteCreator: () => void;
  onOpenTagCreator: () => void;
};

export function ContentTitleBar({
  themeMode,
  hasActiveWallpaper,
  isAuthenticated,
  editMode,
  activeTagId,
  currentTitle,
  displayedCount,
  totalCount,
  onOpenSiteCreator,
  onOpenTagCreator,
}: ContentTitleBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <span
        className={cn(
          "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.26em] opacity-70",
          hasActiveWallpaper
            ? themeMode === "light"
              ? "border-slate-900/10 bg-white/40 shadow-[0_4px_16px_rgba(148,163,184,0.08)] backdrop-blur-[18px]"
              : "border-white/12 bg-white/10 shadow-[0_4px_16px_rgba(2,6,23,0.16)] backdrop-blur-[18px]"
            : "border-white/20 bg-white/16",
        )}
      >
        {activeTagId ? "标签视图" : "默认视图"}
      </span>
      <h2
        className={cn(
          "text-2xl font-semibold tracking-tight sm:text-3xl",
          hasActiveWallpaper
            ? themeMode === "light"
              ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
              : "drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
            : "",
        )}
      >
        {currentTitle}
      </h2>
      <p
        className={cn(
          "text-sm opacity-72 rounded-full px-3 py-1",
          hasActiveWallpaper
            ? themeMode === "light"
              ? "bg-white/36 shadow-[0_4px_16px_rgba(148,163,184,0.08)] backdrop-blur-[18px]"
              : "bg-white/10 shadow-[0_4px_16px_rgba(2,6,23,0.16)] backdrop-blur-[18px]"
            : "",
        )}
      >
        已展示 {displayedCount} / {totalCount} 个网站
      </p>
      {isAuthenticated && editMode ? (
        <>
          <button
            type="button"
            onClick={onOpenSiteCreator}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/18 bg-white/16 px-4 text-sm font-medium transition hover:bg-white/24"
          >
            <Plus className="h-4 w-4" />
            新建网站
          </button>
          <button
            type="button"
            onClick={onOpenTagCreator}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/18 bg-white/12 px-4 text-sm font-medium transition hover:bg-white/20"
          >
            <Plus className="h-4 w-4" />
            新建标签
          </button>
        </>
      ) : null}
    </div>
  );
}
