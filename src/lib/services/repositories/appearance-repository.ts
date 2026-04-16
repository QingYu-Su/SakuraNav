/**
 * @description 外观数据仓库 - 管理主题外观和应用设置的数据库操作
 */

import type { ThemeAppearance, ThemeMode, AppSettings } from "@/lib/types";
import { getDb } from "@/lib/core/database";
import { fontPresets, themeAppearanceDefaults, siteConfig } from "@/lib/config";

/** 外观数据库行类型 */
type AppearanceRow = {
  theme: ThemeMode;
  wallpaper_asset_id: string | null;
  desktop_wallpaper_asset_id: string | null;
  mobile_wallpaper_asset_id: string | null;
  font_preset: string;
  font_size: number;
  overlay_opacity: number;
  text_color: string;
  logo_asset_id: string | null;
  favicon_asset_id: string | null;
  card_frosted: number;
  desktop_card_frosted: number;
  mobile_card_frosted: number;
  is_default: number;
};

type AppSettingRow = {
  key: string;
  value: string | null;
};

export function getAppearances(): Record<ThemeMode, ThemeAppearance> {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color, logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      FROM theme_appearances
      `
    )
    .all() as AppearanceRow[];

  const appearances: Record<ThemeMode, ThemeAppearance> = {
    light: {
      theme: "light" as const,
      desktopWallpaperAssetId: null,
      desktopWallpaperUrl: null,
      mobileWallpaperAssetId: null,
      mobileWallpaperUrl: null,
      fontPreset: themeAppearanceDefaults.light.fontPreset,
      fontSize: themeAppearanceDefaults.light.fontSize,
      overlayOpacity: themeAppearanceDefaults.light.overlayOpacity,
      textColor: themeAppearanceDefaults.light.textColor,
      logoAssetId: null,
      logoUrl: null,
      faviconAssetId: null,
      faviconUrl: null,
      desktopCardFrosted: false,
      mobileCardFrosted: false,
      isDefault: false,
    },
    dark: {
      theme: "dark" as const,
      desktopWallpaperAssetId: null,
      desktopWallpaperUrl: null,
      mobileWallpaperAssetId: null,
      mobileWallpaperUrl: null,
      fontPreset: themeAppearanceDefaults.dark.fontPreset,
      fontSize: themeAppearanceDefaults.dark.fontSize,
      overlayOpacity: themeAppearanceDefaults.dark.overlayOpacity,
      textColor: themeAppearanceDefaults.dark.textColor,
      logoAssetId: null,
      logoUrl: null,
      faviconAssetId: null,
      faviconUrl: null,
      desktopCardFrosted: false,
      mobileCardFrosted: false,
      isDefault: true,
    },
  };

  for (const row of rows) {
    const desktopWallpaperAssetId =
      row.desktop_wallpaper_asset_id ?? row.wallpaper_asset_id ?? null;
    const mobileWallpaperAssetId = row.mobile_wallpaper_asset_id ?? null;
    const logoAssetId = row.logo_asset_id ?? null;
    const faviconAssetId = row.favicon_asset_id ?? null;

    appearances[row.theme] = {
      theme: row.theme,
      desktopWallpaperAssetId,
      desktopWallpaperUrl: desktopWallpaperAssetId
        ? `/api/assets/${desktopWallpaperAssetId}/file`
        : null,
      mobileWallpaperAssetId,
      mobileWallpaperUrl: mobileWallpaperAssetId
        ? `/api/assets/${mobileWallpaperAssetId}/file`
        : null,
      fontPreset: row.font_preset in fontPresets ? (row.font_preset as keyof typeof fontPresets) : "balanced",
      fontSize: Number.isFinite(row.font_size)
        ? row.font_size
        : themeAppearanceDefaults[row.theme].fontSize,
      overlayOpacity: row.overlay_opacity,
      textColor: row.text_color,
      logoAssetId,
      logoUrl: logoAssetId ? `/api/assets/${logoAssetId}/file` : null,
      faviconAssetId,
      faviconUrl: faviconAssetId ? `/api/assets/${faviconAssetId}/file` : null,
      desktopCardFrosted: Boolean(row.desktop_card_frosted ?? row.card_frosted),
      mobileCardFrosted: Boolean(row.mobile_card_frosted ?? row.card_frosted),
      isDefault: Boolean(row.is_default),
    };
  }

  return appearances;
}

export function updateAppearances(
  appearances: Record<
    ThemeMode,
    {
      desktopWallpaperAssetId: string | null;
      mobileWallpaperAssetId: string | null;
      fontPreset: keyof typeof fontPresets;
      fontSize: number;
      overlayOpacity: number;
      textColor: string;
      logoAssetId?: string | null;
      faviconAssetId?: string | null;
      desktopCardFrosted?: boolean;
      mobileCardFrosted?: boolean;
      isDefault?: boolean;
    }
  >
): void {
  const db = getDb();

  const anyIsDefault = (["light", "dark"] as const).some(
    (theme) => appearances[theme].isDefault === true
  );
  if (anyIsDefault) {
    db.exec("UPDATE theme_appearances SET is_default = 0");
  }

  const statement = db.prepare(`
    INSERT INTO theme_appearances (
      theme,
      wallpaper_asset_id,
      desktop_wallpaper_asset_id,
      mobile_wallpaper_asset_id,
      font_preset,
      font_size,
      overlay_opacity,
      text_color,
      logo_asset_id,
      favicon_asset_id,
      card_frosted,
      desktop_card_frosted,
      mobile_card_frosted,
      is_default
    ) VALUES (
      @theme,
      NULL,
      @desktopWallpaperAssetId,
      @mobileWallpaperAssetId,
      @fontPreset,
      @fontSize,
      @overlayOpacity,
      @textColor,
      @logoAssetId,
      @faviconAssetId,
      0,
      @desktopCardFrosted,
      @mobileCardFrosted,
      @isDefault
    )
    ON CONFLICT(theme) DO UPDATE SET
      wallpaper_asset_id = excluded.wallpaper_asset_id,
      desktop_wallpaper_asset_id = excluded.desktop_wallpaper_asset_id,
      mobile_wallpaper_asset_id = excluded.mobile_wallpaper_asset_id,
      font_preset = excluded.font_preset,
      font_size = excluded.font_size,
      overlay_opacity = excluded.overlay_opacity,
      text_color = excluded.text_color,
      logo_asset_id = excluded.logo_asset_id,
      favicon_asset_id = excluded.favicon_asset_id,
      card_frosted = excluded.card_frosted,
      desktop_card_frosted = excluded.desktop_card_frosted,
      mobile_card_frosted = excluded.mobile_card_frosted,
      is_default = excluded.is_default
  `);

  const transaction = db.transaction(() => {
    (["light", "dark"] as const).forEach((theme) => {
      statement.run({
        theme,
        desktopWallpaperAssetId: appearances[theme].desktopWallpaperAssetId,
        mobileWallpaperAssetId: appearances[theme].mobileWallpaperAssetId,
        fontPreset: appearances[theme].fontPreset,
        fontSize: appearances[theme].fontSize,
        overlayOpacity: appearances[theme].overlayOpacity,
        textColor: appearances[theme].textColor,
        logoAssetId: appearances[theme].logoAssetId ?? null,
        faviconAssetId: appearances[theme].faviconAssetId ?? null,
        desktopCardFrosted: appearances[theme].desktopCardFrosted ? 1 : 0,
        mobileCardFrosted: appearances[theme].mobileCardFrosted ? 1 : 0,
        isDefault: appearances[theme].isDefault ? 1 : 0,
      });
    });
  });

  transaction();
}

export function getAppSettings(): AppSettings {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM app_settings").all() as AppSettingRow[];
  const settingMap = new Map(rows.map((row) => [row.key, row.value]));
  const lightLogoAssetId =
    settingMap.get("site_logo_light_asset_id") ??
    settingMap.get("site_logo_asset_id") ??
    null;
  const darkLogoAssetId =
    settingMap.get("site_logo_dark_asset_id") ??
    settingMap.get("site_logo_asset_id") ??
    null;

  return {
    lightLogoAssetId,
    lightLogoUrl: lightLogoAssetId
      ? `/api/assets/${lightLogoAssetId}/file`
      : siteConfig.logoSrc,
    darkLogoAssetId,
    darkLogoUrl: darkLogoAssetId
      ? `/api/assets/${darkLogoAssetId}/file`
      : siteConfig.logoSrc,
    siteName: settingMap.get("site_name") ?? null,
    onlineCheckEnabled: settingMap.get("online_check_enabled") === "true",
    onlineCheckTime: Number(settingMap.get("online_check_time")) || 0,
    onlineCheckLastRun: settingMap.get("online_check_last_run") ?? null,
  };
}

/**
 * 更新应用设置
 * @param settings 应用设置数据
 * @returns 更新后的应用设置对象
 */
export function updateAppSettings(settings: {
  lightLogoAssetId: string | null;
  darkLogoAssetId: string | null;
  siteName?: string | null;
  onlineCheckEnabled?: boolean;
  onlineCheckTime?: number;
}): AppSettings {
  const db = getDb();
  const statement = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const transaction = db.transaction(() => {
    statement.run({
      key: "site_logo_light_asset_id",
      value: settings.lightLogoAssetId,
    });
    statement.run({
      key: "site_logo_dark_asset_id",
      value: settings.darkLogoAssetId,
    });
    if (settings.siteName !== undefined) {
      statement.run({ key: "site_name", value: settings.siteName || null });
    }
    if (settings.onlineCheckEnabled !== undefined) {
      statement.run({ key: "online_check_enabled", value: settings.onlineCheckEnabled ? "true" : "false" });
    }
    if (settings.onlineCheckTime !== undefined) {
      statement.run({ key: "online_check_time", value: String(settings.onlineCheckTime) });
    }
  });

  transaction();

  return getAppSettings();
}
