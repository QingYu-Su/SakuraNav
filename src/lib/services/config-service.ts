/**
 * @description 配置服务 - 处理配置导入导出和重置功能
 */

import type { ThemeMode, FontPresetKey } from "@/lib/types";
import type {
  ConfigArchive,
  ConfigArchiveAppearance,
  ConfigArchiveAsset,
  ConfigArchiveSite,
  ConfigArchiveSiteTag,
  ConfigArchiveTag,
} from "@/lib/types";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/core/database";
import { seedDatabase } from "@/lib/core/database/seed";
import { listStoredAssets } from "./repositories/asset-repository";
import { getAppSettings } from "./repositories/appearance-repository";
import { fontPresets, themeAppearanceDefaults } from "@/lib/config";
import { slugify } from "@/lib/utils";

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

type SiteRow = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  icon_url: string | null;
  is_pinned: number;
  global_sort_order: number;
  created_at: string;
  updated_at: string;
};

type TagRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_hidden: number;
  logo_url: string | null;
  logo_bg_color: string | null;
};

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

function extFromMime(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    default:
      return ".bin";
  }
}

export function buildConfigArchive(): ConfigArchive {
  const db = getDb();
  const tagRows = db
    .prepare(
      `
      SELECT id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color
      FROM tags
      ORDER BY sort_order ASC, name COLLATE NOCASE ASC
      `,
    )
    .all() as TagRow[];
  const siteRows = db
    .prepare(
      `
      SELECT id, name, url, description, icon_url, global_sort_order, created_at, updated_at
      , is_pinned
      FROM sites
      ORDER BY is_pinned DESC, global_sort_order ASC, name COLLATE NOCASE ASC
      `,
    )
    .all() as SiteRow[];
  const siteTagRows = db
    .prepare(
      `
      SELECT site_id, tag_id, sort_order
      FROM site_tags
      ORDER BY tag_id ASC, sort_order ASC, site_id ASC
      `,
    )
    .all() as Array<{ site_id: string; tag_id: string; sort_order: number }>;
  const appearanceRows = db
    .prepare(
      `
      SELECT theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color, logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      FROM theme_appearances
      ORDER BY theme ASC
      `,
    )
    .all() as AppearanceRow[];
  const assets = listStoredAssets();

  const appearanceMap: Record<ThemeMode, ConfigArchiveAppearance> = {
    light: {
      theme: "light",
      desktopWallpaperAssetId: null,
      mobileWallpaperAssetId: null,
      fontPreset: themeAppearanceDefaults.light.fontPreset,
      fontSize: themeAppearanceDefaults.light.fontSize,
      overlayOpacity: themeAppearanceDefaults.light.overlayOpacity,
      textColor: themeAppearanceDefaults.light.textColor,
      logoAssetId: null,
      faviconAssetId: null,
      desktopCardFrosted: false,
      mobileCardFrosted: false,
      isDefault: false,
    },
    dark: {
      theme: "dark",
      desktopWallpaperAssetId: null,
      mobileWallpaperAssetId: null,
      fontPreset: themeAppearanceDefaults.dark.fontPreset,
      fontSize: themeAppearanceDefaults.dark.fontSize,
      overlayOpacity: themeAppearanceDefaults.dark.overlayOpacity,
      textColor: themeAppearanceDefaults.dark.textColor,
      logoAssetId: null,
      faviconAssetId: null,
      desktopCardFrosted: false,
      mobileCardFrosted: false,
      isDefault: true,
    },
  };

  for (const row of appearanceRows) {
    const desktopWallpaperAssetId = row.desktop_wallpaper_asset_id ?? row.wallpaper_asset_id ?? null;
    const mobileWallpaperAssetId = row.mobile_wallpaper_asset_id ?? null;

    appearanceMap[row.theme] = {
      theme: row.theme,
      desktopWallpaperAssetId,
      mobileWallpaperAssetId,
      fontPreset: (row.font_preset in fontPresets ? row.font_preset : "balanced") as FontPresetKey,
      fontSize: Number.isFinite(row.font_size) ? row.font_size : themeAppearanceDefaults[row.theme].fontSize,
      overlayOpacity: row.overlay_opacity,
      textColor: row.text_color,
      logoAssetId: row.logo_asset_id ?? null,
      faviconAssetId: row.favicon_asset_id ?? null,
      desktopCardFrosted: Boolean(row.desktop_card_frosted ?? row.card_frosted),
      mobileCardFrosted: Boolean(row.mobile_card_frosted ?? row.card_frosted),
      isDefault: Boolean(row.is_default),
    };
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tags: tagRows.map<ConfigArchiveTag>((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sortOrder: row.sort_order,
      isHidden: Boolean(row.is_hidden),
      logoUrl: row.logo_url,
    })),
    sites: siteRows.map<ConfigArchiveSite>((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      description: row.description,
      iconUrl: row.icon_url,
      isPinned: Boolean(row.is_pinned),
      globalSortOrder: row.global_sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    siteTags: siteTagRows.map<ConfigArchiveSiteTag>((row) => ({
      siteId: row.site_id,
      tagId: row.tag_id,
      sortOrder: row.sort_order,
    })),
    appearances: appearanceMap,
    settings: {
      lightLogoAssetId: getAppSettings().lightLogoAssetId,
      darkLogoAssetId: getAppSettings().darkLogoAssetId,
    },
    assets: assets.map<ConfigArchiveAsset>((asset) => ({
      id: asset.id,
      kind: asset.kind,
      mimeType: asset.mimeType,
      createdAt: asset.createdAt,
      archivePath: `assets/${path.basename(asset.filePath)}`,
    })),
  };
}

export function replaceConfigArchive(
  archive: ConfigArchive,
  assetFiles: Map<string, Buffer>,
) {
  const db = getDb();
  const uploadsDir = path.join(projectRoot, "storage", "uploads");
  const oldAssets = listStoredAssets();
  const nextAssetPaths = new Map<string, string>();
  const tagIds = new Set(archive.tags.map((tag) => tag.id));
  const siteIds = new Set(archive.sites.map((site) => site.id));
  const assetIds = new Set(archive.assets.map((asset) => asset.id));

  for (const relation of archive.siteTags) {
    if (!siteIds.has(relation.siteId)) {
      throw new Error(`站点关联引用了不存在的网站：${relation.siteId}`);
    }

    if (!tagIds.has(relation.tagId)) {
      throw new Error(`站点关联引用了不存在的标签：${relation.tagId}`);
    }
  }

  for (const theme of ["light", "dark"] as const) {
    const desktopWallpaperAssetId = archive.appearances[theme].desktopWallpaperAssetId;
    const mobileWallpaperAssetId = archive.appearances[theme].mobileWallpaperAssetId;

    if (desktopWallpaperAssetId && !assetIds.has(desktopWallpaperAssetId)) {
      throw new Error(`主题 ${theme} 引用了不存在的桌面壁纸资源：${desktopWallpaperAssetId}`);
    }

    if (mobileWallpaperAssetId && !assetIds.has(mobileWallpaperAssetId)) {
      throw new Error(`主题 ${theme} 引用了不存在的移动壁纸资源：${mobileWallpaperAssetId}`);
    }
  }

  if (
    archive.settings.lightLogoAssetId &&
    !assetIds.has(archive.settings.lightLogoAssetId)
  ) {
    throw new Error(`明亮主题 Logo 引用了不存在的资源：${archive.settings.lightLogoAssetId}`);
  }

  if (
    archive.settings.darkLogoAssetId &&
    !assetIds.has(archive.settings.darkLogoAssetId)
  ) {
    throw new Error(`暗黑主题 Logo 引用了不存在的资源：${archive.settings.darkLogoAssetId}`);
  }

  for (const asset of archive.assets) {
    if (!assetFiles.has(asset.id)) {
      throw new Error(`缺少资源文件：${asset.archivePath}`);
    }
  }

  fs.mkdirSync(uploadsDir, { recursive: true });

  for (const asset of archive.assets) {
    const archiveName = path.basename(asset.archivePath);
    const safeExt = path.extname(archiveName) || extFromMime(asset.mimeType);
    nextAssetPaths.set(asset.id, path.join(uploadsDir, `${asset.id}${safeExt}`));
  }

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM theme_appearances").run();
    db.prepare("DELETE FROM app_settings").run();
    db.prepare("DELETE FROM site_tags").run();
    db.prepare("DELETE FROM sites").run();
    db.prepare("DELETE FROM tags").run();
    db.prepare("DELETE FROM assets").run();

    const insertAsset = db.prepare(`
      INSERT INTO assets (id, kind, file_path, mime_type, created_at)
      VALUES (@id, @kind, @filePath, @mimeType, @createdAt)
    `);
    const insertTag = db.prepare(`
      INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url)
      VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl)
    `);
    const insertSite = db.prepare(`
      INSERT INTO sites (
        id, name, url, description, icon_url, is_pinned, global_sort_order, created_at, updated_at
      ) VALUES (
        @id, @name, @url, @description, @iconUrl, @isPinned, @globalSortOrder, @createdAt, @updatedAt
      )
    `);
    const insertSiteTag = db.prepare(`
      INSERT INTO site_tags (site_id, tag_id, sort_order)
      VALUES (@siteId, @tagId, @sortOrder)
    `);
    const insertAppearance = db.prepare(`
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
    `);
    const insertSetting = db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES (@key, @value)
    `);

    for (const asset of archive.assets) {
      const filePath = nextAssetPaths.get(asset.id) as string;
      fs.writeFileSync(filePath, assetFiles.get(asset.id) as Buffer);
      insertAsset.run({
        id: asset.id,
        kind: asset.kind,
        filePath,
        mimeType: asset.mimeType,
        createdAt: asset.createdAt,
      });
    }

    for (const tag of archive.tags) {
      insertTag.run({
        id: tag.id,
        name: tag.name,
        slug: tag.slug || slugify(tag.name) || tag.id,
        sortOrder: tag.sortOrder,
        isHidden: tag.isHidden ? 1 : 0,
        logoUrl: tag.logoUrl,
      });
    }

    for (const site of archive.sites) {
      insertSite.run({
        id: site.id,
        name: site.name,
        url: site.url,
        description: site.description,
        iconUrl: site.iconUrl,
        isPinned: site.isPinned ? 1 : 0,
        globalSortOrder: site.globalSortOrder,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
      });
    }

    for (const relation of archive.siteTags) {
      insertSiteTag.run(relation);
    }

    for (const theme of ["light", "dark"] as const) {
      insertAppearance.run(archive.appearances[theme]);
    }

    insertSetting.run({
      key: "site_logo_light_asset_id",
      value: archive.settings.lightLogoAssetId,
    });
    insertSetting.run({
      key: "site_logo_dark_asset_id",
      value: archive.settings.darkLogoAssetId,
    });
  });

  transaction();

  for (const asset of oldAssets) {
    if (asset.filePath !== nextAssetPaths.get(asset.id) && fs.existsSync(asset.filePath)) {
      fs.rmSync(asset.filePath, { force: true });
    }
  }
}

export function resetContentToDefaults() {
  const db = getDb();
  const oldAssets = listStoredAssets();

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM theme_appearances").run();
    db.prepare("DELETE FROM app_settings").run();
    db.prepare("DELETE FROM site_tags").run();
    db.prepare("DELETE FROM sites").run();
    db.prepare("DELETE FROM tags").run();
    db.prepare("DELETE FROM assets").run();
  });

  transaction();
  seedDatabase(db);

  for (const asset of oldAssets) {
    if (fs.existsSync(asset.filePath)) {
      fs.rmSync(asset.filePath, { force: true });
    }
  }
}
