/**
 * 主题管理 Hook
 * @description 管理主题模式状态、localStorage 持久化、DOM 同步和切换逻辑
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeMode } from "@/lib/base/types";

export function useTheme(defaultTheme: ThemeMode) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // SSR 时使用 defaultTheme，客户端优先读取 DOM 上由 beforeInteractive 脚本设置的主题
    if (typeof window !== "undefined") {
      const domTheme = document.documentElement.dataset.theme;
      if (domTheme === "light" || domTheme === "dark") return domTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    window.localStorage.setItem("sakura-theme", themeMode);
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((c) => (c === "light" ? "dark" : "light"));
  }, []);

  return { themeMode, setThemeMode, toggleThemeMode };
}
