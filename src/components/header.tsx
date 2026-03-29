/**
 * Header 组件
 * 顶部导航栏，包含 Logo、工具按钮和主题切换
 */

"use client";

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
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import { useTheme } from "@/contexts/app-context";

// ============================================
// Types
// ============================================

type HeaderProps = {
  // 状态
  isAuthenticated: boolean;
  editMode: boolean;
  mobileTagsOpen: boolean;
  
  // Logo
  logoUrl: string | null;
  
  // 样式相关
  hasActiveWallpaper: boolean;
  
  // 回调函数
  onToggleEditMode: () => void;
  onToggleMobileTags: () => void;
  onToggleTheme: () => void;
  onOpenAppearanceDrawer: () => void;
  onOpenConfigDrawer: () => void;
  onLogout: () => void;
  onLogoClick: () => void;
};

// ============================================
// Component
// ============================================

export function Header({
  isAuthenticated,
  editMode,
  mobileTagsOpen,
  logoUrl,
  hasActiveWallpaper,
  onToggleEditMode,
  onToggleMobileTags,
  onToggleTheme,
  onOpenAppearanceDrawer,
  onOpenConfigDrawer,
  onLogout,
  onLogoClick,
}: HeaderProps) {
  const { theme } = useTheme();
  
  // 样式计算
  const topActionButtonClass = cn(
    "inline-flex h-12 min-w-[104px] items-center justify-center gap-2.5 rounded-[18px] border px-4 text-sm font-medium whitespace-nowrap",
    hasActiveWallpaper
      ? theme === "light"
        ? "border-slate-900/8 bg-white/34 text-slate-800 shadow-[0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur-[22px] hover:bg-white/48"
        : "border-white/16 bg-white/10 text-white shadow-[0_12px_34px_rgba(2,6,23,0.22)] backdrop-blur-[22px] hover:bg-white/16"
      : theme === "light"
        ? "border-slate-800/10 bg-white/66 text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.16)] hover:bg-white/86"
        : "border-white/20 bg-white/14 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] hover:bg-white/22",
  );

  const topActionIconClass = cn(
    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
    hasActiveWallpaper
      ? theme === "light"
        ? "bg-slate-900/8 text-slate-700"
        : "bg-white/10 text-white/92"
      : theme === "light"
        ? "bg-slate-900/7 text-slate-700"
        : "bg-white/12 text-white/90",
  );

  const mobileToolbarButtonClass = cn(
    "inline-flex h-11 w-11 items-center justify-center rounded-[18px] border transition",
    hasActiveWallpaper
      ? theme === "light"
        ? "border-slate-900/8 bg-white/34 text-slate-800 shadow-[0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur-[22px] active:scale-95 active:bg-white/48"
        : "border-white/16 bg-white/12 text-white shadow-[0_12px_34px_rgba(2,6,23,0.22)] backdrop-blur-[22px] active:scale-95 active:bg-white/18"
      : theme === "light"
        ? "border-slate-800/10 bg-white/66 text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.16)] active:scale-95 active:bg-white/86"
        : "border-white/20 bg-white/14 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] active:scale-95 active:bg-white/22",
  );

  const themeToggleButtonClass = cn(
    topActionButtonClass,
    "min-w-[116px]",
    hasActiveWallpaper
      ? theme === "light"
        ? "bg-white/42 text-slate-800 hover:bg-white/56"
        : "bg-white/12 text-white hover:bg-white/18"
      : theme === "light"
        ? "border-slate-800/12 bg-white/84 text-slate-700 shadow-[0_12px_30px_rgba(148,163,184,0.12)] hover:bg-white"
        : "border-white/20 bg-white/14 text-white shadow-[0_14px_32px_rgba(15,23,42,0.2)] hover:bg-white/22",
  );

  const headerChromeClass =
    theme === "light"
      ? hasActiveWallpaper
        ? "border-b border-slate-950/8 bg-[linear-gradient(180deg,rgba(255,250,246,0.44),rgba(255,255,255,0.26))] shadow-[0_14px_44px_rgba(148,163,184,0.10)] backdrop-blur-[24px]"
        : "border-b border-slate-950/6 bg-[linear-gradient(90deg,rgba(255,252,247,0.88),rgba(237,244,255,0.82),rgba(223,239,250,0.8))] shadow-[0_16px_60px_rgba(148,163,184,0.16)] backdrop-blur-xl"
      : hasActiveWallpaper
        ? "border-b border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.56),rgba(15,23,42,0.38))] shadow-[0_18px_54px_rgba(2,6,23,0.28)] backdrop-blur-[24px]"
        : "border-b border-white/8 bg-[linear-gradient(90deg,rgba(44,53,84,0.82),rgba(55,71,102,0.72),rgba(57,89,109,0.74))] shadow-[0_16px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl";

  const activeHeaderLogo = logoUrl || siteConfig.logoSrc;

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex w-full flex-col transition-all duration-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8",
        headerChromeClass,
      )}
    >
      {/* 移动端顶栏：Logo居中 */}
      <div className="flex items-center justify-center py-3 lg:hidden">
        <button
          type="button"
          onClick={onLogoClick}
          className="flex items-center gap-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeHeaderLogo}
            alt={`${siteConfig.appName} logo`}
            className="h-12 w-12 rounded-[18px] border border-white/25 bg-white/18 object-cover shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
          />
          <h1 className="text-[1.4rem] font-semibold tracking-[-0.03em]">
            {siteConfig.appName}
          </h1>
        </button>
      </div>

      {/* 移动端分界线 */}
      <div
        className={cn(
          "mx-4 border-b lg:hidden",
          theme === "light" ? "border-slate-900/10" : "border-white/10",
        )}
      />

      {/* 移动端第二栏：工具栏按钮 */}
      <div className="flex items-center px-4 py-3 lg:hidden">
        {/* 左侧：标签栏按钮 */}
        <button
          type="button"
          onClick={onToggleMobileTags}
          className={mobileToolbarButtonClass}
          aria-label={mobileTagsOpen ? "关闭标签栏" : "打开标签栏"}
        >
          {mobileTagsOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </button>

        {/* 中间：用户态按钮 */}
        <div className="flex flex-1 items-center justify-evenly">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onToggleEditMode}
              className={mobileToolbarButtonClass}
              aria-label={editMode ? "浏览" : "编辑"}
            >
              {editMode ? (
                <Eye className="h-5 w-5" />
              ) : (
                <PencilLine className="h-5 w-5" />
              )}
            </button>
          ) : null}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={onOpenAppearanceDrawer}
              className={mobileToolbarButtonClass}
              aria-label="外观"
            >
              <PaintBucket className="h-5 w-5" />
            </button>
          ) : null}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={onOpenConfigDrawer}
              className={mobileToolbarButtonClass}
              aria-label="设置"
            >
              <Settings2 className="h-5 w-5" />
            </button>
          ) : null}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={onLogout}
              className={mobileToolbarButtonClass}
              aria-label="退出"
            >
              <LogOut className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {/* 右侧：模式切换 */}
        <button
          type="button"
          onClick={onToggleTheme}
          className={mobileToolbarButtonClass}
          aria-label={theme === "light" ? "切换暗黑模式" : "切换光明模式"}
        >
          {theme === "light" ? (
            <MoonStar className="h-5 w-5" />
          ) : (
            <SunMedium className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* 桌面端：原有布局 */}
      <button
        type="button"
        onClick={onLogoClick}
        className="hidden lg:flex items-center gap-4"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeHeaderLogo}
          alt={`${siteConfig.appName} logo`}
          className="h-14 w-14 rounded-[20px] border border-white/25 bg-white/18 object-cover shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
        />
        <div className="text-left leading-none">
          <h1 className="text-[1.6rem] font-semibold tracking-[-0.03em]">
            {siteConfig.appName}
          </h1>
        </div>
      </button>

      <div className="hidden lg:flex items-center gap-2">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={onToggleEditMode}
            className={topActionButtonClass}
          >
            <span className={topActionIconClass}>
              {editMode ? (
                <Eye className="h-4 w-4" />
              ) : (
                <PencilLine className="h-4 w-4" />
              )}
            </span>
            {editMode ? "浏览" : "编辑"}
          </button>
        ) : null}

        {isAuthenticated ? (
          <button
            type="button"
            onClick={onOpenAppearanceDrawer}
            className={topActionButtonClass}
          >
            <span className={topActionIconClass}>
              <PaintBucket className="h-4 w-4" />
            </span>
            外观
          </button>
        ) : null}

        <button
          type="button"
          onClick={onToggleTheme}
          className={themeToggleButtonClass}
        >
          <span className="flex items-center gap-2.5">
            <span className={topActionIconClass}>
              {theme === "light" ? (
                <MoonStar className="h-4 w-4" />
              ) : (
                <SunMedium className="h-4 w-4" />
              )}
            </span>
            <span>{theme === "light" ? "暗黑" : "光明"}</span>
          </span>
        </button>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={onOpenConfigDrawer}
            className={topActionButtonClass}
          >
            <span className={topActionIconClass}>
              <Settings2 className="h-4 w-4" />
            </span>
            其他
          </button>
        ) : null}

        {isAuthenticated ? (
          <button
            type="button"
            onClick={onLogout}
            className={topActionButtonClass}
          >
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
