/**
 * 顶部导航栏组件
 * @description 包含 Logo、工具按钮（移动端+桌面端）、主题切换、设置入口
 * @description 右上角：未登录显示默认用户图标（hover 提示登录），已登录显示用户头像+悬浮菜单
 */

import {
  Eye,
  LogOut,
  MoonStar,
  PanelLeftOpen,
  PencilLine,
  Settings,
  SunMedium,
  UserCircle,
  UserRound,
  X,
} from "lucide-react";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
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
  /** 当前用户昵称（登录后） */
  nickname: string | null;
  /** 当前用户名（登录后） */
  username: string | null;
  /** 当前用户头像 URL（登录后） */
  avatarUrl: string | null;
  /** 默认头像背景颜色 */
  avatarColor: string | null;
  onLogoClick: () => void;
  onToggleMobileTags: () => void;
  onToggleEditMode: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  onLogin: () => void;
  onOpenProfile: () => void;
};

// ── 提取到模块级别的子组件（避免 React Compiler react-hooks/static-components 报错） ──

/** 用户头像/默认图标（无头像时显示首字母+背景色） */
function UserAvatar({ size = "sm", avatarUrl, avatarColor, displayName }: {
  size?: "sm" | "lg";
  avatarUrl: string | null;
  avatarColor: string | null;
  displayName?: string;
}) {
  const dimension = size === "lg" ? "h-20 w-20" : size === "sm" ? "h-9 w-9" : "h-6 w-6";
  const fontSize = size === "lg" ? "text-2xl" : "text-sm";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt="用户头像"
        className={cn("rounded-full object-cover border-2 border-white/20", dimension)}
      />
    );
  }
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";
  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-bold text-white shrink-0", fontSize, dimension)}
      style={{ background: avatarColor || "rgba(139,92,246,0.6)" }}
    >
      {initial}
    </div>
  );
}

/** 移动端用户操作按钮 */
function MobileUserActions({
  mobileToolbarButtonClass,
  onOpenProfile,
  onLogout,
}: {
  mobileToolbarButtonClass: string;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onOpenProfile} className={mobileToolbarButtonClass} aria-label="个人空间">
        <UserRound className="h-5 w-5" />
      </button>
      <button type="button" onClick={onLogout} className={mobileToolbarButtonClass} aria-label="退出">
        <LogOut className="h-5 w-5" />
      </button>
    </div>
  );
}

/** 桌面端用户菜单弹窗 — 通过 Portal 渲染到 body，脱离 header stacking context */
function UserMenuDropdown({
  themeMode,
  displayNameText,
  username,
  avatarUrl,
  avatarColor,
  menuRef,
  anchorRef,
  onOpenProfile,
  onLogout,
}: {
  themeMode: ThemeMode;
  displayNameText: string;
  username: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  // useLayoutEffect 在浏览器绘制前同步执行，避免闪烁
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (anchor && menu) {
      const rect = anchor.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 8}px`;
      menu.style.right = `${window.innerWidth - rect.right}px`;
    }
  });

  return createPortal(
    <div
      ref={menuRef}
      className={cn(
        "fixed w-56 rounded-2xl border shadow-2xl backdrop-blur-xl z-[9999] overflow-hidden",
        themeMode === "light"
          ? "border-slate-200/60 bg-white/95 text-slate-900"
          : "border-white/12 bg-slate-900/95 text-white",
      )}
    >
      {/* 用户信息 */}
      <div className={cn("px-4 py-3 border-b", themeMode === "light" ? "border-slate-100" : "border-white/8")}>
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <UserAvatar size="sm" avatarUrl={avatarUrl} avatarColor={avatarColor} displayName={displayNameText} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{displayNameText}</p>
            <p className={cn("text-xs truncate", themeMode === "light" ? "text-slate-500" : "text-white/50")}>
              {username}
            </p>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="p-1.5">
        <button
          type="button"
          onClick={onOpenProfile}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
            themeMode === "light" ? "hover:bg-slate-50" : "hover:bg-white/8",
          )}
        >
          <UserRound className="h-4 w-4" />
          个人空间
        </button>
        <button
          type="button"
          onClick={onLogout}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-500 transition",
            themeMode === "light" ? "hover:bg-rose-50" : "hover:bg-rose-500/10",
          )}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** 未登录状态的 hover 提示登录按钮（移动端） */
function MobileLoginButton({
  mobileToolbarButtonClass,
  themeMode,
  showLoginTooltip,
  loginBtnRef,
  onLogin,
  onMouseEnter,
  onMouseLeave,
}: {
  mobileToolbarButtonClass: string;
  themeMode: ThemeMode;
  showLoginTooltip: boolean;
  loginBtnRef: React.RefObject<HTMLButtonElement | null>;
  onLogin: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <button
      ref={loginBtnRef}
      type="button"
      onClick={onLogin}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn("relative", mobileToolbarButtonClass)}
      aria-label="登录"
    >
      <UserCircle className="h-5 w-5" />
      {showLoginTooltip && (
        <span
          className={cn(
            "absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs shadow-lg z-50",
            themeMode === "light"
              ? "bg-slate-800 text-white"
              : "bg-white text-slate-800",
          )}
        >
          点击登录
        </span>
      )}
    </button>
  );
}

/** 桌面端未登录按钮 */
function DesktopLoginButton({
  themeMode,
  showLoginTooltip,
  loginBtnRef,
  onLogin,
  onMouseEnter,
  onMouseLeave,
}: {
  themeMode: ThemeMode;
  showLoginTooltip: boolean;
  loginBtnRef: React.RefObject<HTMLButtonElement | null>;
  onLogin: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div className="relative">
      <button
        ref={loginBtnRef}
        type="button"
        onClick={onLogin}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cn(
          "flex items-center justify-center rounded-xl p-1.5 transition",
          themeMode === "light"
            ? "hover:bg-slate-100 text-slate-500"
            : "hover:bg-white/10 text-white/60",
        )}
        aria-label="登录"
      >
        <UserCircle className="h-9 w-9" />
      </button>
      {showLoginTooltip && (
        <span
          className={cn(
            "absolute right-0 top-full mt-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs shadow-lg z-50",
            themeMode === "light"
              ? "bg-slate-800 text-white"
              : "bg-white text-slate-800",
          )}
        >
          点击登录
        </span>
      )}
    </div>
  );
}

// ── 主组件 ──

export function AppHeader({
  themeMode,
  hasActiveWallpaper,
  isAuthenticated,
  editMode,
  mobileTagsOpen,
  displayName,
  activeHeaderLogo,
  nickname,
  username,
  avatarUrl,
  avatarColor,
  onLogoClick,
  onToggleMobileTags,
  onToggleEditMode,
  onOpenSettings,
  onToggleTheme,
  onLogout,
  onLogin,
  onOpenProfile,
}: AppHeaderProps) {
  const headerChromeClass = getHeaderChromeClass(themeMode, hasActiveWallpaper);
  const mobileToolbarButtonClass = getMobileToolbarButtonClass(themeMode, hasActiveWallpaper);
  const topActionButtonClass = getTopActionButtonClass(themeMode, hasActiveWallpaper);
  const topActionIconClass = getTopActionIconClass(themeMode, hasActiveWallpaper);
  const themeToggleButtonClass = getThemeToggleButtonClass(themeMode, hasActiveWallpaper);

  // 所有已认证用户可以看到设置按钮（普通用户仅显示外观和数据 tab）
  const showSettings = isAuthenticated;

  // 桌面端用户菜单弹出状态
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  // 未登录 hover 提示状态
  const [showLoginTooltip, setShowLoginTooltip] = useState(false);
  const loginBtnRef = useRef<HTMLButtonElement>(null);

  // 点击外部关闭用户菜单
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userMenuOpen]);

  const displayNameText = nickname || username || "";

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
          {showSettings ? (
            <button type="button" onClick={onOpenSettings} className={mobileToolbarButtonClass} aria-label="设置">
              <Settings className="h-5 w-5" />
            </button>
          ) : null}
          {isAuthenticated ? (
            <MobileUserActions
              mobileToolbarButtonClass={mobileToolbarButtonClass}
              onOpenProfile={onOpenProfile}
              onLogout={onLogout}
            />
          ) : (
            <MobileLoginButton
              mobileToolbarButtonClass={mobileToolbarButtonClass}
              themeMode={themeMode}
              showLoginTooltip={showLoginTooltip}
              loginBtnRef={loginBtnRef}
              onLogin={onLogin}
              onMouseEnter={() => setShowLoginTooltip(true)}
              onMouseLeave={() => setShowLoginTooltip(false)}
            />
          )}
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
        {showSettings ? (
          <button type="button" onClick={onOpenSettings} className={topActionButtonClass}>
            <span className={topActionIconClass}>
              <Settings className="h-4 w-4" />
            </span>
            设置
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

        {/* 分割线 */}
        <div className={cn("h-6 w-px", themeMode === "light" ? "bg-slate-900/10" : "bg-white/10")} />

        {/* 桌面端用户区域 */}
        {isAuthenticated ? (
          <div>
            <button
              ref={avatarBtnRef}
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className={cn(
                "flex items-center justify-center rounded-xl p-1.5 transition",
                themeMode === "light"
                  ? "hover:bg-slate-100"
                  : "hover:bg-white/10",
              )}
              aria-label="用户菜单"
            >
              <UserAvatar size="sm" avatarUrl={avatarUrl} avatarColor={avatarColor} displayName={displayNameText} />
            </button>
            {userMenuOpen && (
              <UserMenuDropdown
                themeMode={themeMode}
                displayNameText={displayNameText}
                username={username}
                avatarUrl={avatarUrl}
                avatarColor={avatarColor}
                menuRef={userMenuRef}
                anchorRef={avatarBtnRef}
                onOpenProfile={() => { setUserMenuOpen(false); onOpenProfile(); }}
                onLogout={() => { setUserMenuOpen(false); onLogout(); }}
              />
            )}
          </div>
        ) : (
          <DesktopLoginButton
            themeMode={themeMode}
            showLoginTooltip={showLoginTooltip}
            loginBtnRef={loginBtnRef}
            onLogin={onLogin}
            onMouseEnter={() => setShowLoginTooltip(true)}
            onMouseLeave={() => setShowLoginTooltip(false)}
          />
        )}
      </div>
    </header>
  );
}
