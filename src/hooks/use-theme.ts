/**
 * 主题管理 Hook
 * @description 管理主题模式状态、localStorage 持久化、DOM 同步和切换逻辑
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemeMode } from "@/lib/types";

export function useTheme(defaultTheme: ThemeMode) {
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

  const toggleThemeMode = useCallback(() => {
    setThemeMode((c) => (c === "light" ? "dark" : "light"));
  }, []);

  return { themeMode, setThemeMode, toggleThemeMode };
}
