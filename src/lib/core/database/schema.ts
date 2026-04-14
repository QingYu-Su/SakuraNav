/**
 * @description 数据库模式 - 定义数据库表结构和索引
 */

import type Database from "better-sqlite3";

/**
 * 初始化数据库表结构
 * @param db 数据库实例
 */
export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      logo_url TEXT,
      logo_bg_color TEXT
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT NOT NULL,
      icon_url TEXT,
      icon_bg_color TEXT,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      global_sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_tags (
      site_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (site_id, tag_id),
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS theme_appearances (
      theme TEXT PRIMARY KEY,
      wallpaper_asset_id TEXT,
      desktop_wallpaper_asset_id TEXT,
      mobile_wallpaper_asset_id TEXT,
      font_preset TEXT NOT NULL,
      font_size REAL NOT NULL DEFAULT 16,
      overlay_opacity REAL NOT NULL,
      text_color TEXT NOT NULL,
      logo_asset_id TEXT,
      favicon_asset_id TEXT,
      card_frosted INTEGER NOT NULL DEFAULT 0,
      desktop_card_frosted INTEGER NOT NULL DEFAULT 0,
      mobile_card_frosted INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (wallpaper_asset_id) REFERENCES assets(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}
