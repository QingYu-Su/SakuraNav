/**
 * 内容标题栏组件
 * @description 显示当前视图标题、网站计数，以及编辑模式下的新建按钮
 * 布局：[新建标签] ← [标题] → [新建卡片]
 */

"use client";

import { PlusCircle, Tag } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";
import { getTitleBarButtonClass, getFrostedGlassStyle } from "./style-helpers";

type ContentTitleBarProps = {
  themeMode: ThemeMode;
  hasActiveWallpaper: boolean;
  desktopCardFrosted: number;
  mobileCardFrosted: number;
  isAuthenticated: boolean;
  editMode: boolean;
  currentTitle: string;
  onOpenTagCreator: () => void;
  onOpenCardCreator: () => void;
};

export function ContentTitleBar({
  themeMode,
  hasActiveWallpaper,
  desktopCardFrosted,
  mobileCardFrosted,
  isAuthenticated,
  editMode,
  currentTitle,
  onOpenTagCreator,
  onOpenCardCreator,
}: ContentTitleBarProps) {
  const frostedStyle = getFrostedGlassStyle(themeMode, desktopCardFrosted, mobileCardFrosted);

  return (
    <div className="flex items-center justify-center gap-3">
      {/* 左侧：新建标签按钮（始终占位，避免布局位移） */}
      {isAuthenticated && editMode ? (
        <button
          type="button"
          onClick={onOpenTagCreator}
          className={cn(getTitleBarButtonClass(themeMode, desktopCardFrosted, mobileCardFrosted), "shrink-0")}
          style={frostedStyle}
        >
          <Tag className="h-4 w-4" />
          <span className="hidden sm:inline">新建标签</span>
        </button>
      ) : isAuthenticated ? (
        <div className="invisible shrink-0" aria-hidden="true">
          <span className={cn(getTitleBarButtonClass(themeMode, desktopCardFrosted, mobileCardFrosted))} style={frostedStyle}>
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">占位</span>
          </span>
        </div>
      ) : null}

      {/* 中间：标题 */}
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
      {/* 右侧：新建卡片按钮（始终占位，避免布局位移） */}
      {isAuthenticated && editMode ? (
        <button
          type="button"
          onClick={onOpenCardCreator}
          className={cn(getTitleBarButtonClass(themeMode, desktopCardFrosted, mobileCardFrosted), "shrink-0")}
          style={frostedStyle}
        >
          <PlusCircle className="h-4 w-4" />
          <span className="hidden sm:inline">新建卡片</span>
        </button>
      ) : isAuthenticated ? (
        <div className="invisible shrink-0" aria-hidden="true">
          <span className={cn(getTitleBarButtonClass(themeMode, desktopCardFrosted, mobileCardFrosted))} style={frostedStyle}>
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">占位</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
