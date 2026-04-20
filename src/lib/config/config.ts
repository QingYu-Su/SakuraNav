/**
 * 客户端配置文件
 * @description 定义字体预设、主题外观默认值、站点配置等客户端可见配置项
 */

import { FontPresetKey, SearchEngine, type SearchEngineConfig } from "@/lib/base/types";

// 客户端可见的配置（不包含敏感信息）
export const fontPresets: Record<
  FontPresetKey,
  { label: string; cssVariable: string; description: string }
> = {
  grotesk: {
    label: "Space Grotesk",
    cssVariable: "var(--font-space-grotesk)",
    description: "利落、现代、偏科技感",
  },
  serif: {
    label: "Noto Serif SC",
    cssVariable: "var(--font-noto-serif-sc)",
    description: "更有杂志感，适合沉浸式主页",
  },
  balanced: {
    label: "Noto Sans SC",
    cssVariable: "var(--font-noto-sans-sc)",
    description: "清晰稳重，适合日常长期使用",
  },
};

export const themeAppearanceDefaults = {
  light: {
    fontPreset: "balanced" as FontPresetKey,
    fontSize: 16,
    overlayOpacity: 0.72,
    textColor: "#18212f",
  },
  dark: {
    fontPreset: "grotesk" as FontPresetKey,
    fontSize: 16,
    overlayOpacity: 0.62,
    textColor: "#f3f6ff",
  },
} as const;

export const siteConfig = {
  appName: "SakuraNav",
  logoSrc: "/default-site-logo.png",
  /** 浏览器标签页默认 Favicon（用户未上传时的回退） */
  defaultFaviconSrc: "/browser-tab-logo.png",
  pageSize: 12,
  defaultSearchEngine: "google" as SearchEngine,
  supportedSearchEngines: ["google", "baidu", "local"] as SearchEngine[],
  searchEngines: {
    google: {
      label: "Google",
      searchUrl: "https://www.google.com/search?q=",
      accent: "#5f86ff",
    },
    baidu: {
      label: "Baidu",
      searchUrl: "https://www.baidu.com/s?wd=",
      accent: "#3b66ff",
    },
    local: {
      label: "站内搜索",
      searchUrl: "",
      accent: "#ed6a5a",
    },
  },
};

/** 默认可编辑的搜索引擎配置列表（排除 local） */
export const DEFAULT_SEARCH_ENGINE_CONFIGS: SearchEngineConfig[] = [
  {
    id: "google",
    name: "Google",
    searchUrl: "https://www.google.com/search?q=%s",
    iconUrl: null,
    accent: "#5f86ff",
  },
  {
    id: "baidu",
    name: "Baidu",
    searchUrl: "https://www.baidu.com/s?wd=%s",
    iconUrl: null,
    accent: "#3b66ff",
  },
];
