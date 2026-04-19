/**
 * 内容标题栏组件
 * @description 显示当前视图标题、网站计数，以及编辑模式下的新建按钮
 */

"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";
import { getViewBadgeClass, getSiteCountBadgeClass } from "./style-helpers";

type ContentTitleBarProps = {
  themeMode: ThemeMode;
  hasActiveWallpaper: boolean;
  desktopCardFrosted: boolean;
  mobileCardFrosted: boolean;
  isAuthenticated: boolean;
  editMode: boolean;
  activeTagId: string | null;
  currentTitle: string;
  displayedCount: number;
  totalCount: number;
  onOpenSiteCreator: () => void;
  onOpenTagCreator: () => void;
  onOpenCardCreator?: () => void;
};

export function ContentTitleBar({
  themeMode,
  hasActiveWallpaper,
  desktopCardFrosted,
  mobileCardFrosted,
  isAuthenticated,
  editMode,
  activeTagId,
  currentTitle,
  displayedCount,
  totalCount,
  onOpenSiteCreator,
  onOpenTagCreator,
  onOpenCardCreator,
}: ContentTitleBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <span className={getViewBadgeClass(themeMode, desktopCardFrosted, mobileCardFrosted)}>
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
      <p className={getSiteCountBadgeClass(themeMode, desktopCardFrosted, mobileCardFrosted)}>
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
          {onOpenCardCreator ? (
            <button
              type="button"
              onClick={onOpenCardCreator}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-4 text-sm font-medium transition hover:bg-white/18"
            >
              <Plus className="h-4 w-4" />
              新建卡片
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
