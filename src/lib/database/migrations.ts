/**
* @description 数据库迁移 - 处理数据库结构变更和数据迁移
* 使用 DatabaseAdapter 接口，兼容 SQLite/MySQL/PostgreSQL
*/

import type { DatabaseAdapter } from "./adapter";

export async function runMigrations(adapter: DatabaseAdapter): Promise<void> {
  // 检测是否存在旧表名（sites/site_tags/site_relations）
  // 用于区分：全新数据库（直接用新表名） vs 已有数据库（需要渐进迁移+重命名）
  const hasLegacyTables = await adapter.hasTable("sites");

  // ══════════════════════════════════════════════════════
  // 以下迁移不涉及重命名的表，可无条件运行
  // ══════════════════════════════════════════════════════

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

  if (!(await adapter.hasColumn("tags", "logo_bg_color"))) {
    await adapter.exec("ALTER TABLE tags ADD COLUMN logo_bg_color TEXT");
  }

  if (!(await adapter.hasColumn("tags", "description"))) {
    await adapter.exec("ALTER TABLE tags ADD COLUMN description TEXT");
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

  // 多用户迁移（不引用旧表名的部分）
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

    // 只有旧数据库才需要这些迁移（新数据库 schema 已包含 owner_id）
    if (hasLegacyTables) {
      if (!(await adapter.hasColumn("sites", "owner_id"))) {
        await adapter.exec("ALTER TABLE sites ADD COLUMN owner_id TEXT NOT NULL DEFAULT '__admin__'");
      }

      if (!(await adapter.hasColumn("tags", "owner_id"))) {
        if (adapter.type === "sqlite") {
          await adapter.exec("CREATE TABLE site_tags_backup AS SELECT * FROM site_tags");
          await adapter.exec("DROP TABLE site_tags");
        } else {
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

  // 通知配置表
  if (!(await adapter.hasTable("notification_channels"))) {
    await adapter.exec(`
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
      )
    `);
  }

  // URL 在线状态缓存表
  if (!(await adapter.hasTable("url_online_cache"))) {
    await adapter.exec(`
      CREATE TABLE IF NOT EXISTS url_online_cache (
        url TEXT PRIMARY KEY,
        is_online INTEGER NOT NULL,
        last_checked_at TEXT NOT NULL
      )
    `);
  }

  // API 访问令牌表
  if (!(await adapter.hasTable("api_tokens"))) {
    await adapter.exec(`
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
      )
    `);
    await adapter.exec("CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id)");
    await adapter.exec("CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash)");
  }

  // ══════════════════════════════════════════════════════
  // 以下迁移引用旧表名（sites/site_tags/site_relations），
  // 仅在旧表存在时运行（已有数据库渐进迁移）
  // ══════════════════════════════════════════════════════

  if (hasLegacyTables) {
    // ── sites 表列添加 ──

    if (!(await adapter.hasColumn("sites", "is_pinned"))) {
      await adapter.exec("ALTER TABLE sites ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0");
    }

    if (!(await adapter.hasColumn("sites", "icon_bg_color"))) {
      await adapter.exec("ALTER TABLE sites ADD COLUMN icon_bg_color TEXT");
    }

    if (!(await adapter.hasColumn("sites", "is_online"))) {
      await adapter.exec("ALTER TABLE sites ADD COLUMN is_online INTEGER");
    }

    if (!(await adapter.hasColumn("sites", "skip_online_check"))) {
      await adapter.exec("ALTER TABLE sites ADD COLUMN skip_online_check INTEGER NOT NULL DEFAULT 0");
    }

    // 迁移：移除 sites.description 的 NOT NULL 约束（仅 SQLite 需要重建表）
    if (adapter.type === "sqlite") {
      const sitesCols = await adapter.getTableColumns("sites");
      if (sitesCols.length > 0) {
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

    // 创建 cards 表（社交卡片）— 旧的多卡片方案，数据最终合并到 sites
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

    // ── sites 在线检测字段 ──

    if (!(await adapter.hasColumn("sites", "online_check_frequency"))) {
      await adapter.exec("ALTER TABLE sites ADD COLUMN online_check_frequency TEXT NOT NULL DEFAULT '1d'");
    }
    if (!(await adapter.hasColumn("sites", "online_check_last_run"))) {
      await adapter.exec("ALTER TABLE sites ADD COLUMN online_check_last_run TEXT");
    }
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

    // 离线通知开关
    if (!(await adapter.hasColumn("sites", "offline_notify"))) {
      await adapter.exec("ALTER TABLE sites ADD COLUMN offline_notify INTEGER NOT NULL DEFAULT 0");
    }

    // 访问规则
    if (!(await adapter.hasColumn("sites", "access_rules"))) {
      await adapter.exec("ALTER TABLE sites ADD COLUMN access_rules TEXT");
    }

    // ── 关联推荐字段 ──

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

    // ── site_relations 表 ──

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

    // ── 更多 sites 字段 ──

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

    // 性能索引
    await adapter.exec("CREATE INDEX IF NOT EXISTS idx_sites_owner_id ON sites(owner_id)");
    await adapter.exec("CREATE INDEX IF NOT EXISTS idx_site_tags_tag_id ON site_tags(tag_id)");
    await adapter.exec("CREATE INDEX IF NOT EXISTS idx_sites_pending_ai ON sites(pending_ai_analysis, ai_relation_enabled)");
    await adapter.exec("CREATE INDEX IF NOT EXISTS idx_sites_pending_ctx ON sites(pending_context_gen, recommend_context_auto_gen)");
    await adapter.exec("CREATE INDEX IF NOT EXISTS idx_site_relations_source ON site_relations(source_site_id)");
    await adapter.exec("CREATE INDEX IF NOT EXISTS idx_sites_search_text ON sites(search_text)");
    await adapter.exec("CREATE INDEX IF NOT EXISTS idx_assets_note_id ON assets(note_id)");

    // ──────────────────────────────────────
    // 表重命名迁移：消除命名歧义
    // sites → cards, site_tags → card_tags, site_relations → card_relations
    // ──────────────────────────────────────
    {
      const renameMarker = await adapter.queryOne("SELECT value FROM app_settings WHERE key = 'tables_renamed_v1'");
      if (!renameMarker) {
        // 1. 删除废弃的旧 cards 表（如果存在）
        await adapter.exec("DROP TABLE IF EXISTS cards");

        // 2. 重命名 sites → cards
        await adapter.exec("ALTER TABLE sites RENAME TO cards");

        // 3. 重建 site_tags → card_tags（schema 可能已创建空的 card_tags，需先删除）
        await adapter.exec("DROP TABLE IF EXISTS card_tags");
        await adapter.exec(`
          CREATE TABLE card_tags (
            card_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            PRIMARY KEY (card_id, tag_id),
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
          )
        `);
        await adapter.exec("INSERT INTO card_tags (card_id, tag_id, sort_order) SELECT site_id, tag_id, sort_order FROM site_tags");
        await adapter.exec("DROP TABLE site_tags");

        // 4. 重建 site_relations → card_relations（schema 可能已创建空的 card_relations，需先删除）
        await adapter.exec("DROP TABLE IF EXISTS card_relations");
        await adapter.exec(`
          CREATE TABLE card_relations (
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
          )
        `);
        await adapter.exec("INSERT INTO card_relations (id, source_card_id, target_card_id, sort_order, is_enabled, is_locked, source, reason, created_at) SELECT id, source_site_id, target_site_id, sort_order, is_enabled, is_locked, source, reason, created_at FROM site_relations");
        await adapter.exec("DROP TABLE site_relations");

        // 5. 重建 ai_relation_queue（列名 site_id → card_id）
        await adapter.exec(`
          CREATE TABLE ai_relation_queue_new (
            id TEXT PRIMARY KEY,
            card_id TEXT NOT NULL UNIQUE,
            priority INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
          )
        `);
        await adapter.exec("INSERT INTO ai_relation_queue_new (id, card_id, priority, status, created_at) SELECT id, site_id, priority, status, created_at FROM ai_relation_queue");
        await adapter.exec("DROP TABLE ai_relation_queue");
        await adapter.exec("ALTER TABLE ai_relation_queue_new RENAME TO ai_relation_queue");

        // 6. 重建索引
        await adapter.exec("CREATE INDEX IF NOT EXISTS idx_cards_owner_id ON cards(owner_id)");
        await adapter.exec("CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON card_tags(tag_id)");
        await adapter.exec("CREATE INDEX IF NOT EXISTS idx_card_relations_source ON card_relations(source_card_id)");
        await adapter.exec("CREATE INDEX IF NOT EXISTS idx_cards_search_text ON cards(search_text)");
        await adapter.exec("CREATE INDEX IF NOT EXISTS idx_cards_pending_ai ON cards(pending_ai_analysis, ai_relation_enabled)");
        await adapter.exec("CREATE INDEX IF NOT EXISTS idx_cards_pending_ctx ON cards(pending_context_gen, recommend_context_auto_gen)");

        // 7. 标记迁移完成
        await adapter.exec("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('tables_renamed_v1', '1')");
      }
    }
  } // end if (hasLegacyTables)

  // ══════════════════════════════════════════════════════
  // 卡片字段语义化重命名：url → site_url, description → site_description 等
  // 新增 social_hint 列（社交卡片提示文字）
  // ══════════════════════════════════════════════════════
  {
    const renameMarker = await adapter.queryOne("SELECT value FROM app_settings WHERE key = 'card_fields_renamed_v1'");
    if (!renameMarker) {
      // 仅在旧列存在时执行（全新数据库 schema 已使用新列名）
      if (await adapter.hasColumn("cards", "url")) {
        await adapter.exec("ALTER TABLE cards RENAME COLUMN url TO site_url");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN description TO site_description");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN is_online TO site_is_online");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN skip_online_check TO site_skip_online_check");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN online_check_frequency TO site_online_check_frequency");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN online_check_timeout TO site_online_check_timeout");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN online_check_match_mode TO site_online_check_match_mode");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN online_check_keyword TO site_online_check_keyword");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN online_check_fail_threshold TO site_online_check_fail_threshold");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN online_check_last_run TO site_online_check_last_run");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN online_check_fail_count TO site_online_check_fail_count");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN offline_notify TO site_offline_notify");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN access_rules TO site_access_rules");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN is_pinned TO site_is_pinned");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN recommend_context TO site_recommend_context");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN ai_relation_enabled TO site_ai_relation_enabled");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN allow_linked_by_others TO site_allow_linked_by_others");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN related_sites_enabled TO site_related_sites_enabled");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN recommend_context_enabled TO site_recommend_context_enabled");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN recommend_context_auto_gen TO site_recommend_context_auto_gen");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN pending_ai_analysis TO site_pending_ai_analysis");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN pending_context_gen TO site_pending_context_gen");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN notes TO site_notes");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN notes_ai_enabled TO site_notes_ai_enabled");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN todos TO site_todos");
        await adapter.exec("ALTER TABLE cards RENAME COLUMN todos_ai_enabled TO site_todos_ai_enabled");
      }

      // 新增 social_hint 列
      if (!(await adapter.hasColumn("cards", "social_hint"))) {
        await adapter.exec("ALTER TABLE cards ADD COLUMN social_hint TEXT");
      }

      // 数据迁移：社交卡片的 site_description → social_hint，然后 site_description 置空
      // 笔记卡片两者都保持 null
      await adapter.exec(`
        UPDATE cards SET
          social_hint = site_description,
          site_description = NULL
        WHERE card_type IS NOT NULL AND card_type != 'note' AND site_description IS NOT NULL
      `);

      // 重建涉及重命名列的索引
      await adapter.exec("DROP INDEX IF EXISTS idx_cards_pending_ai");
      await adapter.exec("DROP INDEX IF EXISTS idx_cards_pending_ctx");
      await adapter.exec("CREATE INDEX IF NOT EXISTS idx_cards_pending_ai ON cards(site_pending_ai_analysis, site_ai_relation_enabled)");
      await adapter.exec("CREATE INDEX IF NOT EXISTS idx_cards_pending_ctx ON cards(site_pending_context_gen, site_recommend_context_auto_gen)");

      await adapter.exec("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('card_fields_renamed_v1', '1')");
    }
  }
}
