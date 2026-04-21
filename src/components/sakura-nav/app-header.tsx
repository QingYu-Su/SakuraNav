/**
 * 顶部导航栏组件
 * @description 包含 Logo、工具按钮（移动端+桌面端）、主题切换
 */

import {
  Eye,
  LogOut,
  MoonStar,
  PaintBucket,
  PanelLeftOpen,
  PencilLine,
  Settings2,
  SunMedium,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import {
  getHeaderChromeClass,
  getMobileToolbarButtonClass,
  getTopActionButtonClass,
  getTopActionIconClass,
  getThemeToggleButtonClass,
} from "./style-helpers";
import type { ThemeMode } from "@/lib/base/types";

type AppHeaderProps = {
  themeMode: ThemeMode;
  hasActiveWallpaper: boolean;
  isAuthenticated: boolean;
  editMode: boolean;
  mobileTagsOpen: boolean;
  displayName: string;
  activeHeaderLogo: string;
  onLogoClick: () => void;
  onToggleMobileTags: () => void;
  onToggleEditMode: () => void;
  onOpenAppearanceDrawer: () => void;
  onOpenConfigDrawer: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
};

export function AppHeader({
  themeMode,
  hasActiveWallpaper,
  isAuthenticated,
  editMode,
  mobileTagsOpen,
  displayName,
  activeHeaderLogo,
  onLogoClick,
  onToggleMobileTags,
  onToggleEditMode,
  onOpenAppearanceDrawer,
  onOpenConfigDrawer,
  onToggleTheme,
  onLogout,
}: AppHeaderProps) {
  const headerChromeClass = getHeaderChromeClass(themeMode, hasActiveWallpaper);
  const mobileToolbarButtonClass = getMobileToolbarButtonClass(themeMode, hasActiveWallpaper);
  const topActionButtonClass = getTopActionButtonClass(themeMode, hasActiveWallpaper);
  const topActionIconClass = getTopActionIconClass(themeMode, hasActiveWallpaper);
  const themeToggleButtonClass = getThemeToggleButtonClass(themeMode, hasActiveWallpaper);

  return (
    <header
      className={cn(
        "max-lg:sticky max-lg:top-0 z-20 flex w-full shrink-0 flex-col transition-all duration-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8",
        headerChromeClass,
      )}
    >
      {/* 移动端顶栏：Logo居中 */}
      <div className="flex items-center justify-center py-3 lg:hidden">
        <button type="button" onClick={onLogoClick} className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeHeaderLogo}
            alt={`${displayName} logo`}
            className="h-12 w-12 rounded-[18px] border border-white/25 bg-white/18 object-cover shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
          />
          <h1 className="text-[1.4rem] font-semibold tracking-[-0.03em]">{displayName}</h1>
        </button>
      </div>
      {/* 移动端分界线 */}
      <div className={cn("mx-4 border-b lg:hidden", themeMode === "light" ? "border-slate-900/10" : "border-white/10")} />
      {/* 移动端第二栏：工具栏按钮 */}
      <div className="flex items-center px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={onToggleMobileTags}
          className={mobileToolbarButtonClass}
          aria-label={mobileTagsOpen ? "关闭标签栏" : "打开标签栏"}
        >
          {mobileTagsOpen ? <X className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </button>
        <div className="flex flex-1 items-center justify-evenly">
          {isAuthenticated ? (
            <button type="button" onClick={onToggleEditMode} className={mobileToolbarButtonClass} aria-label={editMode ? "浏览" : "编辑"}>
              {editMode ? <Eye className="h-5 w-5" /> : <PencilLine className="h-5 w-5" />}
            </button>
          ) : null}
          {isAuthenticated ? (
            <button type="button" onClick={onOpenAppearanceDrawer} className={mobileToolbarButtonClass} aria-label="外观">
              <PaintBucket className="h-5 w-5" />
            </button>
          ) : null}
          {isAuthenticated ? (
            <button type="button" onClick={onOpenConfigDrawer} className={mobileToolbarButtonClass} aria-label="设置">
              <Settings2 className="h-5 w-5" />
            </button>
          ) : null}
          {isAuthenticated ? (
            <button type="button" onClick={onLogout} className={mobileToolbarButtonClass} aria-label="退出">
              <LogOut className="h-5 w-5" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          className={mobileToolbarButtonClass}
          aria-label={themeMode === "light" ? "切换暗黑模式" : "切换光明模式"}
        >
          {themeMode === "light" ? <MoonStar className="h-5 w-5" /> : <SunMedium className="h-5 w-5" />}
        </button>
      </div>
      {/* 桌面端 */}
      <button type="button" onClick={onLogoClick} className="hidden lg:flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeHeaderLogo}
          alt={`${displayName} logo`}
          className="h-14 w-14 rounded-[20px] border border-white/25 bg-white/18 object-cover shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
        />
        <div className="text-left leading-none">
          <h1 className="text-[1.6rem] font-semibold tracking-[-0.03em]">{displayName}</h1>
        </div>
      </button>

      <div className="hidden lg:flex items-center gap-2">
        {isAuthenticated ? (
          <button type="button" onClick={onToggleEditMode} className={topActionButtonClass}>
            <span className={topActionIconClass}>
              {editMode ? <Eye className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
            </span>
            {editMode ? "浏览" : "编辑"}
          </button>
        ) : null}
        {isAuthenticated ? (
          <button type="button" onClick={onOpenAppearanceDrawer} className={topActionButtonClass}>
            <span className={topActionIconClass}>
              <PaintBucket className="h-4 w-4" />
            </span>
            外观
          </button>
        ) : null}
        <button type="button" onClick={onToggleTheme} className={themeToggleButtonClass}>
          <span className="flex items-center gap-2.5">
            <span className={topActionIconClass}>
              {themeMode === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
            </span>
            <span>{themeMode === "light" ? "暗黑" : "光明"}</span>
          </span>
        </button>
        {isAuthenticated ? (
          <button type="button" onClick={onOpenConfigDrawer} className={topActionButtonClass}>
            <span className={topActionIconClass}>
              <Settings2 className="h-4 w-4" />
            </span>
            其他
          </button>
        ) : null}
        {isAuthenticated ? (
          <button type="button" onClick={onLogout} className={topActionButtonClass}>
            <span className={topActionIconClass}>
              <LogOut className="h-4 w-4" />
            </span>
            退出
          </button>
        ) : null}
      </div>
    </header>
  );
}
