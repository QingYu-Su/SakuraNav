/**
 * @description 配置服务 - 处理配置重置和导入合并功能
 */

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getDb } from "@/lib/database";
import { seedDatabase } from "@/lib/database/seed";
import { listStoredAssets } from "./asset-repository";

/**
 * 重置所有内容到默认值
 * @description 删除所有数据表内容、填充默认种子数据、清理旧资源文件
 */
export function resetContentToDefaults() {
  const db = getDb();

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

  // 清理旧的资源文件（已按用户目录划分，删除所有子目录）
  cleanUploadsDir();
}

/**
 * 清空 uploads 目录下所有用户子目录和文件
 */
function cleanUploadsDir() {
  const uploadsDir = path.join(process.env.PROJECT_ROOT ?? process.cwd(), "storage", "uploads");
  if (!fs.existsSync(uploadsDir)) return;
  for (const entry of fs.readdirSync(uploadsDir, { withFileTypes: true })) {
    const full = path.join(uploadsDir, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      fs.unlinkSync(full);
    }
  }
}

/**
 * 清空指定用户的 uploads 子目录
 */
function cleanUserUploadsDir(ownerId: string) {
  const userDir = path.join(process.env.PROJECT_ROOT ?? process.cwd(), "storage", "uploads", ownerId);
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true, force: true });
  }
}

/**
 * 清理壁纸资源：删除 asset 记录和物理文件
 * @param db 数据库实例
 * @param assetIds 需要清理的 asset ID 列表（忽略 null）
 */
function cleanupWallpaperAssets(db: ReturnType<typeof getDb>, assetIds: Array<string | null>) {
  for (const assetId of assetIds) {
    if (!assetId) continue;
    const row = db.prepare("SELECT file_path FROM assets WHERE id = ?").get(assetId) as { file_path: string } | undefined;
    if (row?.file_path && fs.existsSync(row.file_path)) {
      fs.rmSync(row.file_path, { force: true });
    }
    db.prepare("DELETE FROM assets WHERE id = ?").run(assetId);
  }
}

/**
 * 重置指定用户的数据到默认值
 * @param ownerId 用户 ID（管理员为 '__admin__'）
 * @description 删除该用户的所有标签、站点、外观配置和资源文件，不影响其他用户和全局设置
 */
export function resetUserData(ownerId: string) {
  const db = getDb();

  // 收集该用户的资源文件
  const userAssets = listStoredAssets().filter((a) => {
    // 通过文件路径判断所属用户（路径中包含 /uploads/<ownerId>/）
    return a.filePath.includes(`${path.sep}uploads${path.sep}${ownerId}${path.sep}`);
  });

  const transaction = db.transaction(() => {
    // 获取用户的站点 ID 列表以清理 site_tags
    const siteIds = db.prepare("SELECT id FROM sites WHERE owner_id = ?").all(ownerId) as Array<{ id: string }>;
    const siteIdList = siteIds.map((s) => s.id);

    // 清理站点-标签关联
    if (siteIdList.length > 0) {
      const placeholders = siteIdList.map(() => "?").join(",");
      db.prepare(`DELETE FROM site_tags WHERE site_id IN (${placeholders})`).run(...siteIdList);
    }

    // 删除用户的资源记录
    for (const asset of userAssets) {
      db.prepare("DELETE FROM assets WHERE id = ?").run(asset.id);
    }

    // 删除用户数据
    db.prepare("DELETE FROM sites WHERE owner_id = ?").run(ownerId);
    db.prepare("DELETE FROM tags WHERE owner_id = ?").run(ownerId);
    db.prepare("DELETE FROM theme_appearances WHERE owner_id = ?").run(ownerId);
  });
  transaction();

  // 清理用户的资源文件
  for (const asset of userAssets) {
    if (fs.existsSync(asset.filePath)) {
      fs.rmSync(asset.filePath, { force: true });
    }
  }

  // 清理用户的 uploads 子目录
  cleanUserUploadsDir(ownerId);
}

/**
 * 重置管理员数据到初始种子状态
 * @description 删除所有用户数据、全局设置和资源文件，然后重新填充种子数据
 */
export function resetAdminToSeedState() {
  const db = getDb();

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM theme_appearances").run();
    db.prepare("DELETE FROM app_settings").run();
    db.prepare("DELETE FROM site_tags").run();
    db.prepare("DELETE FROM sites").run();
    db.prepare("DELETE FROM tags").run();
    db.prepare("DELETE FROM assets").run();
  });
  transaction();

  // 重新填充种子数据
  seedDatabase(db);

  // 清理所有用户的资源文件（管理员重置影响全局）
  cleanUploadsDir();
}

/** 导入数据库中的标签行 */
type ImportedTagRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_hidden: number;
  logo_url: string | null;
  logo_bg_color: string | null;
  description: string | null;
};

/** 导入数据库中的站点行 */
type ImportedSiteRow = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  icon_url: string | null;
  icon_bg_color: string | null;
  is_online: number | null;
  skip_online_check: number;
  is_pinned: number;
  global_sort_order: number;
  card_type: string | null;
  card_data: string | null;
  created_at: string;
  updated_at: string;
};

/** 导入数据库中的站点-标签关联行 */
type ImportedSiteTagRow = {
  site_id: string;
  tag_id: string;
  sort_order: number;
};

/** 导入数据库中的外观配置行 */
type ImportedAppearanceRow = {
  owner_id: string;
  theme: string;
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

/**
 * 从 ZIP 解压目录中合并导入数据到当前数据库
 * @param tempDir 解压后的临时目录路径
 * @param mode 导入模式：incremental（增量）或 overwrite（覆盖）
 */
export function mergeImportFromZip(tempDir: string, mode: "incremental" | "overwrite", targetOwnerId?: string) {
  const db = getDb();

  // 定位导入的数据库文件
  const dbPath = path.join(tempDir, "database", "sakuranav.sqlite");
  if (!fs.existsSync(dbPath)) {
    throw new Error("导入文件中未找到有效的数据库");
  }

  // 以只读模式打开导入的数据库
  const importedDb = new Database(dbPath, { readonly: true });

  try {
    const importedTags = importedDb
      .prepare("SELECT * FROM tags ORDER BY sort_order ASC")
      .all() as ImportedTagRow[];
    const importedSites = importedDb
      .prepare("SELECT * FROM sites ORDER BY global_sort_order ASC")
      .all() as ImportedSiteRow[];
    const importedSiteTags = importedDb
      .prepare("SELECT * FROM site_tags")
      .all() as ImportedSiteTagRow[];

    // 获取当前数据用于比较（按 owner 过滤）
    const tagFilter = targetOwnerId ? " WHERE owner_id = ?" : "";
    const siteFilter = targetOwnerId ? " WHERE owner_id = ?" : "";
    const currentTags = db.prepare(`SELECT id, name, slug FROM tags${tagFilter}`).all(...(targetOwnerId ? [targetOwnerId] : [])) as Array<{
      id: string;
      name: string;
      slug: string;
    }>;
    const currentSites = db.prepare(`SELECT id, url FROM sites${siteFilter}`).all(...(targetOwnerId ? [targetOwnerId] : [])) as Array<{
      id: string;
      url: string;
    }>;
    const currentTagNames = new Set(currentTags.map((t) => t.name.toLowerCase()));
    const currentSiteUrls = new Set(currentSites.map((s) => s.url.toLowerCase()));

    // 标签 ID 映射（导入 ID → 当前 DB 的 ID，可能不同）
    const tagIdMap = new Map<string, string>();

    // 处理标签
    const processTags = db.transaction(() => {
      for (const tag of importedTags) {
        const nameLower = tag.name.toLowerCase();

        if (currentTagNames.has(nameLower)) {
          // 标签已存在
          const existing = currentTags.find((t) => t.name.toLowerCase() === nameLower)!;
          tagIdMap.set(tag.id, existing.id);

          if (mode === "overwrite") {
            // 覆盖模式：更新标签属性（保留现有 ID）
            db.prepare(
              `UPDATE tags SET name = @name, logo_url = @logoUrl, logo_bg_color = @logoBgColor, description = @description WHERE id = @id`,
            ).run({
              name: tag.name,
              logoUrl: tag.logo_url,
              logoBgColor: tag.logo_bg_color,
              description: tag.description,
              id: existing.id,
            });
          }
        } else {
          // 新标签：创建
          const newId = `tag-${crypto.randomUUID()}`;
          const orderRow = db
            .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM tags" + (targetOwnerId ? " WHERE owner_id = ?" : ""))
            .get(...(targetOwnerId ? [targetOwnerId] : [])) as { maxOrder: number };

          const tagOwnerId = targetOwnerId ?? "__admin__";
          db.prepare(
            `INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, owner_id)
             VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl, @logoBgColor, @description, @ownerId)`,
          ).run({
            id: newId,
            name: tag.name,
            slug: tag.slug,
            sortOrder: orderRow.maxOrder + 1,
            isHidden: tag.is_hidden,
            logoUrl: tag.logo_url,
            logoBgColor: tag.logo_bg_color,
            description: tag.description,
            ownerId: tagOwnerId,
          });

          tagIdMap.set(tag.id, newId);
          currentTagNames.add(nameLower);
        }
      }
    });

    processTags();

    // 处理站点
    const processSites = db.transaction(() => {
      for (const site of importedSites) {
        const urlLower = site.url.toLowerCase();

        if (currentSiteUrls.has(urlLower)) {
          // 站点已存在
          const existing = currentSites.find((s) => s.url.toLowerCase() === urlLower)!;

          if (mode === "overwrite") {
            // 覆盖模式：更新站点属性
            db.prepare(
              `UPDATE sites SET name = @name, description = @description, icon_url = @iconUrl,
               icon_bg_color = @iconBgColor, skip_online_check = @skipOnlineCheck, updated_at = @updatedAt
               WHERE id = @id`,
            ).run({
              name: site.name,
              description: site.description,
              iconUrl: site.icon_url,
              iconBgColor: site.icon_bg_color,
              skipOnlineCheck: site.skip_online_check,
              updatedAt: new Date().toISOString(),
              id: existing.id,
            });

            // 更新站点-标签关联
            const siteTagEntries = importedSiteTags.filter((st) => st.site_id === site.id);
            const mappedTagIds = siteTagEntries
              .map((st) => tagIdMap.get(st.tag_id))
              .filter((id): id is string => id != null);

            // 清除旧关联，写入新关联
            db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(existing.id);
            for (let i = 0; i < mappedTagIds.length; i++) {
              db.prepare(
                "INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)",
              ).run(existing.id, mappedTagIds[i], i);
            }
          }
          // 增量模式下已存在的站点跳过
        } else {
          // 新站点：创建
          const newId = `site-${crypto.randomUUID()}`;
          const orderRow = db
            .prepare("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM sites" + (targetOwnerId ? " WHERE owner_id = ?" : ""))
            .get(...(targetOwnerId ? [targetOwnerId] : [])) as { maxOrder: number };

          const siteOwnerId = targetOwnerId ?? "__admin__";
          db.prepare(
            `INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, is_online,
             skip_online_check, is_pinned, global_sort_order, card_type, card_data, owner_id, created_at, updated_at)
             VALUES (@id, @name, @url, @description, @iconUrl, @iconBgColor, @isOnline,
             @skipOnlineCheck, @isPinned, @sortOrder, @cardType, @cardData, @ownerId, @createdAt, @updatedAt)`,
          ).run({
            id: newId,
            name: site.name,
            url: site.url,
            description: site.description,
            iconUrl: site.icon_url,
            iconBgColor: site.icon_bg_color,
            isOnline: site.is_online,
            skipOnlineCheck: site.skip_online_check,
            isPinned: site.is_pinned,
            sortOrder: orderRow.maxOrder + 1,
            cardType: site.card_type,
            cardData: site.card_data,
            ownerId: siteOwnerId,
            createdAt: site.created_at,
            updatedAt: new Date().toISOString(),
          });

          // 写入站点-标签关联
          const siteTagEntries = importedSiteTags.filter((st) => st.site_id === site.id);
          const mappedTagIds = siteTagEntries
            .map((st) => tagIdMap.get(st.tag_id))
            .filter((id): id is string => id != null);

          for (let i = 0; i < mappedTagIds.length; i++) {
            db.prepare(
              "INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)",
            ).run(newId, mappedTagIds[i], i);
          }

          currentSiteUrls.add(urlLower);
        }
      }
    });

    processSites();

    // ── 导入外观配置（theme_appearances） ──
    const importedAppearances = importedDb
      .prepare("SELECT * FROM theme_appearances ORDER BY theme ASC")
      .all() as ImportedAppearanceRow[];

    const targetAppearanceOwner = targetOwnerId ?? "__admin__";

    for (const appearance of importedAppearances) {
      if (mode === "overwrite") {
        // ── 覆盖模式：先清理旧壁纸资源文件，再替换外观配置 ──
        const oldRow = db.prepare(
          "SELECT desktop_wallpaper_asset_id, mobile_wallpaper_asset_id FROM theme_appearances WHERE owner_id = ? AND theme = ?"
        ).get(targetAppearanceOwner, appearance.theme) as {
          desktop_wallpaper_asset_id: string | null;
          mobile_wallpaper_asset_id: string | null;
        } | undefined;

        if (oldRow) {
          cleanupWallpaperAssets(db, [
            oldRow.desktop_wallpaper_asset_id,
            oldRow.mobile_wallpaper_asset_id,
          ]);
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
          ownerId: targetAppearanceOwner,
          theme: appearance.theme,
          desktopWallpaperAssetId: appearance.desktop_wallpaper_asset_id,
          mobileWallpaperAssetId: appearance.mobile_wallpaper_asset_id,
          fontPreset: appearance.font_preset,
          fontSize: appearance.font_size,
          overlayOpacity: appearance.overlay_opacity,
          textColor: appearance.text_color,
          desktopCardFrosted: appearance.desktop_card_frosted,
          mobileCardFrosted: appearance.mobile_card_frosted,
        });
      } else {
        // ── 增量模式：仅当该主题不存在记录时才插入，不覆盖已有配置 ──
        const existing = db.prepare(
          "SELECT 1 FROM theme_appearances WHERE owner_id = ? AND theme = ?"
        ).get(targetAppearanceOwner, appearance.theme);
        if (!existing) {
          db.prepare(`
            INSERT INTO theme_appearances (owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id,
              mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color,
              logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default)
            VALUES (@ownerId, @theme, NULL, @desktopWallpaperAssetId, @mobileWallpaperAssetId,
              @fontPreset, @fontSize, @overlayOpacity, @textColor,
              NULL, NULL, 0, @desktopCardFrosted, @mobileCardFrosted, 0)
          `).run({
            ownerId: targetAppearanceOwner,
            theme: appearance.theme,
            desktopWallpaperAssetId: appearance.desktop_wallpaper_asset_id,
            mobileWallpaperAssetId: appearance.mobile_wallpaper_asset_id,
            fontPreset: appearance.font_preset,
            fontSize: appearance.font_size,
            overlayOpacity: appearance.overlay_opacity,
            textColor: appearance.text_color,
            desktopCardFrosted: appearance.desktop_card_frosted,
            mobileCardFrosted: appearance.mobile_card_frosted,
          });
        }
      }
    }

    // ── 导入应用设置（app_settings） ──
    // 仅导入用户可见的设置（在线检测等），保留系统级设置（admin_avatar_asset_id 等）
    const importedSettings = importedDb
      .prepare("SELECT key, value FROM app_settings WHERE key IN ('online_check_enabled', 'online_check_time')")
      .all() as Array<{ key: string; value: string }>;

    for (const setting of importedSettings) {
      if (mode === "overwrite") {
        // 覆盖模式：直接替换
        db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(setting.key, setting.value);
      } else {
        // 增量模式：仅在不存在时插入，不覆盖已有设置
        const existing = db.prepare("SELECT 1 FROM app_settings WHERE key = ?").get(setting.key);
        if (!existing) {
          db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run(setting.key, setting.value);
        }
      }
    }
  } finally {
    importedDb.close();
  }
}
