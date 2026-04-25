/**
 * @description 外观数据仓库 - 管理主题外观和应用设置的数据库操作
 * 所有外观操作按 ownerId 隔离，每个用户拥有独立的外观配置
 */

import type { ThemeAppearance, ThemeMode, AppSettings, FloatingButtonItem } from "@/lib/base/types";
import { getDefaultFloatingButtons } from "@/lib/base/types";
import { getDb } from "@/lib/database";
import { fontPresets, themeAppearanceDefaults } from "@/lib/config/config";

/** 外观数据库行类型 */
type AppearanceRow = {
  owner_id: string;
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

/**
 * 获取指定用户的外观设置
 * @param ownerId 用户 ID（管理员为 '__admin__'）
 * @description 如果用户没有自定义外观行，返回默认值
 */
export function getAppearances(ownerId: string): Record<ThemeMode, ThemeAppearance> {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color, logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      FROM theme_appearances
      WHERE owner_id = ?
      `
    )
    .all(ownerId) as AppearanceRow[];

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
      desktopCardFrosted: 100,
      mobileCardFrosted: 100,
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
      desktopCardFrosted: 0,
      mobileCardFrosted: 0,
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
      desktopCardFrosted: row.desktop_card_frosted ?? row.card_frosted ?? 0,
      mobileCardFrosted: row.mobile_card_frosted ?? row.card_frosted ?? 0,
      isDefault: Boolean(row.is_default),
    };
  }

  return appearances;
}

/**
 * 获取游客默认主题模式
 * @description 从管理员的外观行中读取 is_default 标记
 */
export function getDefaultTheme(): ThemeMode {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT theme FROM theme_appearances WHERE owner_id = '__admin__' AND is_default = 1`
    )
    .get() as { theme: ThemeMode } | undefined;
  return row?.theme ?? "dark";
}

/**
 * 更新指定用户的外观配置
 * @param ownerId 用户 ID（管理员为 '__admin__'）
 * @param appearances 外观配置数据
 */
export function updateAppearances(
  ownerId: string,
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
      desktopCardFrosted?: number;
      mobileCardFrosted?: number;
      isDefault?: boolean;
    }
  >
): void {
  const db = getDb();

  // is_default 仅管理员可设置（影响游客看到的默认主题）
  const anyIsDefault = ([ "light", "dark" ] as const).some(
    (theme) => appearances[theme].isDefault === true
  );
  if (anyIsDefault && ownerId === "__admin__") {
    db.exec("UPDATE theme_appearances SET is_default = 0 WHERE owner_id = '__admin__'");
  }

  const statement = db.prepare(`
    INSERT INTO theme_appearances (
      owner_id, theme,
      wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id,
      font_preset, font_size, overlay_opacity, text_color,
      logo_asset_id, favicon_asset_id,
      card_frosted, desktop_card_frosted, mobile_card_frosted,
      is_default
    ) VALUES (
      @ownerId, @theme,
      NULL, @desktopWallpaperAssetId, @mobileWallpaperAssetId,
      @fontPreset, @fontSize, @overlayOpacity, @textColor,
      @logoAssetId, @faviconAssetId,
      0, @desktopCardFrosted, @mobileCardFrosted,
      @isDefault
    )
    ON CONFLICT(owner_id, theme) DO UPDATE SET
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
        ownerId,
        theme,
        desktopWallpaperAssetId: appearances[theme].desktopWallpaperAssetId,
        mobileWallpaperAssetId: appearances[theme].mobileWallpaperAssetId,
        fontPreset: appearances[theme].fontPreset,
        fontSize: appearances[theme].fontSize,
        overlayOpacity: appearances[theme].overlayOpacity,
        textColor: appearances[theme].textColor,
        logoAssetId: appearances[theme].logoAssetId ?? null,
        faviconAssetId: appearances[theme].faviconAssetId ?? null,
        desktopCardFrosted: appearances[theme].desktopCardFrosted ?? 0,
        mobileCardFrosted: appearances[theme].mobileCardFrosted ?? 0,
        isDefault: appearances[theme].isDefault ? 1 : 0,
      });
    });
  });

  transaction();
}

/**
 * 删除指定用户的外观配置（恢复默认时使用）
 */
export function deleteUserAppearances(ownerId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM theme_appearances WHERE owner_id = ?").run(ownerId);
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

  const faviconAssetId = settingMap.get("site_favicon_asset_id") ?? null;

  return {
    lightLogoAssetId,
    lightLogoUrl: lightLogoAssetId
      ? `/api/assets/${lightLogoAssetId}/file`
      : null,
    darkLogoAssetId,
    darkLogoUrl: darkLogoAssetId
      ? `/api/assets/${darkLogoAssetId}/file`
      : null,
    faviconAssetId,
    faviconUrl: faviconAssetId
      ? `/api/assets/${faviconAssetId}/file`
      : null,
    siteName: settingMap.get("site_name") ?? null,
    onlineCheckEnabled: settingMap.get("online_check_enabled") !== "false",
    onlineCheckTime: Number(settingMap.get("online_check_time")) || 0,
    onlineCheckLastRun: settingMap.get("online_check_last_run") ?? null,
    socialTagDescription: settingMap.get("social_tag_description") ?? null,
    registrationEnabled: settingMap.get("registration_enabled") !== "false",
    aiApiKey: settingMap.get("ai_api_key") ?? "",
    aiApiKeyMasked: false,
    aiBaseUrl: settingMap.get("ai_base_url") ?? "",
    aiModel: settingMap.get("ai_model") ?? "",
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
  faviconAssetId?: string | null;
  siteName?: string | null;
  onlineCheckEnabled?: boolean;
  onlineCheckTime?: number;
  socialTagDescription?: string | null;
  registrationEnabled?: boolean;
  aiApiKey?: string;
  aiBaseUrl?: string;
  aiModel?: string;
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
    if (settings.faviconAssetId !== undefined) {
      statement.run({ key: "site_favicon_asset_id", value: settings.faviconAssetId });
    }
    if (settings.siteName !== undefined) {
      statement.run({ key: "site_name", value: settings.siteName || null });
    }
    if (settings.onlineCheckEnabled !== undefined) {
      statement.run({ key: "online_check_enabled", value: settings.onlineCheckEnabled ? "true" : "false" });
    }
    if (settings.onlineCheckTime !== undefined) {
      statement.run({ key: "online_check_time", value: String(settings.onlineCheckTime) });
    }
    if (settings.socialTagDescription !== undefined) {
      statement.run({ key: "social_tag_description", value: settings.socialTagDescription || null });
    }
    if (settings.registrationEnabled !== undefined) {
      statement.run({ key: "registration_enabled", value: settings.registrationEnabled ? "true" : "false" });
    }
    if (settings.aiApiKey !== undefined) {
      statement.run({ key: "ai_api_key", value: settings.aiApiKey });
    }
    if (settings.aiBaseUrl !== undefined) {
      statement.run({ key: "ai_base_url", value: settings.aiBaseUrl });
    }
    if (settings.aiModel !== undefined) {
      statement.run({ key: "ai_model", value: settings.aiModel });
    }
  });

  transaction();

  return getAppSettings();
}

/**
 * 获取悬浮按钮配置
 * @description 从 app_settings 表读取 floating_buttons JSON，未配置则返回默认值
 */
export function getFloatingButtons(): FloatingButtonItem[] {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'floating_buttons'").get() as { value: string } | undefined;
  if (!row?.value) return getDefaultFloatingButtons();
  try {
    return JSON.parse(row.value) as FloatingButtonItem[];
  } catch {
    return getDefaultFloatingButtons();
  }
}

/**
 * 更新悬浮按钮配置
 * @param buttons 按钮配置列表
 */
export function updateFloatingButtons(buttons: FloatingButtonItem[]): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES ('floating_buttons', @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run({ value: JSON.stringify(buttons) });
}
