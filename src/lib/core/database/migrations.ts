/**
 * @description 数据库迁移 - 处理数据库结构变更和数据迁移
 */

import type Database from "better-sqlite3";

/**
 * 检查表中是否存在指定列
 * @param db 数据库实例
 * @param tableName 表名
 * @param columnName 列名
 * @returns 是否存在该列
 */
function hasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  return columns.some((column) => column.name === columnName);
}

export function runMigrations(db: Database.Database): void {
  if (!hasColumn(db, "tags", "logo_url")) {
    db.exec("ALTER TABLE tags ADD COLUMN logo_url TEXT");
  }

  if (!hasColumn(db, "theme_appearances", "desktop_wallpaper_asset_id")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN desktop_wallpaper_asset_id TEXT");
  }

  if (!hasColumn(db, "theme_appearances", "mobile_wallpaper_asset_id")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN mobile_wallpaper_asset_id TEXT");
  }

  if (!hasColumn(db, "theme_appearances", "font_size")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN font_size REAL NOT NULL DEFAULT 16");
  }

  if (!hasColumn(db, "sites", "is_pinned")) {
    db.exec("ALTER TABLE sites ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0");
  }

  if (!hasColumn(db, "theme_appearances", "logo_asset_id")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN logo_asset_id TEXT");
  }

  if (!hasColumn(db, "theme_appearances", "favicon_asset_id")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN favicon_asset_id TEXT");
  }

  if (!hasColumn(db, "theme_appearances", "card_frosted")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN card_frosted INTEGER NOT NULL DEFAULT 0");
  }

  if (!hasColumn(db, "theme_appearances", "desktop_card_frosted")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN desktop_card_frosted INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE theme_appearances SET desktop_card_frosted = card_frosted");
  }

  if (!hasColumn(db, "theme_appearances", "mobile_card_frosted")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN mobile_card_frosted INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE theme_appearances SET mobile_card_frosted = card_frosted");
  }

  if (!hasColumn(db, "theme_appearances", "is_default")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE theme_appearances SET is_default = 1 WHERE theme = 'dark'");
  }

  if (!hasColumn(db, "sites", "icon_bg_color")) {
    db.exec("ALTER TABLE sites ADD COLUMN icon_bg_color TEXT");
  }

  if (!hasColumn(db, "tags", "logo_bg_color")) {
    db.exec("ALTER TABLE tags ADD COLUMN logo_bg_color TEXT");
  }

  if (!hasColumn(db, "tags", "description")) {
    db.exec("ALTER TABLE tags ADD COLUMN description TEXT");
  }

  // 迁移：移除 sites.description 的 NOT NULL 约束（允许无描述创建网站）
  {
    const cols = db.pragma("table_info(sites)") as Array<{ name: string; notnull: number }>;
    const descCol = cols.find((c) => c.name === "description");
    if (descCol && descCol.notnull === 1) {
      // 清理上次失败的残余表
      db.exec("DROP TABLE IF EXISTS sites_new");
      db.exec(`
        CREATE TABLE sites_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          description TEXT,
          icon_url TEXT,
          icon_bg_color TEXT,
          is_pinned INTEGER NOT NULL DEFAULT 0,
          global_sort_order INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO sites_new SELECT id, name, url, description, icon_url, icon_bg_color, is_pinned, global_sort_order, created_at, COALESCE(updated_at, created_at, datetime('now')) FROM sites;
        DROP TABLE sites;
        ALTER TABLE sites_new RENAME TO sites;
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS site_tags (
          site_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          sort_order INTEGER NOT NULL,
          PRIMARY KEY (site_id, tag_id),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
      `);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  db.exec(`
    UPDATE theme_appearances
    SET desktop_wallpaper_asset_id = COALESCE(desktop_wallpaper_asset_id, wallpaper_asset_id),
        mobile_wallpaper_asset_id = COALESCE(mobile_wallpaper_asset_id, wallpaper_asset_id)
    WHERE wallpaper_asset_id IS NOT NULL
  `);

  const defaultCount = db
    .prepare("SELECT COUNT(*) as count FROM theme_appearances WHERE is_default = 1")
    .get() as { count: number };
  if (defaultCount.count === 0) {
    db.exec("UPDATE theme_appearances SET is_default = 1 WHERE theme = 'dark'");
  }
}
