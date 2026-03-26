export type ThemeMode = "light" | "dark";

export type SearchEngine = "google" | "baidu" | "local";

export type FontPresetKey = "grotesk" | "serif" | "balanced";

export type Tag = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isHidden: boolean;
  logoUrl: string | null;
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
  isPinned: boolean;
  globalSortOrder: number;
  createdAt: string;
  updatedAt: string;
  tags: SiteTag[];
};

export type ThemeAppearance = {
  theme: ThemeMode;
  desktopWallpaperAssetId: string | null;
  desktopWallpaperUrl: string | null;
  mobileWallpaperAssetId: string | null;
  mobileWallpaperUrl: string | null;
  fontPreset: FontPresetKey;
  overlayOpacity: number;
  textColor: string;
};

export type AppSettings = {
  lightLogoAssetId: string | null;
  lightLogoUrl: string | null;
  darkLogoAssetId: string | null;
  darkLogoUrl: string | null;
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
  settings: AppSettings;
};

export type StoredAsset = {
  id: string;
  kind: string;
  filePath: string;
  mimeType: string;
  createdAt: string;
};

export type ConfigArchiveAsset = {
  id: string;
  kind: string;
  mimeType: string;
  createdAt: string;
  archivePath: string;
};

export type ConfigArchiveSite = {
  id: string;
  name: string;
  url: string;
  description: string;
  iconUrl: string | null;
  isPinned: boolean;
  globalSortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ConfigArchiveTag = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isHidden: boolean;
  logoUrl: string | null;
};

export type ConfigArchiveSiteTag = {
  siteId: string;
  tagId: string;
  sortOrder: number;
};

export type ConfigArchiveAppearance = {
  theme: ThemeMode;
  desktopWallpaperAssetId: string | null;
  mobileWallpaperAssetId: string | null;
  fontPreset: FontPresetKey;
  overlayOpacity: number;
  textColor: string;
};

export type ConfigArchiveSettings = {
  lightLogoAssetId: string | null;
  darkLogoAssetId: string | null;
};

export type ConfigArchive = {
  version: 1;
  exportedAt: string;
  tags: ConfigArchiveTag[];
  sites: ConfigArchiveSite[];
  siteTags: ConfigArchiveSiteTag[];
  appearances: Record<ThemeMode, ConfigArchiveAppearance>;
  settings: ConfigArchiveSettings;
  assets: ConfigArchiveAsset[];
};
