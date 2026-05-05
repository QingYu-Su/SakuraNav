/**
 * @description 数据库迁移 - 处理数据库结构变更和数据迁移
 * 使用 DatabaseAdapter 接口，兼容 SQLite/MySQL/PostgreSQL
 */

import type { DatabaseAdapter } from "./adapter";

export async function runMigrations(adapter: DatabaseAdapter): Promise<void> {
  if (!(await adapter.hasColumn("tags", "logo_url"))) {
    await adapter.exec("ALTER TABLE tags ADD COLUMN logo_url TEXT");
  }

  if (!(await adapter.hasColumn("theme_appearances", "desktop_wallpaper_asset_id"))) {
    await adapter.exec("ALTER TABLE theme_appearances ADD COLUMN desktop_wallpaper_asset_id TEXT");
  }

  if (!(await adapter.hasColumn("theme_appearances", "mobile_wallpaper_asset_id"))) {
    await adapter.exec("ALTER TABLE theme_appearances ADD COLUMN mobile_wallpaper_asset_id TEXT");
  }

  if (!(await adapter.hasColumn("theme_appearances", "font_size"))) {
    await adapter.exec("ALTER TABLE theme_appearances ADD COLUMN font_size REAL NOT NULL DEFAULT 16");
  }

  if (!(await adapter.hasColumn("sites", "is_pinned"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0");
  }

  if (!(await adapter.hasColumn("theme_appearances", "logo_asset_id"))) {
    await adapter.exec("ALTER TABLE theme_appearances ADD COLUMN logo_asset_id TEXT");
  }

  if (!(await adapter.hasColumn("theme_appearances", "favicon_asset_id"))) {
    await adapter.exec("ALTER TABLE theme_appearances ADD COLUMN favicon_asset_id TEXT");
  }

  if (!(await adapter.hasColumn("theme_appearances", "card_frosted"))) {
    await adapter.exec("ALTER TABLE theme_appearances ADD COLUMN card_frosted INTEGER NOT NULL DEFAULT 0");
  }

  if (!(await adapter.hasColumn("theme_appearances", "desktop_card_frosted"))) {
    await adapter.exec("ALTER TABLE theme_appearances ADD COLUMN desktop_card_frosted INTEGER NOT NULL DEFAULT 0");
    await adapter.exec("UPDATE theme_appearances SET desktop_card_frosted = card_frosted");
  }

  if (!(await adapter.hasColumn("theme_appearances", "mobile_card_frosted"))) {
    await adapter.exec("ALTER TABLE theme_appearances ADD COLUMN mobile_card_frosted INTEGER NOT NULL DEFAULT 0");
    await adapter.exec("UPDATE theme_appearances SET mobile_card_frosted = card_frosted");
  }

  if (!(await adapter.hasColumn("theme_appearances", "is_default"))) {
    await adapter.exec("ALTER TABLE theme_appearances ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0");
    await adapter.exec("UPDATE theme_appearances SET is_default = 1 WHERE theme = 'dark'");
  }

  if (!(await adapter.hasColumn("sites", "icon_bg_color"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN icon_bg_color TEXT");
  }

  if (!(await adapter.hasColumn("sites", "is_online"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN is_online INTEGER");
  }

  if (!(await adapter.hasColumn("tags", "logo_bg_color"))) {
    await adapter.exec("ALTER TABLE tags ADD COLUMN logo_bg_color TEXT");
  }

  if (!(await adapter.hasColumn("tags", "description"))) {
    await adapter.exec("ALTER TABLE tags ADD COLUMN description TEXT");
  }

  if (!(await adapter.hasColumn("sites", "skip_online_check"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN skip_online_check INTEGER NOT NULL DEFAULT 0");
  }

  // 迁移：移除 sites.description 的 NOT NULL 约束（仅 SQLite 需要重建表）
  if (adapter.type === "sqlite") {
    const sitesCols = await adapter.getTableColumns("sites");
    if (sitesCols.length > 0) {
      // 检查是否是 SQLite 适配器，通过查询 pragma_table_info 判断 notnull
      const sqliteCheck = await adapter.queryOne<{ notnull: number }>(
        "SELECT notnull FROM pragma_table_info('sites') WHERE name = 'description'"
      ).catch(() => null);
      if (sqliteCheck && sqliteCheck.notnull === 1) {
        await adapter.exec("DROP TABLE IF EXISTS sites_new");
        await adapter.exec(`
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
          )
        `);
        await adapter.exec(`
          INSERT INTO sites_new SELECT id, name, url, description, icon_url, icon_bg_color, is_pinned, global_sort_order, created_at, COALESCE(updated_at, created_at, datetime('now')) FROM sites
        `);
        await adapter.exec("DROP TABLE sites");
        await adapter.exec("ALTER TABLE sites_new RENAME TO sites");
        await adapter.exec(`
          CREATE TABLE IF NOT EXISTS site_tags (
            site_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            PRIMARY KEY (site_id, tag_id),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
          )
        `);
      }
    }
  }

  await adapter.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await adapter.exec(`
    UPDATE theme_appearances
    SET desktop_wallpaper_asset_id = COALESCE(desktop_wallpaper_asset_id, wallpaper_asset_id),
        mobile_wallpaper_asset_id = COALESCE(mobile_wallpaper_asset_id, wallpaper_asset_id)
    WHERE wallpaper_asset_id IS NOT NULL
  `);

  const defaultCount = await adapter.queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM theme_appearances WHERE is_default = 1"
  );
  if (defaultCount && defaultCount.count === 0) {
    await adapter.exec("UPDATE theme_appearances SET is_default = 1 WHERE theme = 'dark'");
  }

  // 创建 cards 表（社交卡片）
  await adapter.exec(`
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
    )
  `);

  // sites 表新增 card_type 和 card_data 列，迁移 cards 数据
  if (!(await adapter.hasColumn("sites", "card_type"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN card_type TEXT");
    await adapter.exec("ALTER TABLE sites ADD COLUMN card_data TEXT");

    const cards = await adapter.query<{
      id: string; card_type: string; label: string; icon_url: string | null;
      icon_bg_color: string | null; payload: string; global_sort_order: number;
      created_at: string; updated_at: string;
    }>("SELECT * FROM cards");

    await adapter.transaction(async () => {
      for (const card of cards) {
        await adapter.execute(
          `INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, skip_online_check, is_pinned, global_sort_order, card_type, card_data, created_at, updated_at)
           VALUES (@id, @name, '#', NULL, @iconUrl, @iconBgColor, 1, 0, @globalSortOrder, @cardType, @cardData, @createdAt, @updatedAt)`,
          {
            id: card.id, name: card.label, iconUrl: card.icon_url,
            iconBgColor: card.icon_bg_color, globalSortOrder: card.global_sort_order,
            cardType: card.card_type, cardData: card.payload,
            createdAt: card.created_at, updatedAt: card.updated_at,
          }
        );
      }
    });

    await adapter.exec("DELETE FROM cards");
  }

  // 多用户迁移
  if (!(await adapter.hasTable("users"))) {
    await adapter.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL
      )
    `);

    if (!(await adapter.hasColumn("sites", "owner_id"))) {
      await adapter.exec("ALTER TABLE sites ADD COLUMN owner_id TEXT NOT NULL DEFAULT '__admin__'");
    }

    if (!(await adapter.hasColumn("tags", "owner_id"))) {
      if (adapter.type === "sqlite") {
        // SQLite: 需要备份 site_tags 并重建 tags 表（SQLite ALTER TABLE 限制）
        await adapter.exec("CREATE TABLE site_tags_backup AS SELECT * FROM site_tags");
        await adapter.exec("DROP TABLE site_tags");
      } else {
        // MySQL/PostgreSQL: 原地添加列即可，但我们需要重建 tags 的主键/约束
        await adapter.exec("DROP TABLE IF EXISTS site_tags");
      }

      await adapter.exec(`
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
      await adapter.exec(`
        INSERT INTO tags_new (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, owner_id)
        SELECT id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, '__admin__'
        FROM tags
      `);
      await adapter.exec("DROP TABLE tags");
      await adapter.exec("ALTER TABLE tags_new RENAME TO tags");

      await adapter.exec(`
        CREATE TABLE site_tags (
          site_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          sort_order INTEGER NOT NULL,
          PRIMARY KEY (site_id, tag_id),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
      `);

      if (adapter.type === "sqlite") {
        await adapter.exec(`
          INSERT OR IGNORE INTO site_tags (site_id, tag_id, sort_order)
          SELECT site_id, tag_id, sort_order FROM site_tags_backup
        `);
        await adapter.exec("DROP TABLE site_tags_backup");
      }
    }

    await adapter.exec("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('registration_enabled', 'true')");
  }

  // 外观表多用户迁移
  if (!(await adapter.hasColumn("theme_appearances", "owner_id"))) {
    await adapter.exec("DROP TABLE IF EXISTS theme_appearances_v2");
    await adapter.exec(`
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
    await adapter.exec(`
      INSERT INTO theme_appearances_v2 (owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id,
        mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color,
        logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default)
      SELECT '__admin__', theme, wallpaper_asset_id, desktop_wallpaper_asset_id,
        mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color,
        logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      FROM theme_appearances
    `);
    await adapter.exec("DROP TABLE theme_appearances");
    await adapter.exec("ALTER TABLE theme_appearances_v2 RENAME TO theme_appearances");
  }

  // 用户资料迁移
  if (await adapter.hasTable("users")) {
    if (!(await adapter.hasColumn("users", "nickname"))) {
      await adapter.exec("ALTER TABLE users ADD COLUMN nickname TEXT");
    }
    if (!(await adapter.hasColumn("users", "avatar_asset_id"))) {
      await adapter.exec("ALTER TABLE users ADD COLUMN avatar_asset_id TEXT");
    }
    if (!(await adapter.hasColumn("users", "avatar_color"))) {
      await adapter.exec("ALTER TABLE users ADD COLUMN avatar_color TEXT");
    }
  }

  // 磨砂效果迁移
  {
    const marker = await adapter.queryOne("SELECT value FROM app_settings WHERE key = 'frosted_migrated_v2'");
    if (!marker) {
      await adapter.exec(`
        UPDATE theme_appearances SET
          desktop_card_frosted = CASE WHEN desktop_card_frosted > 0 THEN 100 ELSE 0 END,
          mobile_card_frosted = CASE WHEN mobile_card_frosted > 0 THEN 100 ELSE 0 END
      `);
      await adapter.exec("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('frosted_migrated_v2', '1')");
    }
  }

  // OAuth 迁移
  if (!(await adapter.hasTable("oauth_accounts"))) {
    await adapter.exec(`
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

  // 用户表 OAuth 相关字段
  if (await adapter.hasTable("users")) {
    if (!(await adapter.hasColumn("users", "username_changed"))) {
      await adapter.exec("ALTER TABLE users ADD COLUMN username_changed INTEGER NOT NULL DEFAULT 0");
    }
    if (!(await adapter.hasColumn("users", "has_password"))) {
      await adapter.exec("ALTER TABLE users ADD COLUMN has_password INTEGER NOT NULL DEFAULT 1");
    }
  }

  // 每站点在线检测
  if (!(await adapter.hasColumn("sites", "online_check_frequency"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN online_check_frequency TEXT NOT NULL DEFAULT '1d'");
  }
  if (!(await adapter.hasColumn("sites", "online_check_last_run"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN online_check_last_run TEXT");
  }

  // 在线检测高级配置
  if (!(await adapter.hasColumn("sites", "online_check_timeout"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN online_check_timeout INTEGER NOT NULL DEFAULT 3");
  }
  if (!(await adapter.hasColumn("sites", "online_check_match_mode"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN online_check_match_mode TEXT NOT NULL DEFAULT 'status'");
  }
  if (!(await adapter.hasColumn("sites", "online_check_keyword"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN online_check_keyword TEXT NOT NULL DEFAULT ''");
  }
  if (!(await adapter.hasColumn("sites", "online_check_fail_threshold"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN online_check_fail_threshold INTEGER NOT NULL DEFAULT 3");
  }
  if (!(await adapter.hasColumn("sites", "online_check_fail_count"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN online_check_fail_count INTEGER NOT NULL DEFAULT 0");
  }

  // 访问规则
  if (!(await adapter.hasColumn("sites", "access_rules"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN access_rules TEXT");
  }

  // 关联推荐字段
  if (!(await adapter.hasColumn("sites", "recommend_context"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN recommend_context TEXT NOT NULL DEFAULT ''");
  }
  if (!(await adapter.hasColumn("sites", "ai_relation_enabled"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN ai_relation_enabled INTEGER NOT NULL DEFAULT 1");
  }
  if (!(await adapter.hasColumn("sites", "allow_linked_by_others"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN allow_linked_by_others INTEGER NOT NULL DEFAULT 1");
  }
  if (!(await adapter.hasColumn("sites", "related_sites_enabled"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN related_sites_enabled INTEGER NOT NULL DEFAULT 1");
  }
  if (!(await adapter.hasColumn("sites", "recommend_context_enabled"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN recommend_context_enabled INTEGER NOT NULL DEFAULT 0");
  }

  // site_relations 表
  if (!(await adapter.hasTable("site_relations"))) {
    await adapter.exec(`
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
      )
    `);
  }

  // AI 关联分析队列表
  if (!(await adapter.hasTable("ai_relation_queue"))) {
    await adapter.exec(`
      CREATE TABLE IF NOT EXISTS ai_relation_queue (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL UNIQUE,
        priority INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `);
  }

  // site_relations 新增字段
  if (!(await adapter.hasColumn("site_relations", "source"))) {
    await adapter.exec("ALTER TABLE site_relations ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'");
  }
  if (!(await adapter.hasColumn("site_relations", "reason"))) {
    await adapter.exec("ALTER TABLE site_relations ADD COLUMN reason TEXT NOT NULL DEFAULT ''");
  }

  // pending_ai_analysis
  if (!(await adapter.hasColumn("sites", "pending_ai_analysis"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN pending_ai_analysis INTEGER NOT NULL DEFAULT 0");
  }

  // 备忘便签
  if (!(await adapter.hasColumn("sites", "notes"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
  }
  if (!(await adapter.hasColumn("sites", "todos"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN todos TEXT NOT NULL DEFAULT '[]'");
  }

  // 便签 AI 可读性
  if (!(await adapter.hasColumn("sites", "notes_ai_enabled"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN notes_ai_enabled INTEGER NOT NULL DEFAULT 1");
  }
  if (!(await adapter.hasColumn("sites", "todos_ai_enabled"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN todos_ai_enabled INTEGER NOT NULL DEFAULT 1");
  }

  // 推荐上下文智能生成 + 搜索优化
  if (!(await adapter.hasColumn("sites", "recommend_context_auto_gen"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN recommend_context_auto_gen INTEGER NOT NULL DEFAULT 1");
  }
  if (!(await adapter.hasColumn("sites", "pending_context_gen"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN pending_context_gen INTEGER NOT NULL DEFAULT 0");
  }
  if (!(await adapter.hasColumn("sites", "search_text"))) {
    await adapter.exec("ALTER TABLE sites ADD COLUMN search_text TEXT NOT NULL DEFAULT ''");
  }

  // 推荐上下文默认开启
  {
    const ctxMarker = await adapter.queryOne("SELECT value FROM app_settings WHERE key = 'ctx_default_migrated_v1'");
    if (!ctxMarker) {
      await adapter.exec("UPDATE sites SET recommend_context_enabled = 1 WHERE recommend_context_enabled = 0");
      await adapter.exec("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('ctx_default_migrated_v1', '1')");
    }
  }
  {
    const autoGenMarker = await adapter.queryOne("SELECT value FROM app_settings WHERE key = 'ctx_auto_gen_migrated_v1'");
    if (!autoGenMarker) {
      await adapter.exec("UPDATE sites SET recommend_context_auto_gen = 1 WHERE recommend_context_auto_gen = 0");
      await adapter.exec("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('ctx_auto_gen_migrated_v1', '1')");
    }
  }

  // 回填 search_text
  {
    const stMarker = await adapter.queryOne("SELECT value FROM app_settings WHERE key = 'search_text_backfilled'");
    if (!stMarker) {
      await adapter.exec(`
        UPDATE sites SET search_text = TRIM(
          COALESCE(name, '') || ' ' ||
          COALESCE(description, '') || ' ' ||
          COALESCE(notes, '') || ' ' ||
          COALESCE(recommend_context, '') || ' ' ||
          CASE
            WHEN todos IS NOT NULL AND todos <> '' AND todos <> '[]'
            THEN REPLACE(REPLACE(REPLACE(todos, '"text":"', ' '), '","completed"', ' '), '"id":"', ' ')
            ELSE ''
          END
        )
      `);
      const sites = await adapter.query<{ id: string }>("SELECT id FROM sites");
      await adapter.transaction(async () => {
        for (const site of sites) {
          const groupConcatExpr = adapter.type === "postgresql"
            ? "STRING_AGG(t.name, ' ')"
            : "GROUP_CONCAT(t.name, ' ')";
          const row = await adapter.queryOne<{ tagNames: string | null }>(
            `SELECT ${groupConcatExpr} AS tagNames
             FROM site_tags st JOIN tags t ON t.id = st.tag_id
             WHERE st.site_id = ?`,
            [site.id]
          );
          if (row?.tagNames) {
            await adapter.execute(
              "UPDATE sites SET search_text = search_text || ' ' || @tagNames WHERE id = @id",
              { id: site.id, tagNames: row.tagNames }
            );
          }
        }
      });
      await adapter.exec("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('search_text_backfilled', '1')");
    }
  }

  // assets 表扩展
  if (!(await adapter.hasColumn("assets", "original_name"))) {
    await adapter.exec("ALTER TABLE assets ADD COLUMN original_name TEXT");
  }
  if (!(await adapter.hasColumn("assets", "note_id"))) {
    await adapter.exec("ALTER TABLE assets ADD COLUMN note_id TEXT");
  }
  if (!(await adapter.hasColumn("assets", "file_size"))) {
    await adapter.exec("ALTER TABLE assets ADD COLUMN file_size INTEGER");
  }

  // 性能索引
  await adapter.exec("CREATE INDEX IF NOT EXISTS idx_sites_owner_id ON sites(owner_id)");
  await adapter.exec("CREATE INDEX IF NOT EXISTS idx_site_tags_tag_id ON site_tags(tag_id)");
  await adapter.exec("CREATE INDEX IF NOT EXISTS idx_sites_pending_ai ON sites(pending_ai_analysis, ai_relation_enabled)");
  await adapter.exec("CREATE INDEX IF NOT EXISTS idx_sites_pending_ctx ON sites(pending_context_gen, recommend_context_auto_gen)");
  await adapter.exec("CREATE INDEX IF NOT EXISTS idx_site_relations_source ON site_relations(source_site_id)");
  await adapter.exec("CREATE INDEX IF NOT EXISTS idx_sites_search_text ON sites(search_text)");
  await adapter.exec("CREATE INDEX IF NOT EXISTS idx_assets_note_id ON assets(note_id)");

  // 快照表
  if (!(await adapter.hasTable("snapshots"))) {
    await adapter.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        label TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    await adapter.exec("CREATE INDEX IF NOT EXISTS idx_snapshots_owner ON snapshots(owner_id)");
    await adapter.exec("CREATE INDEX IF NOT EXISTS idx_snapshots_created ON snapshots(created_at)");
  }
}
