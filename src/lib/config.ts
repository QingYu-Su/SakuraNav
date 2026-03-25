import { FontPresetKey, SearchEngine } from "@/lib/types";

export const serverConfig = {
  adminUsername: "admin",
  adminPassword: "sakura123456",
  adminPath: "sakura-entry",
  sessionSecret: "sakura-nav-session-secret-change-me",
  rememberDays: 30,
} as const;

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

export const siteConfig = {
  appName: "SakuraNav",
  logoSrc: "/logo-placeholder.svg",
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
