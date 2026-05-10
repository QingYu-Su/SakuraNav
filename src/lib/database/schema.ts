/**
 * @description 数据库模式 - 定义数据库表结构和索引
 * 支持多数据库方言：SQLite / MySQL / PostgreSQL
 */

import type { DatabaseAdapter } from "./adapter";

/**
 * 初始化数据库表结构
 * @param adapter 数据库适配器实例
 */
export async function initializeSchema(adapter: DatabaseAdapter): Promise<void> {
  await adapter.exec(`
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

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      site_url TEXT NOT NULL,
      site_description TEXT,
      icon_url TEXT,
      icon_bg_color TEXT,
      site_is_online INTEGER,
      site_skip_online_check INTEGER NOT NULL DEFAULT 0,
      site_online_check_frequency TEXT NOT NULL DEFAULT '1d',
      site_online_check_timeout INTEGER NOT NULL DEFAULT 3,
      site_online_check_match_mode TEXT NOT NULL DEFAULT 'status',
      site_online_check_keyword TEXT NOT NULL DEFAULT '',
      site_online_check_fail_threshold INTEGER NOT NULL DEFAULT 3,
      site_online_check_last_run TEXT,
      site_online_check_fail_count INTEGER NOT NULL DEFAULT 0,
      site_offline_notify INTEGER NOT NULL DEFAULT 1,
      site_access_rules TEXT,
      site_is_pinned INTEGER NOT NULL DEFAULT 0,
      global_sort_order INTEGER NOT NULL,
      card_type TEXT,
      card_data TEXT,
      owner_id TEXT NOT NULL DEFAULT '__admin__',
      site_recommend_context TEXT NOT NULL DEFAULT '',
      site_ai_relation_enabled INTEGER NOT NULL DEFAULT 1,
      site_allow_linked_by_others INTEGER NOT NULL DEFAULT 1,
      site_related_sites_enabled INTEGER NOT NULL DEFAULT 1,
      site_recommend_context_enabled INTEGER NOT NULL DEFAULT 1,
      site_recommend_context_auto_gen INTEGER NOT NULL DEFAULT 1,
      site_pending_ai_analysis INTEGER NOT NULL DEFAULT 0,
      site_pending_context_gen INTEGER NOT NULL DEFAULT 0,
      search_text TEXT NOT NULL DEFAULT '',
      site_notes TEXT NOT NULL DEFAULT '',
      site_notes_ai_enabled INTEGER NOT NULL DEFAULT 1,
      site_todos TEXT NOT NULL DEFAULT '[]',
      site_todos_ai_enabled INTEGER NOT NULL DEFAULT 1,
      social_hint TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS card_tags (
      card_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (card_id, tag_id),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
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

    CREATE TABLE IF NOT EXISTS card_relations (
      id TEXT PRIMARY KEY,
      source_card_id TEXT NOT NULL,
      target_card_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      is_locked INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual',
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(source_card_id, target_card_id),
      FOREIGN KEY (source_card_id) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (target_card_id) REFERENCES cards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_relation_queue (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL UNIQUE,
      priority INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      label TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

  CREATE INDEX IF NOT EXISTS idx_cards_owner_id ON cards(owner_id);
  CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON card_tags(tag_id);
  CREATE INDEX IF NOT EXISTS idx_card_relations_source ON card_relations(source_card_id);
  CREATE INDEX IF NOT EXISTS idx_cards_search_text ON cards(search_text);
  CREATE INDEX IF NOT EXISTS idx_snapshots_owner ON snapshots(owner_id);
  CREATE INDEX IF NOT EXISTS idx_snapshots_created ON snapshots(created_at);

  CREATE TABLE IF NOT EXISTS notification_channels (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'webhook',
    url TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'POST',
    content_type TEXT NOT NULL DEFAULT 'application/json',
    title_param TEXT NOT NULL,
    content_param TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

    CREATE TABLE IF NOT EXISTS url_online_cache (
    url TEXT PRIMARY KEY,
    is_online INTEGER NOT NULL,
    last_checked_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_suffix TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT,
    last_used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);
  `);
}
