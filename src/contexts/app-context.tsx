/**
 * 全局应用状态 Context
 * 管理主题、认证、标签、外观等核心状态
 */

"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { 
  ThemeMode, 
  Tag, 
  ThemeAppearance, 
  AppSettings, 
  SessionUser 
} from "@/lib/types";

// ============================================
// Types
// ============================================

type AppState = {
  // 主题
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  
  // 认证
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  
  // 标签
  tags: Tag[];
  setTags: (tags: Tag[]) => void;
  
  // 外观
  appearances: Record<ThemeMode, ThemeAppearance>;
  setAppearances: (appearances: Record<ThemeMode, ThemeAppearance>) => void;
  
  // 设置
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  
  // 刷新控制
  refreshNonce: number;
  triggerRefresh: () => void;
};

// ============================================
// Context
// ============================================

const AppContext = createContext<AppState | null>(null);

// ============================================
// Provider
// ============================================

type AppProviderProps = {
  children: ReactNode;
  initialTags: Tag[];
  initialAppearances: Record<ThemeMode, ThemeAppearance>;
  initialSettings: AppSettings;
  initialSession: SessionUser | null;
  defaultTheme: ThemeMode;
};

export function AppProvider({
  children,
  initialTags,
  initialAppearances,
  initialSettings,
  initialSession,
  defaultTheme,
}: AppProviderProps) {
  // 主题状态
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return defaultTheme;
    }

    // 用户手动设置的主题优先
    const storedTheme = window.localStorage.getItem("sakura-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }

    // 使用服务端传递的默认主题
    return defaultTheme;
  });

  // 认证状态
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(initialSession?.isAuthenticated),
  );

  // 数据状态
  const [tags, setTags] = useState(initialTags);
  const [appearances, setAppearances] = useState(initialAppearances);
  const [settings, setSettings] = useState(initialSettings);
  
  // 刷新控制
  const [refreshNonce, setRefreshNonce] = useState(0);
  const triggerRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  const value: AppState = {
    themeMode,
    setThemeMode,
    isAuthenticated,
    setIsAuthenticated,
    tags,
    setTags,
    appearances,
    setAppearances,
    settings,
    setSettings,
    refreshNonce,
    triggerRefresh,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useAppState(): AppState {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used within AppProvider");
  }
  return context;
}

// ============================================
// Selector Hooks (优化性能，只订阅部分状态)
// ============================================

export function useTheme() {
  const { themeMode, setThemeMode, appearances } = useAppState();
  return { 
    theme: themeMode, 
    setTheme: setThemeMode,
    appearance: appearances[themeMode],
  };
}

export function useAuth() {
  const { isAuthenticated, setIsAuthenticated } = useAppState();
  return { isAuthenticated, setIsAuthenticated };
}

export function useTags() {
  const { tags, setTags } = useAppState();
  return { tags, setTags };
}

export function useAppearances() {
  const { appearances, setAppearances } = useAppState();
  return { appearances, setAppearances };
}

export function useSettings() {
  const { settings, setSettings } = useAppState();
  return { settings, setSettings };
}
