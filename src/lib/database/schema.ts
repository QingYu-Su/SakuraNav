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
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      nickname TEXT,
      avatar_asset_id TEXT,
      avatar_color TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      logo_url TEXT,
      logo_bg_color TEXT,
      description TEXT,
      owner_id TEXT NOT NULL DEFAULT '__admin__'
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      icon_url TEXT,
      icon_bg_color TEXT,
      is_online INTEGER,
      skip_online_check INTEGER NOT NULL DEFAULT 0,
      online_check_frequency TEXT NOT NULL DEFAULT '1d',
      online_check_timeout INTEGER NOT NULL DEFAULT 3,
      online_check_match_mode TEXT NOT NULL DEFAULT 'status',
      online_check_keyword TEXT NOT NULL DEFAULT '',
      online_check_fail_threshold INTEGER NOT NULL DEFAULT 3,
      online_check_last_run TEXT,
      online_check_fail_count INTEGER NOT NULL DEFAULT 0,
      access_rules TEXT,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      global_sort_order INTEGER NOT NULL,
      card_type TEXT,
      card_data TEXT,
      owner_id TEXT NOT NULL DEFAULT '__admin__',
      recommend_context TEXT NOT NULL DEFAULT '',
      ai_relation_enabled INTEGER NOT NULL DEFAULT 1,
      allow_linked_by_others INTEGER NOT NULL DEFAULT 1,
      related_sites_enabled INTEGER NOT NULL DEFAULT 1,
      recommend_context_enabled INTEGER NOT NULL DEFAULT 1,
      recommend_context_auto_gen INTEGER NOT NULL DEFAULT 1,
      pending_ai_analysis INTEGER NOT NULL DEFAULT 0,
      pending_context_gen INTEGER NOT NULL DEFAULT 0,
      search_text TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      notes_ai_enabled INTEGER NOT NULL DEFAULT 1,
      todos TEXT NOT NULL DEFAULT '[]',
      todos_ai_enabled INTEGER NOT NULL DEFAULT 1,
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
      original_name TEXT,
      note_id TEXT,
      file_size INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS theme_appearances (
      owner_id TEXT NOT NULL DEFAULT '__admin__',
      theme TEXT NOT NULL,
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
      PRIMARY KEY (owner_id, theme),
      FOREIGN KEY (wallpaper_asset_id) REFERENCES assets(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      card_type TEXT NOT NULL,
      label TEXT NOT NULL,
      icon_url TEXT,
      icon_bg_color TEXT,
      payload TEXT NOT NULL,
      global_sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      profile_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(provider, provider_account_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 网站关联推荐关系表
    CREATE TABLE IF NOT EXISTS site_relations (
      id TEXT PRIMARY KEY,
      source_site_id TEXT NOT NULL,
      target_site_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      is_locked INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(source_site_id, target_site_id),
      FOREIGN KEY (source_site_id) REFERENCES sites(id) ON DELETE CASCADE,
      FOREIGN KEY (target_site_id) REFERENCES sites(id) ON DELETE CASCADE
    );

    -- AI 关联分析队列
    CREATE TABLE IF NOT EXISTS ai_relation_queue (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL UNIQUE,
      priority INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    );

    -- 性能优化索引
    CREATE INDEX IF NOT EXISTS idx_sites_owner_id ON sites(owner_id);
    CREATE INDEX IF NOT EXISTS idx_site_tags_tag_id ON site_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_site_relations_source ON site_relations(source_site_id);
    CREATE INDEX IF NOT EXISTS idx_sites_search_text ON sites(search_text);
  `);
}
