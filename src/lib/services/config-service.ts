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

  // 清理旧的资源文件
  for (const asset of oldAssets) {
    if (fs.existsSync(asset.filePath)) {
      fs.rmSync(asset.filePath, { force: true });
    }
  }
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

/**
 * 从 ZIP 解压目录中合并导入数据到当前数据库
 * @param tempDir 解压后的临时目录路径
 * @param mode 导入模式：incremental（增量）或 overwrite（覆盖）
 */
export function mergeImportFromZip(tempDir: string, mode: "incremental" | "overwrite") {
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

    // 获取当前数据用于比较
    const currentTags = db.prepare("SELECT id, name, slug FROM tags").all() as Array<{
      id: string;
      name: string;
      slug: string;
    }>;
    const currentSites = db.prepare("SELECT id, url FROM sites").all() as Array<{
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
            .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM tags")
            .get() as { maxOrder: number };

          db.prepare(
            `INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description)
             VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl, @logoBgColor, @description)`,
          ).run({
            id: newId,
            name: tag.name,
            slug: tag.slug,
            sortOrder: orderRow.maxOrder + 1,
            isHidden: tag.is_hidden,
            logoUrl: tag.logo_url,
            logoBgColor: tag.logo_bg_color,
            description: tag.description,
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
            .prepare("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM sites")
            .get() as { maxOrder: number };

          db.prepare(
            `INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, is_online,
             skip_online_check, is_pinned, global_sort_order, card_type, card_data, created_at, updated_at)
             VALUES (@id, @name, @url, @description, @iconUrl, @iconBgColor, @isOnline,
             @skipOnlineCheck, @isPinned, @sortOrder, @cardType, @cardData, @createdAt, @updatedAt)`,
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
  } finally {
    importedDb.close();
  }
}
