/**
 * Admin 模块类型定义
 * @description 定义管理后台相关的类型、状态和默认值
 */

import { type FontPresetKey, type ThemeMode } from "@/lib/base/types";

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
  tagIds: string[];
};

/**
 * 标签表单状态
 */
export type TagFormState = {
  id?: string;
  name: string;
  isHidden: boolean;
  description: string;
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
    desktopCardFrosted: boolean;
    mobileCardFrosted: boolean;
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
  tagIds: [],
};

/**
 * 标签表单默认值
 */
export const defaultTagForm: TagFormState = {
  name: "",
  isHidden: false,
  description: "",
};
