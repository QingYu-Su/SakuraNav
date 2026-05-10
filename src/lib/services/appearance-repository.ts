/**
 * @description 外观数据仓库 - 管理主题外观和应用设置的数据库操作
 * 所有外观操作按 ownerId 隔离，每个用户拥有独立的外观配置
 */

import type { ThemeAppearance, ThemeMode, AppSettings, FloatingButtonItem } from "@/lib/base/types";
import { getDefaultFloatingButtons, SOCIAL_TAG_ID, NOTE_TAG_ID } from "@/lib/base/types";
import type { Tag } from "@/lib/base/types";
import { getDb } from "@/lib/database";
import { fontPresets, themeAppearanceDefaults } from "@/lib/config/config";
import { getSocialCardCount, getNoteCardCount } from "./card-repository";

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
export async function getAppearances(ownerId: string): Promise<Record<ThemeMode, ThemeAppearance>> {
  const db = await getDb();
  const rows = await db.query<AppearanceRow>(
    `
      SELECT owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color, logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      FROM theme_appearances
      WHERE owner_id = ?
      `,
    [ownerId]
  );

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
export async function getDefaultTheme(): Promise<ThemeMode> {
  const db = await getDb();
  const row = await db.queryOne<{ theme: ThemeMode }>(
    `SELECT theme FROM theme_appearances WHERE owner_id = '__admin__' AND is_default = 1`
  );
  return row?.theme ?? "dark";
}

/**
 * 更新指定用户的外观配置
 * @param ownerId 用户 ID（管理员为 '__admin__'）
 * @param appearances 外观配置数据
 */
export async function updateAppearances(
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
): Promise<void> {
  const db = await getDb();

  // is_default 仅管理员可设置（影响游客看到的默认主题）
  const anyIsDefault = ([ "light", "dark" ] as const).some(
    (theme) => appearances[theme].isDefault === true
  );
  if (anyIsDefault && ownerId === "__admin__") {
    await db.exec("UPDATE theme_appearances SET is_default = 0 WHERE owner_id = '__admin__'");
  }

  const sql = `
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
  `;

  await db.transaction(async () => {
    for (const theme of ["light", "dark"] as const) {
      await db.execute(sql, {
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
    }
  });
}

/**
 * 删除指定用户的外观配置（恢复默认时使用）
 */
export async function deleteUserAppearances(ownerId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM theme_appearances WHERE owner_id = ?", [ownerId]);
}

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.query<AppSettingRow>("SELECT key, value FROM app_settings");
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
export async function updateAppSettings(settings: {
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
}): Promise<AppSettings> {
  const db = await getDb();
  const sql = `
    INSERT INTO app_settings (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `;

  await db.transaction(async () => {
    await db.execute(sql, {
      key: "site_logo_light_asset_id",
      value: settings.lightLogoAssetId,
    });
    await db.execute(sql, {
      key: "site_logo_dark_asset_id",
      value: settings.darkLogoAssetId,
    });
    if (settings.faviconAssetId !== undefined) {
      await db.execute(sql, { key: "site_favicon_asset_id", value: settings.faviconAssetId });
    }
    if (settings.siteName !== undefined) {
      await db.execute(sql, { key: "site_name", value: settings.siteName || null });
    }
    if (settings.onlineCheckEnabled !== undefined) {
      await db.execute(sql, { key: "online_check_enabled", value: settings.onlineCheckEnabled ? "true" : "false" });
    }
    if (settings.onlineCheckTime !== undefined) {
      await db.execute(sql, { key: "online_check_time", value: String(settings.onlineCheckTime) });
    }
    if (settings.socialTagDescription !== undefined) {
      await db.execute(sql, { key: "social_tag_description", value: settings.socialTagDescription || null });
    }
    if (settings.registrationEnabled !== undefined) {
      await db.execute(sql, { key: "registration_enabled", value: settings.registrationEnabled ? "true" : "false" });
    }
    if (settings.aiApiKey !== undefined) {
      await db.execute(sql, { key: "ai_api_key", value: settings.aiApiKey });
    }
    if (settings.aiBaseUrl !== undefined) {
      await db.execute(sql, { key: "ai_base_url", value: settings.aiBaseUrl });
    }
    if (settings.aiModel !== undefined) {
      await db.execute(sql, { key: "ai_model", value: settings.aiModel });
    }
  });

  return getAppSettings();
}

/**
 * 获取虚拟标签（社交卡片/笔记卡片）的排序位置
 * @returns 虚拟标签 ID → 在完整标签列表中的位置索引，未配置则返回空对象
 */
export async function getVirtualTagSortOrders(): Promise<Record<string, number>> {
  const db = await getDb();
  const row = await db.queryOne<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'virtual_tag_sort_orders'"
  );
  if (!row?.value) return {};
  try {
    return JSON.parse(row.value) as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * 保存单条应用设置（upsert）
 */
export async function upsertAppSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO app_settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    { key, value },
  );
}

/**
 * 保存虚拟标签（社交卡片/笔记卡片）的排序位置
 * @param orders 虚拟标签 ID → 在完整标签列表中的位置索引
 */
export async function saveVirtualTagSortOrders(orders: Record<string, number>): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO app_settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    { key: "virtual_tag_sort_orders", value: JSON.stringify(orders) }
  );
}

/**
 * 将虚拟标签按存储的位置索引插入到真实标签列表中
 * @param tags 真实标签列表（会被原地修改）
 * @param virtualTags 虚拟标签配置数组，每项需含 sortOrder（目标位置索引）
 */
export function insertVirtualTagsBySortOrder<T extends { sortOrder: number }>(
  tags: T[],
  virtualTags: T[],
): void {
  if (virtualTags.length === 0) return;

  // 从后往前插入，避免索引偏移
  const adjusted = virtualTags
    .map((vt, i) => ({ vt, adjustedPos: vt.sortOrder - i }))
    .sort((a, b) => b.adjustedPos - a.adjustedPos || b.vt.sortOrder - a.vt.sortOrder);

  for (const { vt, adjustedPos } of adjusted) {
    const pos = Math.min(Math.max(adjustedPos, 0), tags.length);
    tags.splice(pos, 0, vt);
  }
}

/**
 * 为真实标签列表注入虚拟标签（社交卡片、笔记卡片）
 * @param tags 真实标签列表（会被原地修改）
 * @param ownerId 数据所有者 ID，用于按用户统计卡片数量
 */
export async function injectVirtualTags(tags: Tag[], ownerId: string): Promise<void> {
  const virtualSortOrders = await getVirtualTagSortOrders();
  const settings = await getAppSettings();
  const virtualConfigs: Tag[] = [];

  const cardCount = await getSocialCardCount(ownerId);
  if (cardCount > 0) {
    virtualConfigs.push({
      id: SOCIAL_TAG_ID,
      name: "社交卡片",
      slug: "social-cards",
      sortOrder: virtualSortOrders[SOCIAL_TAG_ID] ?? 0,
      isHidden: false,
      logoUrl: null,
      logoBgColor: null,
      siteCount: cardCount,
      description: settings.socialTagDescription,
    });
  }

  const noteCardCount = await getNoteCardCount(ownerId);
  if (noteCardCount > 0) {
    virtualConfigs.push({
      id: NOTE_TAG_ID,
      name: "笔记卡片",
      slug: "note-cards",
      sortOrder: virtualSortOrders[NOTE_TAG_ID] ?? virtualConfigs.length,
      isHidden: false,
      logoUrl: null,
      logoBgColor: null,
      siteCount: noteCardCount,
      description: null,
    });
  }

  insertVirtualTagsBySortOrder(tags, virtualConfigs);
}

/**
 * 获取悬浮按钮配置
 * @description 从 app_settings 表读取 floating_buttons JSON，未配置则返回默认值。
 * 读取后与默认配置合并：确保新增的内置按钮（editable=false）自动出现在用户已保存的配置中。
 */
export async function getFloatingButtons(): Promise<FloatingButtonItem[]> {
  const db = await getDb();
  const row = await db.queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'floating_buttons'");
  if (!row?.value) return getDefaultFloatingButtons();
  try {
    const saved = JSON.parse(row.value) as FloatingButtonItem[];
    return mergeWithDefaults(saved);
  } catch {
    return getDefaultFloatingButtons();
  }
}

/**
 * 将用户已保存的按钮配置与默认配置合并
 * @description 确保新增的内置按钮（editable=false）自动插入，保持默认顺序：
 *   scroll-top → quick-search → ai-workflow → feedback → 用户自定义按钮
 * 已存在的内置按钮保留用户的 enabled 状态。
 */
function mergeWithDefaults(saved: FloatingButtonItem[]): FloatingButtonItem[] {
  const defaults = getDefaultFloatingButtons();
  const savedIds = new Set(saved.map((b) => b.id));

  // 找到默认内置按钮中用户配置里缺失的
  const missing = defaults.filter((d) => !d.editable && !savedIds.has(d.id));
  if (missing.length === 0) return saved;

  // 将缺失的内置按钮按默认顺序插入到正确位置
  // 策略：在 quick-search 之后、第一个 editable 按钮之前插入
  const quickSearchIdx = saved.findIndex((b) => b.id === "quick-search");
  const firstEditableIdx = saved.findIndex((b) => b.editable);

  let insertIdx: number;
  if (quickSearchIdx >= 0) {
    insertIdx = quickSearchIdx + 1;
  } else if (firstEditableIdx >= 0) {
    insertIdx = firstEditableIdx;
  } else {
    insertIdx = saved.length;
  }

  const result = [...saved];
  result.splice(insertIdx, 0, ...missing);
  return result;
}

/**
 * 更新悬浮按钮配置
 * @param buttons 按钮配置列表
 */
export async function updateFloatingButtons(buttons: FloatingButtonItem[]): Promise<void> {
  const db = await getDb();
  await db.execute(`
    INSERT INTO app_settings (key, value)
    VALUES ('floating_buttons', @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `, { value: JSON.stringify(buttons) });
}
