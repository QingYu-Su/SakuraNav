/**
 * 外观工具函数
 * @description 提取外观草稿构建和比较的通用逻辑
 */

import type { ThemeMode, ThemeAppearance } from "@/lib/base/types";
import type { AppearanceDraft } from "@/components/admin/types";

/**
 * 需要在草稿比较中检查的字段列表
 */
const DRAFT_COMPARE_KEYS = [
  "desktopWallpaperAssetId",
  "mobileWallpaperAssetId",
  "fontPreset",
  "fontSize",
  "overlayOpacity",
  "textColor",
  "logoAssetId",
  "faviconAssetId",
  "desktopCardFrosted",
  "mobileCardFrosted",
  "isDefault",
] as const;

/**
 * 从 ThemeAppearance 中提取草稿所需的单个主题字段
 */
const FROSTED_DEFAULTS: Record<ThemeMode, boolean> = {
  light: true,
  dark: false,
};

function extractThemeDraftFields(appearance: ThemeAppearance, theme: ThemeMode) {
  const frostedDefault = FROSTED_DEFAULTS[theme];
  return {
    desktopWallpaperAssetId: appearance.desktopWallpaperAssetId,
    desktopWallpaperUrl: appearance.desktopWallpaperUrl,
    mobileWallpaperAssetId: appearance.mobileWallpaperAssetId,
    mobileWallpaperUrl: appearance.mobileWallpaperUrl,
    fontPreset: appearance.fontPreset,
    fontSize: appearance.fontSize,
    overlayOpacity: appearance.overlayOpacity,
    textColor: appearance.textColor,
    logoAssetId: appearance.logoAssetId ?? null,
    logoUrl: appearance.logoUrl ?? null,
    faviconAssetId: appearance.faviconAssetId ?? null,
    faviconUrl: appearance.faviconUrl ?? null,
    desktopCardFrosted: appearance.desktopCardFrosted ?? frostedDefault,
    mobileCardFrosted: appearance.mobileCardFrosted ?? frostedDefault,
    isDefault: appearance.isDefault ?? false,
  };
}

/**
 * 从外观数据构建草稿
 */
export function buildAppearanceDraft(appearances: Record<ThemeMode, ThemeAppearance>): AppearanceDraft {
  return {
    light: extractThemeDraftFields(appearances.light, "light"),
    dark: extractThemeDraftFields(appearances.dark, "dark"),
  };
}

/**
 * 提取持久化所需的字段（不含 URL 字段，仅 ID 和配置值）
 */
function extractPersistFields(draft: AppearanceDraft[ThemeMode]) {
  return {
    desktopWallpaperAssetId: draft.desktopWallpaperAssetId,
    mobileWallpaperAssetId: draft.mobileWallpaperAssetId,
    fontPreset: draft.fontPreset,
    fontSize: draft.fontSize,
    overlayOpacity: draft.overlayOpacity,
    textColor: draft.textColor,
    logoAssetId: draft.logoAssetId,
    faviconAssetId: draft.faviconAssetId,
    desktopCardFrosted: draft.desktopCardFrosted,
    mobileCardFrosted: draft.mobileCardFrosted,
    isDefault: draft.isDefault,
  };
}

/**
 * 从草稿中提取持久化请求体
 */
export function buildPersistBody(draft: AppearanceDraft) {
  return {
    light: extractPersistFields(draft.light),
    dark: extractPersistFields(draft.dark),
  };
}

/**
 * 比较外观草稿和已保存的外观数据是否匹配
 */
export function appearanceDraftMatches(
  draft: AppearanceDraft,
  appearances: Record<ThemeMode, ThemeAppearance>,
): boolean {
  for (const mode of ["light", "dark"] as const) {
    for (const key of DRAFT_COMPARE_KEYS) {
      if (draft[mode][key] !== appearances[mode][key]) return false;
    }
  }
  return true;
}
