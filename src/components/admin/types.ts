/**
 * Admin 模块类型定义
 * @description 定义管理后台相关的类型、状态和默认值
 */

import { type FontPresetKey, type ThemeMode, type OnlineCheckFrequency, type OnlineCheckMatchMode, type AccessRules, type RelatedSiteItem, DEFAULT_ONLINE_CHECK_FREQUENCY, DEFAULT_ONLINE_CHECK_TIMEOUT, DEFAULT_ONLINE_CHECK_MATCH_MODE, DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD } from "@/lib/base/types";

/**
 * 管理区域类型
 */
export type AdminSection = "sites" | "tags" | "appearance" | "config";

/**
 * 管理分组类型
 */
export type AdminGroup = "create" | "edit";

/**
 * 网站表单状态
 */
export type SiteFormState = {
  id?: string;
  name: string;
  url: string;
  description: string | null;
  iconUrl: string;
  iconBgColor: string;
  skipOnlineCheck: boolean;
  onlineCheckFrequency: OnlineCheckFrequency;
  onlineCheckTimeout: number;
  onlineCheckMatchMode: OnlineCheckMatchMode;
  onlineCheckKeyword: string;
  onlineCheckFailThreshold: number;
  tagIds: string[];
  accessRules: AccessRules | null;
  /** 推荐上下文 */
  recommendContext: string;
  /** 推荐上下文开关（关闭时配置仍保留但不生效） */
  recommendContextEnabled: boolean;
  /** 是否开启 AI 智能关联 */
  aiRelationEnabled: boolean;
  /** 是否允许被其他网站关联 */
  allowLinkedByOthers: boolean;
  /** 关联网站列表 */
  relatedSites: RelatedSiteItem[];
  /** 关联网站总开关（关闭时不生效但仍保留配置） */
  relatedSitesEnabled: boolean;
};

/**
 * 标签表单状态
 */
export type TagFormState = {
  id?: string;
  name: string;
  description: string;
  /** 关联的网站卡片 ID 列表（编辑标签时用于绑定/解绑站点） */
  siteIds: string[];
};

/**
 * 外观配置草稿（按主题区分）
 */
export type AppearanceDraft = Record<
  ThemeMode,
  {
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
    /** 桌面端磨砂强度 (0-100) */
    desktopCardFrosted: number;
    /** 移动端磨砂强度 (0-100) */
    mobileCardFrosted: number;
    isDefault: boolean;
  }
>;

/**
 * 网站表单默认值
 */
export const defaultSiteForm: SiteFormState = {
  name: "",
  url: "",
  description: null,
  iconUrl: "",
  iconBgColor: "transparent",
  skipOnlineCheck: false,
  onlineCheckFrequency: DEFAULT_ONLINE_CHECK_FREQUENCY,
  onlineCheckTimeout: DEFAULT_ONLINE_CHECK_TIMEOUT,
  onlineCheckMatchMode: DEFAULT_ONLINE_CHECK_MATCH_MODE,
  onlineCheckKeyword: "",
  onlineCheckFailThreshold: DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
  tagIds: [],
  accessRules: null,
  recommendContext: "",
  recommendContextEnabled: false,
  aiRelationEnabled: true,
  allowLinkedByOthers: true,
  relatedSites: [],
  relatedSitesEnabled: true,
};

/**
 * 标签表单默认值
 */
export const defaultTagForm: TagFormState = {
  name: "",
  description: "",
  siteIds: [],
};
