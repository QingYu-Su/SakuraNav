/**
 * @file app-context.tsx
 * @description 应用全局状态上下文 - 管理主题、认证、标签、外观等核心状态
 * @module contexts/app-context
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

/**
 * @description AppContext - 应用全局状态上下文
 * 提供主题、认证、标签、外观、设置等全局状态的访问
 */
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

/**
 * @description AppProvider - 应用全局状态提供者组件
 * @param children - 子组件
 * @param initialTags - 初始标签列表
 * @param initialAppearances - 初始主题外观配置
 * @param initialSettings - 初始应用设置
 * @param initialSession - 初始会话用户信息
 * @param defaultTheme - 默认主题模式
 */
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

/**
 * @description useAppState - 获取完整应用状态的 Hook
 * @returns AppState 完整的应用状态对象
 * @throws 当在 AppProvider 外部使用时抛出错误
 */
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

/**
 * @description useTheme - 获取主题相关状态的 Hook
 * @returns 包含 theme、setTheme、appearance 的对象
 */
export function useTheme() {
  const { themeMode, setThemeMode, appearances } = useAppState();
  return { 
    theme: themeMode, 
    setTheme: setThemeMode,
    appearance: appearances[themeMode],
  };
}

/**
 * @description useAuth - 获取认证状态的 Hook
 * @returns 包含 isAuthenticated、setIsAuthenticated 的对象
 */
export function useAuth() {
  const { isAuthenticated, setIsAuthenticated } = useAppState();
  return { isAuthenticated, setIsAuthenticated };
}

/**
 * @description useTags - 获取标签状态的 Hook
 * @returns 包含 tags、setTags 的对象
 */
export function useTags() {
  const { tags, setTags } = useAppState();
  return { tags, setTags };
}

/**
 * @description useAppearances - 获取外观配置的 Hook
 * @returns 包含 appearances、setAppearances 的对象
 */
export function useAppearances() {
  const { appearances, setAppearances } = useAppState();
  return { appearances, setAppearances };
}

/**
 * @description useSettings - 获取应用设置的 Hook
 * @returns 包含 settings、setSettings 的对象
 */
export function useSettings() {
  const { settings, setSettings } = useAppState();
  return { settings, setSettings };
}
