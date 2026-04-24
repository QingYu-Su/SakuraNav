/**
 * @description 数据库种子数据 - 为空数据库填充初始数据（标签、网站、主题外观）
 */

import type Database from "better-sqlite3";
import { themeAppearanceDefaults } from "@/lib/config/config";
import { createSvgPlaceholder } from "@/lib/utils/utils";

/**
 * 填充数据库种子数据
 * @param db 数据库实例
 */
export function seedDatabase(db: Database.Database): void {
  const hasTags = db
    .prepare("SELECT COUNT(*) as count FROM tags")
    .get() as { count: number };
  const hasSites = db
    .prepare("SELECT COUNT(*) as count FROM sites")
    .get() as { count: number };
  const hasAppearance = db
    .prepare("SELECT COUNT(*) as count FROM theme_appearances")
    .get() as { count: number };

  if (!hasTags.count) {
    const seedTags = [
      { id: "tag-work", name: "工作", slug: "work", sortOrder: 0, isHidden: 0 },
      { id: "tag-dev", name: "开发", slug: "dev", sortOrder: 1, isHidden: 0 },
      { id: "tag-design", name: "设计", slug: "design", sortOrder: 2, isHidden: 0 },
      { id: "tag-ai", name: "AI", slug: "ai", sortOrder: 3, isHidden: 0 },
    ];

    const statement = db.prepare(
      "INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, owner_id) VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl, '__admin__')"
    );

    const insertMany = db.transaction(() => {
      for (const tag of seedTags) statement.run({ ...tag, logoUrl: null });
    });
    insertMany();
  }

  if (!hasSites.count) {
    const now = new Date().toISOString();
    const sites = [
      {
        id: "site-github",
        name: "GitHub",
        url: "https://github.com",
        description: "代码托管、Issue 协作与项目追踪的核心入口。",
        iconUrl: createSvgPlaceholder("G", "#24292f"),
        isPinned: false,
        globalSortOrder: 0,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-work", "tag-dev"],
      },
      {
        id: "site-figma",
        name: "Figma",
        url: "https://www.figma.com",
        description: "界面设计、原型协作和设计评审都能在这里完成。",
        iconUrl: createSvgPlaceholder("F", "#f24e1e"),
        isPinned: false,
        globalSortOrder: 1,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-design", "tag-work"],
      },
      {
        id: "site-openai",
        name: "OpenAI",
        url: "https://platform.openai.com",
        description: "模型平台、文档和实验入口集合。",
        iconUrl: createSvgPlaceholder("O", "#0f172a"),
        isPinned: false,
        globalSortOrder: 2,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-ai", "tag-dev"],
      },
      {
        id: "site-notion",
        name: "Notion",
        url: "https://www.notion.so",
        description: "把文档、任务和资料整理成统一的工作区。",
        iconUrl: createSvgPlaceholder("N", "#111827"),
        isPinned: false,
        globalSortOrder: 3,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-work"],
      },
      {
        id: "site-dribbble",
        name: "Dribbble",
        url: "https://dribbble.com",
        description: "灵感浏览、作品研究和视觉参考的常用站点。",
        iconUrl: createSvgPlaceholder("D", "#ea4c89"),
        isPinned: false,
        globalSortOrder: 4,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-design"],
      },
    ];

    const siteStatement = db.prepare(`
      INSERT INTO sites (
        id, name, url, description, icon_url, is_pinned, global_sort_order, owner_id, created_at, updated_at
      ) VALUES (
        @id, @name, @url, @description, @iconUrl, @isPinned, @globalSortOrder, '__admin__', @createdAt, @updatedAt
      )
    `);

    const siteTagStatement = db.prepare(`
      INSERT INTO site_tags (site_id, tag_id, sort_order)
      VALUES (@siteId, @tagId, @sortOrder)
    `);

    const insertSeed = db.transaction(() => {
      for (const site of sites) {
        siteStatement.run({
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
        site.tags.forEach((tagId, index) => {
          siteTagStatement.run({
            siteId: site.id,
            tagId,
            sortOrder: index + site.globalSortOrder,
          });
        });
      }
    });

    insertSeed();
  }

  if (!hasAppearance.count) {
    const statement = db.prepare(`
      INSERT OR REPLACE INTO theme_appearances (
        owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color, desktop_card_frosted, mobile_card_frosted, is_default
      ) VALUES (
        '__admin__', @theme, @wallpaperAssetId, @desktopWallpaperAssetId, @mobileWallpaperAssetId, @fontPreset, @fontSize, @overlayOpacity, @textColor, @desktopCardFrosted, @mobileCardFrosted, @isDefault
      )
    `);

    statement.run({
      theme: "light",
      wallpaperAssetId: null,
      desktopWallpaperAssetId: null,
      mobileWallpaperAssetId: null,
      fontPreset: themeAppearanceDefaults.light.fontPreset,
      fontSize: themeAppearanceDefaults.light.fontSize,
      overlayOpacity: themeAppearanceDefaults.light.overlayOpacity,
      textColor: themeAppearanceDefaults.light.textColor,
      desktopCardFrosted: 100,
      mobileCardFrosted: 100,
      isDefault: 0,
    });

    statement.run({
      theme: "dark",
      wallpaperAssetId: null,
      desktopWallpaperAssetId: null,
      mobileWallpaperAssetId: null,
      fontPreset: themeAppearanceDefaults.dark.fontPreset,
      fontSize: themeAppearanceDefaults.dark.fontSize,
      overlayOpacity: themeAppearanceDefaults.dark.overlayOpacity,
      textColor: themeAppearanceDefaults.dark.textColor,
      desktopCardFrosted: 0,
      mobileCardFrosted: 0,
      isDefault: 1,
    });
  }
}
