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
  /** 社交卡片标签的自定义描述，null 则显示站点数量 */
  socialTagDescription: string | null;
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

/** 社交卡片类型 */
export type SocialCardType =
  | "qq" | "wechat" | "email" | "bilibili" | "github" | "blog"
  | "wechat-official" | "telegram" | "xiaohongshu" | "douyin" | "qq-group" | "enterprise-wechat";

/** 社交卡片载荷 */
export type SocialCardPayload =
  | { type: "qq"; qqNumber: string; qrCodeUrl?: string }
  | { type: "wechat"; wechatId: string; qrCodeUrl?: string }
  | { type: "email"; email: string }
  | { type: "bilibili"; url: string }
  | { type: "github"; url: string }
  | { type: "blog"; url: string }
  | { type: "wechat-official"; accountName: string; qrCodeUrl?: string }
  | { type: "telegram"; url: string }
  | { type: "xiaohongshu"; xhsId: string; qrCodeUrl?: string }
  | { type: "douyin"; douyinId: string; qrCodeUrl?: string }
  | { type: "qq-group"; groupNumber: string; qrCodeUrl?: string }
  | { type: "enterprise-wechat"; ewcId: string; qrCodeUrl?: string };

/** 社交卡片 */
export type SocialCard = {
  id: string;
  cardType: SocialCardType;
  label: string;
  iconUrl: string | null;
  iconBgColor: string | null;
  payload: SocialCardPayload;
  /** 自定义提示文字，为空时卡片上不显示 */
  hint: string | null;
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
    hint: site.description || null,
    globalSortOrder: site.globalSortOrder,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
}

/** 导出 ZIP 的清单签名标识 */
export const SAKURA_MANIFEST_KEY = "__sakuranav__";

/** 导出 ZIP 中的清单文件结构 */
export type SakuraManifest = {
  /** 固定签名标识 */
  signature: typeof SAKURA_MANIFEST_KEY;
  /** 导出版本号 */
  version: number;
  /** 导出时间（ISO 8601） */
  exportedAt: string;
};

/** 配置导入模式 */
export type ImportMode = "clean" | "incremental" | "overwrite";

/** AI 书签分析结果中的单个条目 */
export type BookmarkAnalysisItem = {
  /** 网站名称 */
  name: string;
  /** 网站 URL */
  url: string;
  /** AI 推荐的描述 */
  description: string;
  /** 匹配到的已有标签 ID */
  matchedTagIds: string[];
  /** AI 推荐的新标签名 */
  recommendedTags: string[];
};

/** AI 书签分析请求结果 */
export type BookmarkAnalysisResult = {
  items: BookmarkAnalysisItem[];
};

/** 导入预检结果：SakuraNav 配置 or 外部文件 */
export type ImportDetectResult =
  | { type: "sakuranav"; filename: string }
  | { type: "external"; filename: string; content: string };

/** 书签导入列表中的编辑项 */
export type BookmarkImportItem = {
  /** 临时唯一标识 */
  uid: string;
  name: string;
  url: string;
  description: string;
  iconUrl: string;
  iconBgColor: string;
  skipOnlineCheck: boolean;
  tagIds: string[];
  /** AI 推荐的新标签（尚未创建） */
  newTags: string[];
};

/** 社交卡片类型元数据 */
export const SOCIAL_CARD_TYPE_META: Record<
  SocialCardType,
  { label: string; color: string; description: string }
> = {
  qq: { label: "QQ", color: "#12B7F5", description: "添加 QQ 联系方式" },
  wechat: { label: "微信", color: "#07C160", description: "添加微信联系方式" },
  email: { label: "邮箱", color: "#EA4335", description: "添加邮箱联系方式" },
  bilibili: { label: "B站", color: "#FB7299", description: "添加 B站 个人空间" },
  github: { label: "GitHub", color: "#181717", description: "添加 GitHub 个人主页" },
  blog: { label: "博客", color: "#FF6B35", description: "添加个人博客地址" },
  "wechat-official": { label: "微信公众号", color: "#07C160", description: "添加公众号名称和二维码" },
  telegram: { label: "Telegram频道", color: "#26A5E4", description: "添加 Telegram 频道链接" },
  xiaohongshu: { label: "小红书", color: "#FE2C55", description: "添加小红书号和二维码" },
  douyin: { label: "抖音", color: "#010000", description: "添加抖音号和二维码" },
  "qq-group": { label: "QQ群", color: "#12B7F5", description: "添加 QQ 群号和二维码" },
  "enterprise-wechat": { label: "企业微信", color: "#2672FF", description: "添加企业微信联系方式" },
};


