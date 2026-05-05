/**
 * @description 数据库种子数据 - 为空数据库填充初始数据（标签、网站、主题外观）
 * 使用 DatabaseAdapter 接口，兼容 SQLite/MySQL/PostgreSQL
 */

import type { DatabaseAdapter } from "./adapter";
import { themeAppearanceDefaults } from "@/lib/config/config";

/**
 * 填充数据库种子数据（仅在对应表为空时执行）
 * @param adapter 数据库适配器实例
 */
export async function seedDatabase(adapter: DatabaseAdapter): Promise<void> {
  const hasTags = await adapter.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM tags");
  const hasSites = await adapter.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM sites");
  const hasAppearance = await adapter.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM theme_appearances");

  if (!hasTags?.count) {
    const seedTags = [
      { id: "tag-seed-1", name: "开源社区", slug: "开源社区", sortOrder: 0, isHidden: 0 },
      { id: "tag-seed-2", name: "视频平台", slug: "视频平台", sortOrder: 1, isHidden: 0 },
      { id: "tag-seed-3", name: "AI工具", slug: "ai工具", sortOrder: 2, isHidden: 0 },
      { id: "tag-seed-4", name: "在线翻译", slug: "在线翻译", sortOrder: 3, isHidden: 0 },
    ];

    await adapter.transaction(async () => {
      for (const tag of seedTags) {
        await adapter.execute(
          "INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, owner_id) VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl, '__admin__')",
          { ...tag, logoUrl: null }
        );
      }
    });
  }

  if (!hasSites?.count) {
    const now = new Date().toISOString();
    const sites = [
      {
        id: "site-seed-1", name: "GitHub", url: "https://github.com/",
        description: "全球最大的代码托管与协作开发平台",
        iconUrl: "https://favicon.im/github.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        globalSortOrder: 0, tags: ["tag-seed-1"],
      },
      {
        id: "site-seed-2", name: "哔哩哔哩", url: "https://www.bilibili.com/",
        description: "中国年轻人聚集的文化社区和视频平台，涵盖番剧、游戏、科技、生活等内容。",
        iconUrl: "https://favicon.im/www.bilibili.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        globalSortOrder: 1, tags: ["tag-seed-2"],
      },
      {
        id: "site-seed-3", name: "ChatGPT", url: "https://chatgpt.com/",
        description: "OpenAI开发的AI对话助手，支持自然语言问答、内容生成和编程辅助。",
        iconUrl: "https://favicon.im/chatgpt.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        globalSortOrder: 2, tags: ["tag-seed-3"],
      },
      {
        id: "site-seed-4", name: "有道翻译", url: "https://fanyi.youdao.com/#/",
        description: "网易推出的在线翻译工具，支持多语言文本翻译和网页翻译。",
        iconUrl: "https://favicon.im/fanyi.youdao.com?larger=true&throw-error-on-404=true",
        iconBgColor: "transparent",
        globalSortOrder: 3, tags: ["tag-seed-4"],
      },
    ];

    await adapter.transaction(async () => {
      for (const site of sites) {
        await adapter.execute(
          `INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, is_pinned, global_sort_order,
            skip_online_check, online_check_frequency, online_check_timeout, online_check_match_mode,
            online_check_keyword, online_check_fail_threshold, online_check_fail_count,
            access_rules, card_type, card_data, owner_id,
            recommend_context, ai_relation_enabled, allow_linked_by_others, related_sites_enabled,
            recommend_context_enabled, recommend_context_auto_gen,
            pending_ai_analysis, pending_context_gen, search_text,
            notes, notes_ai_enabled, todos, todos_ai_enabled,
            created_at, updated_at)
           VALUES (@id, @name, @url, @description, @iconUrl, @iconBgColor, 0, @globalSortOrder,
            0, '1d', 3, 'status', '', 3, 0,
            NULL, NULL, NULL, '__admin__',
            '', 1, 1, 1,
            1, 1,
            0, 0, '',
            '', 1, '[]', 1,
            @createdAt, @updatedAt)`,
          {
            id: site.id, name: site.name, url: site.url, description: site.description,
            iconUrl: site.iconUrl, iconBgColor: site.iconBgColor,
            globalSortOrder: site.globalSortOrder, createdAt: now, updatedAt: now,
          }
        );
        for (let i = 0; i < site.tags.length; i++) {
          await adapter.execute(
            "INSERT INTO site_tags (site_id, tag_id, sort_order) VALUES (@siteId, @tagId, @sortOrder)",
            { siteId: site.id, tagId: site.tags[i], sortOrder: i }
          );
        }
      }
    });
  }

  if (!hasAppearance?.count) {
    await adapter.execute(
      `INSERT INTO theme_appearances (
        owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id,
        font_preset, font_size, overlay_opacity, text_color, logo_asset_id, favicon_asset_id,
        card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      ) VALUES (
        '__admin__', @theme, @wallpaperAssetId, @desktopWallpaperAssetId, @mobileWallpaperAssetId,
        @fontPreset, @fontSize, @overlayOpacity, @textColor, NULL, NULL,
        0, @desktopCardFrosted, @mobileCardFrosted, @isDefault
      )`,
      {
        theme: "light", wallpaperAssetId: null, desktopWallpaperAssetId: null, mobileWallpaperAssetId: null,
        fontPreset: themeAppearanceDefaults.light.fontPreset, fontSize: themeAppearanceDefaults.light.fontSize,
        overlayOpacity: themeAppearanceDefaults.light.overlayOpacity, textColor: themeAppearanceDefaults.light.textColor,
        desktopCardFrosted: 100, mobileCardFrosted: 100, isDefault: 0,
      }
    );

    await adapter.execute(
      `INSERT INTO theme_appearances (
        owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id,
        font_preset, font_size, overlay_opacity, text_color, logo_asset_id, favicon_asset_id,
        card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      ) VALUES (
        '__admin__', @theme, @wallpaperAssetId, @desktopWallpaperAssetId, @mobileWallpaperAssetId,
        @fontPreset, @fontSize, @overlayOpacity, @textColor, NULL, NULL,
        0, @desktopCardFrosted, @mobileCardFrosted, @isDefault
      )`,
      {
        theme: "dark", wallpaperAssetId: null, desktopWallpaperAssetId: null, mobileWallpaperAssetId: null,
        fontPreset: themeAppearanceDefaults.dark.fontPreset, fontSize: themeAppearanceDefaults.dark.fontSize,
        overlayOpacity: themeAppearanceDefaults.dark.overlayOpacity, textColor: themeAppearanceDefaults.dark.textColor,
        desktopCardFrosted: 0, mobileCardFrosted: 0, isDefault: 1,
      }
    );
  }
}
