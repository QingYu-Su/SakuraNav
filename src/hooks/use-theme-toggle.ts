/**
 * 主题切换 Hook
 * 管理主题切换和持久化逻辑
 */

"use client";

import { useCallback, useEffect } from "react";
import { useTheme } from "@/contexts/app-context";
import type { ThemeMode } from "@/lib/types";

export function useThemeToggle() {
  const { theme, setTheme } = useTheme();

  // 切换主题
  const toggleTheme = useCallback(() => {
    const newTheme: ThemeMode = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    // 持久化到 localStorage
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sakura-theme", newTheme);
    }
  }, [theme, setTheme]);

  // 应用主题到 DOM
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}
