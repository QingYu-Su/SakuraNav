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

function hasTable(db: Database.Database, tableName: string): boolean {
  const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
  return !!result;
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

  if (!hasColumn(db, "sites", "is_online")) {
    db.exec("ALTER TABLE sites ADD COLUMN is_online INTEGER");
  }

  if (!hasColumn(db, "tags", "logo_bg_color")) {
    db.exec("ALTER TABLE tags ADD COLUMN logo_bg_color TEXT");
  }

  if (!hasColumn(db, "tags", "description")) {
    db.exec("ALTER TABLE tags ADD COLUMN description TEXT");
  }

  if (!hasColumn(db, "sites", "skip_online_check")) {
    db.exec("ALTER TABLE sites ADD COLUMN skip_online_check INTEGER NOT NULL DEFAULT 0");
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

  // 迁移：创建 cards 表（社交卡片）
  db.exec(`
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
  `);

  // 迁移：sites 表新增 card_type 和 card_data 列，并将 cards 数据迁移到 sites
  if (!hasColumn(db, "sites", "card_type")) {
    db.exec("ALTER TABLE sites ADD COLUMN card_type TEXT");
    db.exec("ALTER TABLE sites ADD COLUMN card_data TEXT");

    // 将 cards 表中的数据迁移到 sites 表
    const cards = db.prepare("SELECT * FROM cards").all() as Array<{
      id: string;
      card_type: string;
      label: string;
      icon_url: string | null;
      icon_bg_color: string | null;
      payload: string;
      global_sort_order: number;
      created_at: string;
      updated_at: string;
    }>;

    const insertCardAsSite = db.prepare(`
      INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, skip_online_check, is_pinned, global_sort_order, card_type, card_data, created_at, updated_at)
      VALUES (@id, @name, '#', NULL, @iconUrl, @iconBgColor, 1, 0, @globalSortOrder, @cardType, @cardData, @createdAt, @updatedAt)
    `);

    const transaction = db.transaction(() => {
      for (const card of cards) {
        insertCardAsSite.run({
          id: card.id,
          name: card.label,
          iconUrl: card.icon_url,
          iconBgColor: card.icon_bg_color,
          globalSortOrder: card.global_sort_order,
          cardType: card.card_type,
          cardData: card.payload,
          createdAt: card.created_at,
          updatedAt: card.updated_at,
        });
      }
    });
    transaction();

    // 迁移完成后清空 cards 表（保留表结构以防降级）
    db.exec("DELETE FROM cards");
  }

  // ── 多用户迁移：创建 users 表，为 tags/sites 添加 owner_id ──
  if (!hasTable(db, "users")) {
    // 1. 创建 users 表
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL
      )
    `);

    // 2. sites 表添加 owner_id
    if (!hasColumn(db, "sites", "owner_id")) {
      db.exec("ALTER TABLE sites ADD COLUMN owner_id TEXT NOT NULL DEFAULT '__admin__'");
    }

    // 3. tags 表需要重建以移除 slug UNIQUE 约束并添加 owner_id
    if (!hasColumn(db, "tags", "owner_id")) {
      // 先备份 site_tags 数据
      db.exec("CREATE TABLE site_tags_backup AS SELECT * FROM site_tags");
      db.exec("DROP TABLE site_tags");

      // 重建 tags 表
      db.exec(`
        CREATE TABLE tags_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL,
          sort_order INTEGER NOT NULL,
          is_hidden INTEGER NOT NULL DEFAULT 0,
          logo_url TEXT,
          logo_bg_color TEXT,
          description TEXT,
          owner_id TEXT NOT NULL DEFAULT '__admin__'
        )
      `);
      db.exec(`
        INSERT INTO tags_new (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, owner_id)
        SELECT id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, '__admin__'
        FROM tags
      `);
      db.exec("DROP TABLE tags");
      db.exec("ALTER TABLE tags_new RENAME TO tags");

      // 重建 site_tags 并恢复数据
      db.exec(`
        CREATE TABLE site_tags (
          site_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          sort_order INTEGER NOT NULL,
          PRIMARY KEY (site_id, tag_id),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
      `);
      db.exec(`
        INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order)
        SELECT site_id, tag_id, sort_order FROM site_tags_backup
      `);
      db.exec("DROP TABLE site_tags_backup");
    }

    // 4. 添加注册开关到 app_settings
    db.exec(`
      INSERT OR IGNORE INTO app_settings (key, value) VALUES ('registration_enabled', 'true')
    `);
  }

  // ── 外观表多用户迁移：添加 owner_id，主键改为 (owner_id, theme) ──
  if (!hasColumn(db, "theme_appearances", "owner_id")) {
    // 重建表以支持按用户存储外观设置
    db.exec("DROP TABLE IF EXISTS theme_appearances_v2");
    db.exec(`
      CREATE TABLE theme_appearances_v2 (
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
      )
    `);
    db.exec(`
      INSERT INTO theme_appearances_v2 (owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id,
        mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color,
        logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default)
      SELECT '__admin__', theme, wallpaper_asset_id, desktop_wallpaper_asset_id,
        mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color,
        logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      FROM theme_appearances
    `);
    db.exec("DROP TABLE theme_appearances");
    db.exec("ALTER TABLE theme_appearances_v2 RENAME TO theme_appearances");
  }

  // ── 用户资料迁移：添加 nickname 和 avatar_asset_id 列 ──
  if (hasTable(db, "users")) {
    if (!hasColumn(db, "users", "nickname")) {
      db.exec("ALTER TABLE users ADD COLUMN nickname TEXT");
    }
    if (!hasColumn(db, "users", "avatar_asset_id")) {
      db.exec("ALTER TABLE users ADD COLUMN avatar_asset_id TEXT");
    }
    if (!hasColumn(db, "users", "avatar_color")) {
      db.exec("ALTER TABLE users ADD COLUMN avatar_color TEXT");
    }
  }

  // ── 磨砂效果迁移：boolean (0/1) → 数值 (0-100) ──
  // 旧值 1 → 100（最大磨砂），旧值 0 → 0（完全透明）
  // 使用 app_settings 标记避免重复迁移
  {
    const marker = db.prepare("SELECT value FROM app_settings WHERE key = 'frosted_migrated_v2'").get() as { value: string } | undefined;
    if (!marker) {
      db.exec(`
        UPDATE theme_appearances SET
          desktop_card_frosted = CASE WHEN desktop_card_frosted > 0 THEN 100 ELSE 0 END,
          mobile_card_frosted = CASE WHEN mobile_card_frosted > 0 THEN 100 ELSE 0 END
      `);
      db.exec(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('frosted_migrated_v2', '1')`);
    }
  }

  // ── OAuth 迁移：创建 oauth_accounts 表 ──
  if (!hasTable(db, "oauth_accounts")) {
    db.exec(`
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
      )
    `);
  }

  // ── 用户表 OAuth 相关字段：username_changed / has_password ──
  if (hasTable(db, "users")) {
    if (!hasColumn(db, "users", "username_changed")) {
      db.exec("ALTER TABLE users ADD COLUMN username_changed INTEGER NOT NULL DEFAULT 0");
    }
    if (!hasColumn(db, "users", "has_password")) {
      // 已有用户默认有密码
      db.exec("ALTER TABLE users ADD COLUMN has_password INTEGER NOT NULL DEFAULT 1");
    }
  }

  // ── 每站点独立在线检测：添加频率和上次检测时间列 ──
  if (!hasColumn(db, "sites", "online_check_frequency")) {
    db.exec("ALTER TABLE sites ADD COLUMN online_check_frequency TEXT NOT NULL DEFAULT '1d'");
  }
  if (!hasColumn(db, "sites", "online_check_last_run")) {
    db.exec("ALTER TABLE sites ADD COLUMN online_check_last_run TEXT");
  }

  // ── 在线检测高级配置：超时、判定模式、关键词、失败阈值、连续失败计数 ──
  if (!hasColumn(db, "sites", "online_check_timeout")) {
    db.exec("ALTER TABLE sites ADD COLUMN online_check_timeout INTEGER NOT NULL DEFAULT 3");
  }
  if (!hasColumn(db, "sites", "online_check_match_mode")) {
    db.exec("ALTER TABLE sites ADD COLUMN online_check_match_mode TEXT NOT NULL DEFAULT 'status'");
  }
  if (!hasColumn(db, "sites", "online_check_keyword")) {
    db.exec("ALTER TABLE sites ADD COLUMN online_check_keyword TEXT NOT NULL DEFAULT ''");
  }
  if (!hasColumn(db, "sites", "online_check_fail_threshold")) {
    db.exec("ALTER TABLE sites ADD COLUMN online_check_fail_threshold INTEGER NOT NULL DEFAULT 3");
  }
  if (!hasColumn(db, "sites", "online_check_fail_count")) {
    db.exec("ALTER TABLE sites ADD COLUMN online_check_fail_count INTEGER NOT NULL DEFAULT 0");
  }
}
