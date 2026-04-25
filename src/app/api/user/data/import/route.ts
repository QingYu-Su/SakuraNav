/**
 * 用户数据导入 API 路由
 * @description 从 ZIP 包导入数据到当前用户的数据空间，支持增量/覆盖模式
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { getDb } from "@/lib/database";
import {
  getVisibleTags,
  getAllSitesForAdmin,
  getAppearances,
  getAppSettings,
  mergeImportFromZip,
  createAsset,
  updateAppSettings,
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import type { ImportMode, ThemeMode } from "@/lib/base/types";
import { fontPresets, themeAppearanceDefaults } from "@/lib/config/config";

const logger = createLogger("API:UserData:Import");

export const runtime = "nodejs";

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

/**
 * 从 ZIP 中提取壁纸资源文件到 uploads 目录并创建 asset 记录
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

    // 先读取文件数据
    const fileBuffer = await zipEntry.async("nodebuffer");

    // 推断 MIME 类型
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".png": "image/png", ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const mimeType = mimeMap[ext.toLowerCase()] ?? "image/jpeg";

    // 创建 asset 记录（id 由 createAsset 自动生成）
    const asset = createAsset({
      kind: "wallpaper",
      filePath: "", // 临时占位，下面更新
      mimeType,
    });

    // 写入文件（使用 asset.id 命名）
    const fileName = `${asset.id}${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, fileBuffer);

    // 更新 asset 记录的文件路径
    const db = getDb();
    db.prepare("UPDATE assets SET file_path = ? WHERE id = ?").run(filePath, asset.id);

    idMap.set(originalId, asset.id);
  }
  return idMap;
}

/**
 * 从 JSON 格式的用户数据包导入
 */
function importFromJsonData(
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
  mode: ImportMode,
  assetIdMap: Map<string, string>,
) {
  const db = getDb();

  // 获取当前数据用于去重
  const currentTags = db.prepare("SELECT id, name, slug FROM tags WHERE owner_id = ?").all(ownerId) as Array<{
    id: string; name: string; slug: string;
  }>;
  const currentSites = db.prepare("SELECT id, url FROM sites WHERE owner_id = ?").all(ownerId) as Array<{
    id: string; url: string;
  }>;
  const currentTagNames = new Set(currentTags.map((t) => t.name.toLowerCase()));
  const currentSiteUrls = new Set(currentSites.map((s) => s.url.toLowerCase()));
  const tagIdMap = new Map<string, string>();

  // 处理标签
  const processTags = db.transaction(() => {
    for (const tag of (data.tags ?? [])) {
      const nameLower = tag.name.toLowerCase();
      if (currentTagNames.has(nameLower)) {
        const existing = currentTags.find((t) => t.name.toLowerCase() === nameLower)!;
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
          isHidden: tag.isHidden, logoUrl: tag.logoUrl, logoBgColor: tag.logoBgColor,
          description: tag.description, ownerId,
        });
        tagIdMap.set(tag.id, newId);
        currentTagNames.add(nameLower);
      }
    }
  });
  processTags();

  // 处理站点
  const processSites = db.transaction(() => {
    for (const site of (data.sites ?? [])) {
      const urlLower = site.url.toLowerCase();
      if (currentSiteUrls.has(urlLower)) {
        const existing = currentSites.find((s) => s.url.toLowerCase() === urlLower)!;
        if (mode === "overwrite") {
          db.prepare(
            `UPDATE sites SET name = @name, description = @description, icon_url = @iconUrl,
             icon_bg_color = @iconBgColor, updated_at = @updatedAt WHERE id = @id`,
          ).run({
            name: site.name, description: site.description, iconUrl: site.iconUrl,
            iconBgColor: site.iconBgColor, updatedAt: new Date().toISOString(), id: existing.id,
          });
          const mappedTagIds = site.tags.map((t) => tagIdMap.get(t.id)).filter((id): id is string => id != null);
          db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(existing.id);
          mappedTagIds.forEach((tid, i) => {
            db.prepare("INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)").run(existing.id, tid, i);
          });
        }
      } else {
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
          iconUrl: site.iconUrl, iconBgColor: site.iconBgColor, isPinned: site.isPinned ? 1 : 0,
          sortOrder: orderRow.maxOrder + 1, cardType: site.cardType, cardData: site.cardData,
          ownerId, createdAt: now, updatedAt: now,
        });
        const mappedTagIds = site.tags.map((t) => tagIdMap.get(t.id)).filter((id): id is string => id != null);
        mappedTagIds.forEach((tid, i) => {
          db.prepare("INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)").run(newId, tid, i);
        });
        currentSiteUrls.add(urlLower);
      }
    }
  });
  processSites();

  // 导入外观配置（使用 assetIdMap 映射壁纸资源 ID）
  if (data.appearances) {
    for (const theme of ["light", "dark"] as const) {
      const themeData = data.appearances[theme];
      if (!themeData) continue;

      // 映射壁纸资源 ID
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
        ? (themeData.desktopCardFrosted as number)
        : ((themeData.desktopCardFrosted as boolean) ? 100 : 0);
      const mobileCardFrosted = typeof themeData.mobileCardFrosted === "number"
        ? (themeData.mobileCardFrosted as number)
        : ((themeData.mobileCardFrosted as boolean) ? 100 : 0);

      if (mode === "overwrite") {
        // 覆盖模式：先清理旧壁纸资源，再替换
        const oldRow = db.prepare(
          "SELECT desktop_wallpaper_asset_id, mobile_wallpaper_asset_id FROM theme_appearances WHERE owner_id = ? AND theme = ?"
        ).get(ownerId, theme) as {
          desktop_wallpaper_asset_id: string | null;
          mobile_wallpaper_asset_id: string | null;
        } | undefined;

        if (oldRow) {
          for (const oldAssetId of [oldRow.desktop_wallpaper_asset_id, oldRow.mobile_wallpaper_asset_id]) {
            if (!oldAssetId) continue;
            const assetRow = db.prepare("SELECT file_path FROM assets WHERE id = ?").get(oldAssetId) as { file_path: string } | undefined;
            if (assetRow?.file_path && fs.existsSync(assetRow.file_path)) {
              fs.rmSync(assetRow.file_path, { force: true });
            }
            db.prepare("DELETE FROM assets WHERE id = ?").run(oldAssetId);
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
            desktop_card_frosted = excluded.desktop_card_frosted, mobile_card_frosted = excluded.mobile_card_frosted
        `).run({
          ownerId, theme, desktopWallpaperAssetId, mobileWallpaperAssetId,
          fontPreset, fontSize, overlayOpacity, textColor,
          desktopCardFrosted, mobileCardFrosted,
        });
      } else {
        // 增量模式：不覆盖已有配置，仅当记录不存在时才插入
        const existing = db.prepare(
          "SELECT 1 FROM theme_appearances WHERE owner_id = ? AND theme = ?"
        ).get(ownerId, theme);
        if (!existing) {
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
            desktopCardFrosted, mobileCardFrosted,
          });
        }
      }
    }
  }

  // 导入应用设置
  if (data.settings) {
    if (mode === "overwrite") {
      // 覆盖模式：直接替换
      updateAppSettings({
        lightLogoAssetId: null,
        darkLogoAssetId: null,
        onlineCheckEnabled: data.settings.onlineCheckEnabled,
        onlineCheckTime: data.settings.onlineCheckTime,
      });
    } else {
      // 增量模式：仅在数据库中尚无该设置 key 时才写入
      const existingKeys = new Set(
        (db.prepare("SELECT key FROM app_settings WHERE key IN ('online_check_enabled', 'online_check_time')").all() as Array<{ key: string }>).map((r) => r.key)
      );
      const updates: Record<string, unknown> = {};
      if (!existingKeys.has("online_check_enabled") && data.settings.onlineCheckEnabled !== undefined) {
        updates.onlineCheckEnabled = data.settings.onlineCheckEnabled;
      }
      if (!existingKeys.has("online_check_time") && data.settings.onlineCheckTime !== undefined) {
        updates.onlineCheckTime = data.settings.onlineCheckTime;
      }
      if (Object.keys(updates).length > 0) {
        updateAppSettings({
          lightLogoAssetId: null,
          darkLogoAssetId: null,
          ...updates,
        });
      }
    }
  }
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
    const mode = (formData.get("mode") as ImportMode | null) ?? "incremental";

    if (!(file instanceof File)) {
      return jsonError("请先选择配置文件");
    }
    if (!["incremental", "overwrite"].includes(mode)) {
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
      // 用户数据格式（JSON）— 先导入壁纸资源文件
      const assetIdMap = await importAssetFilesAsync(zip, ownerId);
      const dataJson = JSON.parse(await zip.file("data.json")!.async("string"));
      importFromJsonData(ownerId, dataJson, mode, assetIdMap);
      logger.info("用户数据导入成功（JSON 格式）", { mode });
    } else if (manifest.signature === "__sakuranav__") {
      // 全局 SakuraNav 格式（SQLite）→ 使用合并导入，目标为当前用户
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sakura-user-import-"));
      try {
        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir) continue;
          const basename = path.basename(relativePath);
          if (basename === "manifest.json" || basename === "config.yml" || basename === "config.yaml") continue;
          let targetRelative = relativePath;
          if (relativePath.startsWith("storage/")) {
            targetRelative = relativePath.slice("storage/".length);
            if (!targetRelative) continue;
          }
          const targetPath = path.join(tempDir, targetRelative);
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          const fileBuffer = await zipEntry.async("nodebuffer");
          fs.writeFileSync(targetPath, fileBuffer);
        }
        mergeImportFromZip(tempDir, mode as "incremental" | "overwrite", ownerId);
        logger.info("用户数据导入成功（SQLite 格式）", { mode });
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
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
