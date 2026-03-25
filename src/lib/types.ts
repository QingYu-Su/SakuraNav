export type ThemeMode = "light" | "dark";

export type SearchEngine = "google" | "baidu" | "local";

export type FontPresetKey = "grotesk" | "serif" | "balanced";

export type Tag = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isHidden: boolean;
  siteCount: number;
};

export type SiteTag = {
  id: string;
  name: string;
  slug: string;
  isHidden: boolean;
  sortOrder: number;
};

export type Site = {
  id: string;
  name: string;
  url: string;
  description: string;
  iconUrl: string | null;
  globalSortOrder: number;
  createdAt: string;
  updatedAt: string;
  tags: SiteTag[];
};

export type ThemeAppearance = {
  theme: ThemeMode;
  wallpaperAssetId: string | null;
  wallpaperUrl: string | null;
  fontPreset: FontPresetKey;
  overlayOpacity: number;
  textColor: string;
};

export type SessionUser = {
  username: string;
  isAuthenticated: boolean;
};

export type PaginatedSites = {
  items: Site[];
  nextCursor: string | null;
  total: number;
};

export type AdminBootstrap = {
  tags: Tag[];
  sites: Site[];
  appearances: Record<ThemeMode, ThemeAppearance>;
};
