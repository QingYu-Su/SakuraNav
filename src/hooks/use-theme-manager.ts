/**
 * 主题管理 Hook
 * @description 封装主题模式的状态管理、localStorage 持久化和 DOM 同步
 */

import { useCallback, useEffect, useState } from "react";
import type { ThemeMode } from "@/lib/types";
import { fontPresets } from "@/lib/config";

export function useThemeManager(defaultTheme: ThemeMode) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = window.localStorage.getItem("sakura-theme");
    if (stored === "light" || stored === "dark") return stored;
    return defaultTheme;
  });

  useEffect(() => {
    window.localStorage.setItem("sakura-theme", themeMode);
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  const toggleThemeMode = useCallback(
    (closeSearchMenu?: () => void) => {
      closeSearchMenu?.();
      setThemeMode((c) => (c === "light" ? "dark" : "light"));
    },
    [],
  );

  return { themeMode, setThemeMode, toggleThemeMode };
}

/** 计算主题相关的派生状态 */
export function useThemeDerivedState(
  themeMode: ThemeMode,
  appearances: Record<ThemeMode, import("@/lib/types").ThemeAppearance>,
  settings: import("@/lib/types").AppSettings,
) {
  const activeAppearance = appearances[themeMode];
  const activeFont = fontPresets[activeAppearance.fontPreset];
  const hasActiveWallpaper = Boolean(activeAppearance.desktopWallpaperUrl || activeAppearance.mobileWallpaperUrl);
  const hasActiveMobileWallpaper = Boolean(activeAppearance.mobileWallpaperUrl);
  const hasActiveDesktopWallpaper = Boolean(activeAppearance.desktopWallpaperUrl);
  const activeHeaderLogo = activeAppearance.logoUrl || "/default-site-logo.png";
  const displayName = settings.siteName || "SakuraNav";

  return {
    activeAppearance,
    activeFont,
    hasActiveWallpaper,
    hasActiveMobileWallpaper,
    hasActiveDesktopWallpaper,
    activeHeaderLogo,
    displayName,
  };
}
