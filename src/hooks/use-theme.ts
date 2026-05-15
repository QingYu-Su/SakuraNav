/**
 * 主题管理 Hook
 * @description 管理主题模式状态、localStorage 持久化、DOM 同步和切换逻辑
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ThemeMode } from "@/lib/base/types";

export function useTheme(defaultTheme: ThemeMode) {
  // 初始化始终使用服务端传入的 defaultTheme，避免 SSR/客户端水合不一致
  const [themeMode, setThemeMode] = useState<ThemeMode>(defaultTheme);
  const hydratedRef = useRef(false);

  // 首次挂载时从 localStorage 同步用户偏好
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const stored = window.localStorage.getItem("sakura-theme");
    if (stored === "light" || stored === "dark") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 首次 hydration 同步 localStorage 偏好是必要操作
      setThemeMode(stored);
    }
  }, []);

  // 主题变更后同步到 localStorage 和 DOM
  useEffect(() => {
    if (!hydratedRef.current) return;
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
