/**
 * @description 类型定义 - 应用程序中使用的所有 TypeScript 类型定义
 */

/** 主题模式类型 */
export type ThemeMode = "light" | "dark";

/** 搜索引擎 ID 类型 */
export type SearchEngine = string;

/** 搜索引擎配置 */
export type SearchEngineConfig = {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 搜索 URL（%s 替换关键字，如 https://www.baidu.com/s?wd=%s） */
  searchUrl: string;
  /** 图标 URL（null 则使用名称首字母） */
  iconUrl: string | null;
  /** 卡片强调色 */
  accent: string;
};

/** 字体预设键类型 */
export type FontPresetKey = "grotesk" | "serif" | "balanced";

/** 标签类型 */
export type Tag = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isHidden: boolean;
  logoUrl: string | null;
  logoBgColor: string | null;
  siteCount: number;
  description: string | null;
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
  description: string | null;
  iconUrl: string | null;
  iconBgColor: string | null;
  isOnline: boolean | null;
  skipOnlineCheck: boolean;
  isPinned: boolean;
  globalSortOrder: number;
  /** 卡片类型：null 为普通网站，非 null 为社交卡片 */
  cardType: SocialCardType | null;
  /** 卡片载荷 JSON 字符串（仅 cardType 非 null 时有值） */
  cardData: string | null;
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
  fontSize: number;
  overlayOpacity: number;
  textColor: string;
  logoAssetId: string | null;
  logoUrl: string | null;
  faviconAssetId: string | null;
  faviconUrl: string | null;
  desktopCardFrosted: boolean;
  mobileCardFrosted: boolean;
  isDefault: boolean;
};

export type AppSettings = {
  lightLogoAssetId: string | null;
  lightLogoUrl: string | null;
  darkLogoAssetId: string | null;
  darkLogoUrl: string | null;
  siteName: string | null;
  onlineCheckEnabled: boolean;
  onlineCheckTime: number;
  onlineCheckLastRun: string | null;
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
  description: string | null;
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
  fontSize: number;
  overlayOpacity: number;
  textColor: string;
  logoAssetId: string | null;
  faviconAssetId: string | null;
  desktopCardFrosted: boolean;
  mobileCardFrosted: boolean;
  isDefault: boolean;
};

/** 社交卡片类型 */
export type SocialCardType = "qq" | "email" | "bilibili" | "github";

/** 社交卡片载荷 */
export type SocialCardPayload =
  | { type: "qq"; qqNumber: string; qrCodeUrl?: string }
  | { type: "email"; email: string }
  | { type: "bilibili"; url: string }
  | { type: "github"; url: string };

/** 社交卡片 */
export type SocialCard = {
  id: string;
  cardType: SocialCardType;
  label: string;
  iconUrl: string | null;
  iconBgColor: string | null;
  payload: SocialCardPayload;
  globalSortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** 虚拟"社交卡片"标签 ID */
export const SOCIAL_TAG_ID = "__social_cards__";

/** 判断 Site 是否为社交卡片 */
export function isSocialCardSite(site: Site): boolean {
  return site.cardType != null;
}

/** 从 Site 解析社交卡片载荷 */
export function parseSocialPayload(site: Site): SocialCardPayload | null {
  if (!site.cardData) return null;
  return JSON.parse(site.cardData) as SocialCardPayload;
}

/** 将社交卡片站点转为 SocialCard 对象（用于兼容现有组件） */
export function siteToSocialCard(site: Site): SocialCard | null {
  if (!site.cardType) return null;
  const payload = parseSocialPayload(site);
  if (!payload) return null;
  return {
    id: site.id,
    cardType: site.cardType,
    label: site.name,
    iconUrl: site.iconUrl,
    iconBgColor: site.iconBgColor,
    payload,
    globalSortOrder: site.globalSortOrder,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
}

/** 社交卡片类型元数据 */
export const SOCIAL_CARD_TYPE_META: Record<
  SocialCardType,
  { label: string; color: string; description: string }
> = {
  qq: { label: "QQ", color: "#12B7F5", description: "添加 QQ 联系方式" },
  email: { label: "邮箱", color: "#EA4335", description: "添加邮箱联系方式" },
  bilibili: { label: "B站", color: "#FB7299", description: "添加 B站 个人空间" },
  github: { label: "GitHub", color: "#181717", description: "添加 GitHub 个人主页" },
};

/** 配置归档设置类型 */
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
