/**
 * 用户数据导入 API 路由
 * @description 从 ZIP 包导入数据到当前用户的数据空间，支持 clean/incremental/overwrite 三种模式
 */

import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { getDb } from "@/lib/database";
import {
  getVisibleTags,
  getAllSitesForAdmin,
  getAppearances,
  getAppSettings,
  createAsset,
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import type { ImportMode, ThemeMode, SocialCardPayload } from "@/lib/base/types";
import { SAKURA_MANIFEST_KEY } from "@/lib/base/types";
import { fontPresets, themeAppearanceDefaults } from "@/lib/config/config";
import { extractAssetIdFromUrl } from "@/lib/utils/icon-utils";

const logger = createLogger("API:UserData:Import");

export const runtime = "nodejs";

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

/**
 * 从 ZIP 中提取资源文件到 uploads 目录并创建 asset 记录
 * @returns 资源 ID 映射（旧 ID → 新 ID）
 */
async function importAssetFilesAsync(zip: JSZip, ownerId: string): Promise<Map<string, string>> {
  const idMap = new Map<string, string>();
  const uploadsDir = path.join(projectRoot, "storage", "uploads", ownerId);
  fs.mkdirSync(uploadsDir, { recursive: true });

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    if (!relativePath.startsWith("assets/")) continue;

    const basename = path.basename(relativePath);
    const ext = path.extname(basename);
    const originalId = path.basename(basename, ext);

    const fileBuffer = await zipEntry.async("nodebuffer");

    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".png": "image/png", ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const mimeType = mimeMap[ext.toLowerCase()] ?? "image/jpeg";

    const asset = createAsset({
      kind: "wallpaper",
      filePath: "",
      mimeType,
    });

    const fileName = `${asset.id}${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, fileBuffer);

    const db = getDb();
    db.prepare("UPDATE assets SET file_path = ? WHERE id = ?").run(filePath, asset.id);

    idMap.set(originalId, asset.id);
  }
  return idMap;
}

/** 社交卡片唯一标识提取器：根据 cardType 从 payload 中提取业务唯一 ID */
function getSocialCardUniqueId(cardType: string, cardData: string | null): string | null {
  if (!cardData) return null;
  try {
    const payload = JSON.parse(cardData) as SocialCardPayload;
    switch (cardType) {
      case "qq": return payload.type === "qq" ? payload.qqNumber : null;
      case "wechat": return payload.type === "wechat" ? payload.wechatId : null;
      case "email": return payload.type === "email" ? payload.email : null;
      case "bilibili": return payload.type === "bilibili" ? payload.url?.toLowerCase() : null;
      case "github": return payload.type === "github" ? payload.url?.toLowerCase() : null;
      case "blog": return payload.type === "blog" ? payload.url?.toLowerCase() : null;
      case "wechat-official": return payload.type === "wechat-official" ? payload.accountName : null;
      case "telegram": return payload.type === "telegram" ? payload.url?.toLowerCase() : null;
      case "xiaohongshu": return payload.type === "xiaohongshu" ? payload.xhsId : null;
      case "douyin": return payload.type === "douyin" ? payload.douyinId : null;
      case "qq-group": return payload.type === "qq-group" ? payload.groupNumber : null;
      case "enterprise-wechat": return payload.type === "enterprise-wechat" ? payload.ewcId : null;
      default: return null;
    }
  } catch {
    return null;
  }
}

/** 规范化 URL 用于比较（忽略 https/http 和末尾斜杠） */
function normalizeUrlForCompare(url: string): string {
  return url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

/** 从站点列表构建社交卡片唯一 ID 映射（uniqueId → siteId） */
function buildSocialCardIdMap(sites: Array<{ id: string; card_type: string | null; card_data: string | null }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const site of sites) {
    if (!site.card_type) continue;
    const uniqueId = getSocialCardUniqueId(site.card_type, site.card_data);
    if (uniqueId) {
      map.set(`${site.card_type}:${uniqueId}`, site.id);
    }
  }
  return map;
}

/** 删除指定 asset 对应的物理文件和数据库记录 */
function cleanupAssetById(db: ReturnType<typeof getDb>, assetId: string | null) {
  if (!assetId) return;
  const row = db.prepare("SELECT file_path FROM assets WHERE id = ?").get(assetId) as { file_path: string } | undefined;
  if (row?.file_path && fs.existsSync(row.file_path)) {
    fs.rmSync(row.file_path, { force: true });
  }
  db.prepare("DELETE FROM assets WHERE id = ?").run(assetId);
}

/**
 * 清空指定用户的所有数据（标签、站点、外观、资源）
 * @description 在导入新数据前调用，清空旧数据以避免冲突
 * 必须在 importAssetFilesAsync 之前调用，否则新导入的资源文件会被删除
 */
function cleanUserData(ownerId: string) {
  const db = getDb();

  // 清理物理资源文件（在事务外执行，文件操作不在 SQLite 事务保护范围内）
  const uploadsDir = path.join(projectRoot, "storage", "uploads", ownerId);
  if (fs.existsSync(uploadsDir)) {
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(uploadsDir, { recursive: true });

  // 清理数据库记录
  db.transaction(() => {
    const siteIds = db.prepare("SELECT id FROM sites WHERE owner_id = ?").all(ownerId) as Array<{ id: string }>;
    const siteIdList = siteIds.map((s) => s.id);
    if (siteIdList.length > 0) {
      const ph = siteIdList.map(() => "?").join(",");
      db.prepare(`DELETE FROM site_tags WHERE site_id IN (${ph})`).run(...siteIdList);
    }
    db.prepare("DELETE FROM sites WHERE owner_id = ?").run(ownerId);
    db.prepare("DELETE FROM tags WHERE owner_id = ?").run(ownerId);
    db.prepare("DELETE FROM theme_appearances WHERE owner_id = ?").run(ownerId);
    db.prepare("DELETE FROM assets WHERE file_path LIKE ?").run(`%${path.sep}uploads${path.sep}${ownerId}${path.sep}%`);
  })();
}

/**
 * 从 JSON 格式的用户数据包导入（clean 模式）
 * @description 将导入数据写入当前用户的数据空间
 * 所有 tag/site 均使用新生成的 UUID，避免与数据库中其他用户的 ID 冲突
 * 注意：调用前必须先执行 cleanUserData + importAssetFilesAsync
 */
function importCleanFromJson(
  ownerId: string,
  data: {
    tags?: Array<{
      id: string; name: string; slug: string; sortOrder: number;
      isHidden: number; logoUrl: string | null; logoBgColor: string | null; description: string | null;
    }>;
    sites?: Array<{
      id: string; name: string; url: string; description: string | null;
      iconUrl: string | null; iconBgColor: string | null; isPinned: boolean;
      globalSortOrder: number; cardType: string | null; cardData: string | null;
      tags: Array<{ id: string; sortOrder: number }>;
    }>;
    appearances?: Record<ThemeMode, Record<string, unknown>>;
    settings?: { onlineCheckEnabled?: boolean; onlineCheckTime?: number };
  },
  assetIdMap: Map<string, string>,
) {
  const db = getDb();

  // 导入数据放在一个事务中，保证原子性
  db.transaction(() => {
    // 为所有标签生成新 ID，建立映射（旧 ID → 新 ID）
    const tagIdMap = new Map<string, string>();
    for (const tag of (data.tags ?? [])) {
      const newId = `tag-${crypto.randomUUID()}`;
      tagIdMap.set(tag.id, newId);
      db.prepare(
        `INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, owner_id)
         VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl, @logoBgColor, @description, @ownerId)`,
      ).run({
        id: newId, name: tag.name, slug: tag.slug, sortOrder: tag.sortOrder,
        isHidden: tag.isHidden ? 1 : 0, logoUrl: tag.logoUrl, logoBgColor: tag.logoBgColor,
        description: tag.description, ownerId,
      });
    }

    // 导入站点（同样使用新 ID）
    for (const site of (data.sites ?? [])) {
      const now = new Date().toISOString();
      const mappedIconUrl = mapIconUrlAssetId(site.iconUrl, assetIdMap);
      const newSiteId = `site-${crypto.randomUUID()}`;

      db.prepare(
        `INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, is_online,
         skip_online_check, is_pinned, global_sort_order, card_type, card_data, owner_id, created_at, updated_at)
         VALUES (@id, @name, @url, @description, @iconUrl, @iconBgColor, NULL,
         0, @isPinned, @sortOrder, @cardType, @cardData, @ownerId, @createdAt, @updatedAt)`,
      ).run({
        id: newSiteId, name: site.name, url: site.url, description: site.description,
        iconUrl: mappedIconUrl, iconBgColor: site.iconBgColor, isPinned: site.isPinned ? 1 : 0,
        sortOrder: site.globalSortOrder, cardType: site.cardType, cardData: site.cardData,
        ownerId, createdAt: now, updatedAt: now,
      });

      // 写入站点-标签关联（使用映射后的新 tag ID）
      for (const tagRef of site.tags) {
        const mappedTagId = tagIdMap.get(tagRef.id);
        if (mappedTagId) {
          db.prepare("INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)")
            .run(newSiteId, mappedTagId, tagRef.sortOrder);
        }
      }
    }

    // 导入外观配置
    if (data.appearances) {
      for (const theme of ["light", "dark"] as const) {
        const themeData = data.appearances[theme];
        if (!themeData) continue;

        const mapAssetId = (id: unknown): string | null => {
          if (!id || typeof id !== "string") return null;
          return assetIdMap.get(id) ?? null;
        };

        const desktopWallpaperAssetId = mapAssetId(themeData.desktopWallpaperAssetId);
        const mobileWallpaperAssetId = mapAssetId(themeData.mobileWallpaperAssetId);
        const fontPreset = (themeData.fontPreset as string in fontPresets ? themeData.fontPreset : themeAppearanceDefaults[theme].fontPreset) as string;
        const fontSize = (themeData.fontSize as number) ?? themeAppearanceDefaults[theme].fontSize;
        const overlayOpacity = (themeData.overlayOpacity as number) ?? themeAppearanceDefaults[theme].overlayOpacity;
        const textColor = (themeData.textColor as string) ?? themeAppearanceDefaults[theme].textColor;
        const desktopCardFrosted = typeof themeData.desktopCardFrosted === "number"
          ? (themeData.desktopCardFrosted as number) : 0;
        const mobileCardFrosted = typeof themeData.mobileCardFrosted === "number"
          ? (themeData.mobileCardFrosted as number) : 0;

        db.prepare(`
          INSERT INTO theme_appearances (owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id,
            mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color,
            logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default)
          VALUES (@ownerId, @theme, NULL, @desktopWallpaperAssetId, @mobileWallpaperAssetId,
            @fontPreset, @fontSize, @overlayOpacity, @textColor,
            NULL, NULL, 0, @desktopCardFrosted, @mobileCardFrosted, 0)
        `).run({
          ownerId, theme, desktopWallpaperAssetId, mobileWallpaperAssetId,
          fontPreset, fontSize, overlayOpacity, textColor,
          desktopCardFrosted: Number(desktopCardFrosted), mobileCardFrosted: Number(mobileCardFrosted),
        });
      }
    }

    // 导入应用设置（仅在线检测设置）
    if (data.settings) {
      const updates: Record<string, string> = {};
      if (data.settings.onlineCheckEnabled !== undefined) {
        updates.online_check_enabled = data.settings.onlineCheckEnabled ? "true" : "false";
      }
      if (data.settings.onlineCheckTime !== undefined) {
        updates.online_check_time = String(data.settings.onlineCheckTime);
      }
      const stmt = db.prepare("INSERT INTO app_settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
      for (const [key, value] of Object.entries(updates)) {
        stmt.run({ key, value });
      }
    }
  })();
}

/** 映射 iconUrl 中的 asset ID */
function mapIconUrlAssetId(iconUrl: string | null, assetIdMap: Map<string, string>): string | null {
  if (!iconUrl) return null;
  const assetId = extractAssetIdFromUrl(iconUrl);
  if (!assetId) return iconUrl; // 非 asset URL（如外部 favicon.im URL），原样返回
  const newAssetId = assetIdMap.get(assetId);
  if (newAssetId) return `/api/assets/${newAssetId}/file`;
  return null; // 资源未导入，置空
}

/**
 * 从 JSON 格式的用户数据包导入（增量/覆盖模式）
 */
function importMergeFromJson(
  ownerId: string,
  data: {
    tags?: Array<{
      id: string; name: string; slug: string; sortOrder: number;
      isHidden: number; logoUrl: string | null; logoBgColor: string | null; description: string | null;
    }>;
    sites?: Array<{
      id: string; name: string; url: string; description: string | null;
      iconUrl: string | null; iconBgColor: string | null; isPinned: boolean;
      globalSortOrder: number; cardType: string | null; cardData: string | null;
      tags: Array<{ id: string; sortOrder: number }>;
    }>;
    appearances?: Record<ThemeMode, Record<string, unknown>>;
    settings?: { onlineCheckEnabled?: boolean; onlineCheckTime?: number };
  },
  mode: "incremental" | "overwrite",
  assetIdMap: Map<string, string>,
) {
  const db = getDb();

  // 获取当前数据用于去重
  const currentTags = db.prepare("SELECT id, name, slug FROM tags WHERE owner_id = ?").all(ownerId) as Array<{
    id: string; name: string; slug: string;
  }>;
  const currentSites = db.prepare("SELECT id, url, card_type, card_data, icon_url FROM sites WHERE owner_id = ?").all(ownerId) as Array<{
    id: string; url: string; card_type: string | null; card_data: string | null; icon_url: string | null;
  }>;
  const currentTagNames = new Map(currentTags.map((t) => [t.name.toLowerCase(), t]));
  const currentSiteUrlMap = new Map(currentSites.filter((s) => !s.card_type).map((s) => [normalizeUrlForCompare(s.url), s]));
  const currentSocialCardMap = buildSocialCardIdMap(currentSites);
  const tagIdMap = new Map<string, string>();

  // 处理标签
  const processTags = db.transaction(() => {
    for (const tag of (data.tags ?? [])) {
      const nameLower = tag.name.toLowerCase();
      const existing = currentTagNames.get(nameLower);
      if (existing) {
        tagIdMap.set(tag.id, existing.id);
        if (mode === "overwrite") {
          db.prepare(
            `UPDATE tags SET name = @name, logo_url = @logoUrl, logo_bg_color = @logoBgColor, description = @description WHERE id = @id`,
          ).run({
            name: tag.name, logoUrl: tag.logoUrl, logoBgColor: tag.logoBgColor,
            description: tag.description, id: existing.id,
          });
        }
      } else {
        const newId = `tag-${crypto.randomUUID()}`;
        const orderRow = db
          .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM tags WHERE owner_id = ?")
          .get(ownerId) as { maxOrder: number };
        db.prepare(
          `INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, owner_id)
           VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl, @logoBgColor, @description, @ownerId)`,
        ).run({
          id: newId, name: tag.name, slug: tag.slug, sortOrder: orderRow.maxOrder + 1,
          isHidden: tag.isHidden ? 1 : 0, logoUrl: tag.logoUrl, logoBgColor: tag.logoBgColor,
          description: tag.description, ownerId,
        });
        tagIdMap.set(tag.id, newId);
        currentTagNames.set(nameLower, { id: newId, name: tag.name, slug: tag.slug });
      }
    }
  });
  processTags();

  // 处理站点（分普通网站和社交卡片）
  const processSites = db.transaction(() => {
    for (const site of (data.sites ?? [])) {
      const mappedIconUrl = mapIconUrlAssetId(site.iconUrl, assetIdMap);

      if (site.cardType) {
        // ── 社交卡片：按 cardType + 唯一 ID 匹配 ──
        const uniqueId = getSocialCardUniqueId(site.cardType, site.cardData);
        const matchKey = uniqueId ? `${site.cardType}:${uniqueId}` : null;
        const existingId = matchKey ? currentSocialCardMap.get(matchKey) : null;

        if (existingId) {
          if (mode === "overwrite") {
            // 覆盖模式：清理旧的自定义图标资源
            const oldSiteRow = db.prepare("SELECT icon_url FROM sites WHERE id = ?").get(existingId) as { icon_url: string | null } | undefined;
            const oldIconUrl = oldSiteRow?.icon_url ?? null;
            const oldAssetId = extractAssetIdFromUrl(oldIconUrl);
            // 新的图标也是自定义上传的才需要清理旧的
            const newAssetId = extractAssetIdFromUrl(mappedIconUrl);
            if (oldAssetId && newAssetId && oldAssetId !== newAssetId) {
              cleanupAssetById(db, oldAssetId);
            }

            db.prepare(
              `UPDATE sites SET name = @name, description = @description, icon_url = @iconUrl,
               icon_bg_color = @iconBgColor, card_data = @cardData, updated_at = @updatedAt WHERE id = @id`,
            ).run({
              name: site.name, description: site.description, iconUrl: mappedIconUrl,
              iconBgColor: site.iconBgColor, cardData: site.cardData,
              updatedAt: new Date().toISOString(), id: existingId,
            });
          }
          // 增量模式：跳过已有的社交卡片
        } else {
          // 新社交卡片
          const newId = `site-${crypto.randomUUID()}`;
          const orderRow = db
            .prepare("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM sites WHERE owner_id = ?")
            .get(ownerId) as { maxOrder: number };
          const now = new Date().toISOString();
          db.prepare(
            `INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, is_online,
             skip_online_check, is_pinned, global_sort_order, card_type, card_data, owner_id, created_at, updated_at)
             VALUES (@id, @name, @url, @description, @iconUrl, @iconBgColor, NULL,
             0, @isPinned, @sortOrder, @cardType, @cardData, @ownerId, @createdAt, @updatedAt)`,
          ).run({
            id: newId, name: site.name, url: site.url, description: site.description,
            iconUrl: mappedIconUrl, iconBgColor: site.iconBgColor, isPinned: site.isPinned ? 1 : 0,
            sortOrder: orderRow.maxOrder + 1, cardType: site.cardType, cardData: site.cardData,
            ownerId, createdAt: now, updatedAt: now,
          });
        }
      } else {
        // ── 普通网站：按 URL 匹配 ──
        const urlNorm = normalizeUrlForCompare(site.url);
        const existing = currentSiteUrlMap.get(urlNorm);

        if (existing) {
          if (mode === "overwrite") {
            // 清理旧的自定义图标资源
            const oldIconAssetId = extractAssetIdFromUrl(existing.icon_url);
            const newAssetId = extractAssetIdFromUrl(mappedIconUrl);
            if (oldIconAssetId && newAssetId && oldIconAssetId !== newAssetId) {
              cleanupAssetById(db, oldIconAssetId);
            }

            db.prepare(
              `UPDATE sites SET name = @name, description = @description, icon_url = @iconUrl,
               icon_bg_color = @iconBgColor, updated_at = @updatedAt WHERE id = @id`,
            ).run({
              name: site.name, description: site.description, iconUrl: mappedIconUrl,
              iconBgColor: site.iconBgColor, updatedAt: new Date().toISOString(), id: existing.id,
            });

            // 更新站点-标签关联
            const mappedTagIds = site.tags.map((t) => tagIdMap.get(t.id)).filter((id): id is string => id != null);
            db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(existing.id);
            mappedTagIds.forEach((tid, i) => {
              db.prepare("INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)").run(existing.id, tid, i);
            });
          }
          // 增量模式：跳过已有网站
        } else {
          // 新网站
          const newId = `site-${crypto.randomUUID()}`;
          const orderRow = db
            .prepare("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM sites WHERE owner_id = ?")
            .get(ownerId) as { maxOrder: number };
          const now = new Date().toISOString();
          db.prepare(
            `INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, is_online,
             skip_online_check, is_pinned, global_sort_order, card_type, card_data, owner_id, created_at, updated_at)
             VALUES (@id, @name, @url, @description, @iconUrl, @iconBgColor, NULL,
             0, @isPinned, @sortOrder, @cardType, @cardData, @ownerId, @createdAt, @updatedAt)`,
          ).run({
            id: newId, name: site.name, url: site.url, description: site.description,
            iconUrl: mappedIconUrl, iconBgColor: site.iconBgColor, isPinned: site.isPinned ? 1 : 0,
            sortOrder: orderRow.maxOrder + 1, cardType: site.cardType, cardData: site.cardData,
            ownerId, createdAt: now, updatedAt: now,
          });

          const mappedTagIds = site.tags.map((t) => tagIdMap.get(t.id)).filter((id): id is string => id != null);
          mappedTagIds.forEach((tid, i) => {
            db.prepare("INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)").run(newId, tid, i);
          });

          currentSiteUrlMap.set(urlNorm, { id: newId, url: site.url, card_type: null, card_data: null, icon_url: mappedIconUrl });
        }
      }
    }
  });
  processSites();

  // 导入外观配置（增量/覆盖模式：不改变设置）
  if (data.appearances && mode === "overwrite") {
    for (const theme of ["light", "dark"] as const) {
      const themeData = data.appearances[theme];
      if (!themeData) continue;

      const mapAssetId = (id: unknown): string | null => {
        if (!id || typeof id !== "string") return null;
        return assetIdMap.get(id) ?? null;
      };

      const desktopWallpaperAssetId = mapAssetId(themeData.desktopWallpaperAssetId);
      const mobileWallpaperAssetId = mapAssetId(themeData.mobileWallpaperAssetId);
      const fontPreset = (themeData.fontPreset as string in fontPresets ? themeData.fontPreset : themeAppearanceDefaults[theme].fontPreset) as string;
      const fontSize = (themeData.fontSize as number) ?? themeAppearanceDefaults[theme].fontSize;
      const overlayOpacity = (themeData.overlayOpacity as number) ?? themeAppearanceDefaults[theme].overlayOpacity;
      const textColor = (themeData.textColor as string) ?? themeAppearanceDefaults[theme].textColor;
      const desktopCardFrosted = typeof themeData.desktopCardFrosted === "number"
        ? (themeData.desktopCardFrosted as number) : 0;
      const mobileCardFrosted = typeof themeData.mobileCardFrosted === "number"
        ? (themeData.mobileCardFrosted as number) : 0;

      // 覆盖模式：先清理旧壁纸资源
      const oldRow = db.prepare(
        "SELECT desktop_wallpaper_asset_id, mobile_wallpaper_asset_id FROM theme_appearances WHERE owner_id = ? AND theme = ?"
      ).get(ownerId, theme) as {
        desktop_wallpaper_asset_id: string | null;
        mobile_wallpaper_asset_id: string | null;
      } | undefined;

      if (oldRow) {
        for (const oldAssetId of [oldRow.desktop_wallpaper_asset_id, oldRow.mobile_wallpaper_asset_id]) {
          cleanupAssetById(db, oldAssetId);
        }
      }

      db.prepare(`
        INSERT INTO theme_appearances (owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id,
          mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color,
          logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default)
        VALUES (@ownerId, @theme, NULL, @desktopWallpaperAssetId, @mobileWallpaperAssetId,
          @fontPreset, @fontSize, @overlayOpacity, @textColor,
          NULL, NULL, 0, @desktopCardFrosted, @mobileCardFrosted, 0)
        ON CONFLICT(owner_id, theme) DO UPDATE SET
          desktop_wallpaper_asset_id = excluded.desktop_wallpaper_asset_id,
          mobile_wallpaper_asset_id = excluded.mobile_wallpaper_asset_id,
          font_preset = excluded.font_preset, font_size = excluded.font_size,
          overlay_opacity = excluded.overlay_opacity, text_color = excluded.text_color,
          desktop_card_frosted = excluded.desktop_card_frosted,
          mobile_card_frosted = excluded.mobile_card_frosted
      `).run({
        ownerId, theme, desktopWallpaperAssetId, mobileWallpaperAssetId,
        fontPreset, fontSize, overlayOpacity, textColor,
        desktopCardFrosted: Number(desktopCardFrosted), mobileCardFrosted: Number(mobileCardFrosted),
      });
    }
  }
  // 增量模式：不修改外观配置和设置
}

/**
 * 导入用户数据
 */
export async function POST(request: Request) {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    logger.info("开始导入用户数据", { ownerId });

    const formData = await request.formData();
    const file = formData.get("file");
    const mode = (formData.get("mode") as ImportMode | null) ?? "clean";

    if (!(file instanceof File)) {
      return jsonError("请先选择配置文件");
    }
    if (!["clean", "incremental", "overwrite"].includes(mode)) {
      return jsonError("无效的导入模式");
    }

    logger.info("正在解析用户数据文件", { filename: file.name, mode });

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    // 检查 manifest
    const manifestFile = zip.file("manifest.json");
    let manifest: Record<string, unknown> = {};
    if (manifestFile) {
      manifest = JSON.parse(await manifestFile.async("string"));
    }

    const scope = manifest.scope as string | undefined;

    if (scope === "user" && zip.file("data.json")) {
      const dataJson = JSON.parse(await zip.file("data.json")!.async("string"));

      // clean 模式：先清空旧数据，再提取资源文件（顺序关键，否则新资源会被清空）
      if (mode === "clean") {
        cleanUserData(ownerId);
      }

      const assetIdMap = await importAssetFilesAsync(zip, ownerId);

      if (mode === "clean") {
        importCleanFromJson(ownerId, dataJson, assetIdMap);
        logger.info("用户数据导入成功（clean 模式，JSON 格式）");
      } else {
        importMergeFromJson(ownerId, dataJson, mode, assetIdMap);
        logger.info("用户数据导入成功", { mode, format: "JSON" });
      }
    } else if (manifest.signature === SAKURA_MANIFEST_KEY) {
      // 全局 SakuraNav 格式（SQLite）— 仅支持 clean 模式（管理员级 ZIP 不含用户数据格式）
      return jsonError("该配置文件为全局备份格式，不支持在用户级导入");
    } else {
      return jsonError("无法识别的导入文件格式");
    }

    return jsonOk({
      ok: true,
      tags: getVisibleTags(ownerId),
      sites: getAllSitesForAdmin(),
      appearances: getAppearances(ownerId),
      settings: getAppSettings(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("导入用户数据失败", error);
    return jsonError(error instanceof Error ? error.message : "导入失败", 500);
  }
}
