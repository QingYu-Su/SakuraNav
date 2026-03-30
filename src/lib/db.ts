/**
 * @description 数据库操作模块 - SQLite 数据库初始化、迁移、种子数据及 CRUD 操作
 * @remarks 此文件为旧版数据库模块，新代码建议使用 lib/core/database 目录下的模块化结构
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fontPresets, siteConfig, themeAppearanceDefaults } from "@/lib/config";
import {
  AppSettings,
  ConfigArchive,
  ConfigArchiveAsset,
  ConfigArchiveAppearance,
  ConfigArchiveSite,
  ConfigArchiveSiteTag,
  ConfigArchiveTag,
  FontPresetKey,
  PaginatedSites,
  Site,
  SiteTag,
  StoredAsset,
  Tag,
  ThemeAppearance,
  ThemeMode,
} from "@/lib/types";
import {
  createSvgPlaceholder,
  decodeCursor,
  encodeCursor,
  slugify,
} from "@/lib/utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Database");

type SiteRow = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  icon_url: string | null;
  is_pinned: number;
  global_sort_order: number;
  created_at: string;
  updated_at: string;
};

type TagRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_hidden: number;
  logo_url: string | null;
  site_count?: number;
};

type AppearanceRow = {
  theme: ThemeMode;
  wallpaper_asset_id: string | null;
  desktop_wallpaper_asset_id: string | null;
  mobile_wallpaper_asset_id: string | null;
  font_preset: FontPresetKey;
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

type AppSettingRow = {
  key: string;
  value: string | null;
};

/** 存储资源数据库行类型 */
type StoredAssetRow = {
  id: string;
  kind: string;
  file_path: string;
  mime_type: string;
  created_at: string;
};

/** 数据库文件路径 */
const DB_PATH = path.join(process.cwd(), "storage", "sakuranav.sqlite");

/** 全局数据库实例声明 */
declare global {
  var __sakuraDb: Database.Database | undefined;
}

/**
 * 打开数据库连接
 * @returns 数据库实例
 */
function openDatabase() {
  const startTime = Date.now();
  logger.info("正在打开数据库连接", { path: DB_PATH });
  
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    
    const duration = Date.now() - startTime;
    logger.info("数据库连接成功", { duration: `${duration}ms`, mode: "WAL" });
    return db;
  } catch (error) {
    logger.error("数据库连接失败", error);
    throw error;
  }
}

/**
 * 获取数据库实例（单例模式）
 * @returns 数据库实例
 */
export function getDb() {
  if (!global.__sakuraDb) {
    logger.info("创建新的数据库实例");
    global.__sakuraDb = openDatabase();
    initializeDatabase(global.__sakuraDb);
  }

  return global.__sakuraDb;
}

function initializeDatabase(db: Database.Database) {
  logger.info("开始初始化数据库表结构");
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      logo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT NOT NULL,
      icon_url TEXT,
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
      FOREIGN KEY (wallpaper_asset_id) REFERENCES assets(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  logger.info("数据库表结构初始化完成");
  runMigrations(db);
  seedDatabase(db);
}

function hasColumn(db: Database.Database, tableName: string, columnName: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  return columns.some((column) => column.name === columnName);
}

function runMigrations(db: Database.Database) {
  logger.info("开始执行数据库迁移");
  let migrationsApplied = 0;
  
  if (!hasColumn(db, "tags", "logo_url")) {
    db.exec("ALTER TABLE tags ADD COLUMN logo_url TEXT");
    logger.info("应用迁移: tags.logo_url");
    migrationsApplied++;
  }

  if (!hasColumn(db, "theme_appearances", "desktop_wallpaper_asset_id")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN desktop_wallpaper_asset_id TEXT");
    logger.info("应用迁移: theme_appearances.desktop_wallpaper_asset_id");
    migrationsApplied++;
  }

  if (!hasColumn(db, "theme_appearances", "mobile_wallpaper_asset_id")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN mobile_wallpaper_asset_id TEXT");
    logger.info("应用迁移: theme_appearances.mobile_wallpaper_asset_id");
    migrationsApplied++;
  }

  if (!hasColumn(db, "theme_appearances", "font_size")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN font_size REAL NOT NULL DEFAULT 16");
    logger.info("应用迁移: theme_appearances.font_size");
    migrationsApplied++;
  }

  if (!hasColumn(db, "sites", "is_pinned")) {
    db.exec("ALTER TABLE sites ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0");
    logger.info("应用迁移: sites.is_pinned");
    migrationsApplied++;
  }

  if (!hasColumn(db, "theme_appearances", "logo_asset_id")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN logo_asset_id TEXT");
    logger.info("应用迁移: theme_appearances.logo_asset_id");
    migrationsApplied++;
  }

  if (!hasColumn(db, "theme_appearances", "favicon_asset_id")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN favicon_asset_id TEXT");
    logger.info("应用迁移: theme_appearances.favicon_asset_id");
    migrationsApplied++;
  }

  if (!hasColumn(db, "theme_appearances", "card_frosted")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN card_frosted INTEGER NOT NULL DEFAULT 0");
    logger.info("应用迁移: theme_appearances.card_frosted");
    migrationsApplied++;
  }

  if (!hasColumn(db, "theme_appearances", "desktop_card_frosted")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN desktop_card_frosted INTEGER NOT NULL DEFAULT 0");
    // 从旧的 card_frosted 列迁移数据
    db.exec("UPDATE theme_appearances SET desktop_card_frosted = card_frosted");
    logger.info("应用迁移: theme_appearances.desktop_card_frosted");
    migrationsApplied++;
  }

  if (!hasColumn(db, "theme_appearances", "mobile_card_frosted")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN mobile_card_frosted INTEGER NOT NULL DEFAULT 0");
    // 从旧的 card_frosted 列迁移数据
    db.exec("UPDATE theme_appearances SET mobile_card_frosted = card_frosted");
    logger.info("应用迁移: theme_appearances.mobile_card_frosted");
    migrationsApplied++;
  }

  if (!hasColumn(db, "theme_appearances", "is_default")) {
    db.exec("ALTER TABLE theme_appearances ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0");
    // 设置默认主题：暗黑模式为默认
    db.exec("UPDATE theme_appearances SET is_default = 1 WHERE theme = 'dark'");
    logger.info("应用迁移: theme_appearances.is_default");
    migrationsApplied++;
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

  // 确保 is_default 至少有一个主题为 true
  const defaultCount = db
    .prepare("SELECT COUNT(*) as count FROM theme_appearances WHERE is_default = 1")
    .get() as { count: number };
  if (defaultCount.count === 0) {
    db.exec("UPDATE theme_appearances SET is_default = 1 WHERE theme = 'dark'");
  }
  
  logger.info("数据库迁移完成", { migrationsApplied });
}

function seedDatabase(db: Database.Database) {
  logger.info("开始填充种子数据");
  
  const hasTags = db
    .prepare("SELECT COUNT(*) as count FROM tags")
    .get() as { count: number };
  const hasSites = db
    .prepare("SELECT COUNT(*) as count FROM sites")
    .get() as { count: number };
  const hasAppearance = db
    .prepare("SELECT COUNT(*) as count FROM theme_appearances")
    .get() as { count: number };

  if (!hasTags.count) {
    const seedTags = [
      { id: "tag-work", name: "工作", slug: "work", sortOrder: 0, isHidden: 0 },
      { id: "tag-dev", name: "开发", slug: "dev", sortOrder: 1, isHidden: 0 },
      { id: "tag-design", name: "设计", slug: "design", sortOrder: 2, isHidden: 0 },
      { id: "tag-ai", name: "AI", slug: "ai", sortOrder: 3, isHidden: 0 },
      { id: "tag-private", name: "隐藏", slug: "private", sortOrder: 4, isHidden: 1 },
    ];

    const statement = db.prepare(
      "INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url) VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl)",
    );

    const insertMany = db.transaction(() => {
      for (const tag of seedTags) statement.run({ ...tag, logoUrl: null });
    });
    insertMany();
    
    logger.info("已填充种子标签数据", { count: seedTags.length });
  }

  if (!hasSites.count) {
    const now = new Date().toISOString();
    const sites = [
      {
        id: "site-github",
        name: "GitHub",
        url: "https://github.com",
        description: "代码托管、Issue 协作与项目追踪的核心入口。",
        iconUrl: createSvgPlaceholder("G", "#24292f"),
        isPinned: false,
        globalSortOrder: 0,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-work", "tag-dev"],
      },
      {
        id: "site-figma",
        name: "Figma",
        url: "https://www.figma.com",
        description: "界面设计、原型协作和设计评审都能在这里完成。",
        iconUrl: createSvgPlaceholder("F", "#f24e1e"),
        isPinned: false,
        globalSortOrder: 1,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-design", "tag-work"],
      },
      {
        id: "site-openai",
        name: "OpenAI",
        url: "https://platform.openai.com",
        description: "模型平台、文档和实验入口集合。",
        iconUrl: createSvgPlaceholder("O", "#0f172a"),
        isPinned: false,
        globalSortOrder: 2,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-ai", "tag-dev"],
      },
      {
        id: "site-notion",
        name: "Notion",
        url: "https://www.notion.so",
        description: "把文档、任务和资料整理成统一的工作区。",
        iconUrl: createSvgPlaceholder("N", "#111827"),
        isPinned: false,
        globalSortOrder: 3,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-work"],
      },
      {
        id: "site-dribbble",
        name: "Dribbble",
        url: "https://dribbble.com",
        description: "灵感浏览、作品研究和视觉参考的常用站点。",
        iconUrl: createSvgPlaceholder("D", "#ea4c89"),
        isPinned: false,
        globalSortOrder: 4,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-design"],
      },
      {
        id: "site-internal",
        name: "Private Board",
        url: "https://example.com/private-board",
        description: "只有登录后才可见的隐藏网站示例。",
        iconUrl: createSvgPlaceholder("P", "#5b21b6"),
        isPinned: false,
        globalSortOrder: 5,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-private", "tag-work"],
      },
    ];

    const siteStatement = db.prepare(`
      INSERT INTO sites (
        id, name, url, description, icon_url, is_pinned, global_sort_order, created_at, updated_at
      ) VALUES (
        @id, @name, @url, @description, @iconUrl, @isPinned, @globalSortOrder, @createdAt, @updatedAt
      )
    `);

    const siteTagStatement = db.prepare(`
      INSERT INTO site_tags (site_id, tag_id, sort_order)
      VALUES (@siteId, @tagId, @sortOrder)
    `);

    const insertSeed = db.transaction(() => {
      for (const site of sites) {
        siteStatement.run({
          id: site.id,
          name: site.name,
          url: site.url,
          description: site.description,
          iconUrl: site.iconUrl,
          isPinned: site.isPinned ? 1 : 0,
          globalSortOrder: site.globalSortOrder,
          createdAt: site.createdAt,
          updatedAt: site.updatedAt,
        });
        site.tags.forEach((tagId, index) => {
          siteTagStatement.run({
            siteId: site.id,
            tagId,
            sortOrder: index + site.globalSortOrder,
          });
        });
      }
    });

    insertSeed();
    
    logger.info("已填充种子网站数据", { count: sites.length });
  }

  if (!hasAppearance.count) {
    const statement = db.prepare(`
      INSERT OR REPLACE INTO theme_appearances (
        theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color
      ) VALUES (
        @theme, @wallpaperAssetId, @desktopWallpaperAssetId, @mobileWallpaperAssetId, @fontPreset, @fontSize, @overlayOpacity, @textColor
      )
    `);

    statement.run({
      theme: "light",
      wallpaperAssetId: null,
      desktopWallpaperAssetId: null,
      mobileWallpaperAssetId: null,
      fontPreset: themeAppearanceDefaults.light.fontPreset,
      fontSize: themeAppearanceDefaults.light.fontSize,
      overlayOpacity: themeAppearanceDefaults.light.overlayOpacity,
      textColor: themeAppearanceDefaults.light.textColor,
    });

    statement.run({
      theme: "dark",
      wallpaperAssetId: null,
      desktopWallpaperAssetId: null,
      mobileWallpaperAssetId: null,
      fontPreset: themeAppearanceDefaults.dark.fontPreset,
      fontSize: themeAppearanceDefaults.dark.fontSize,
      overlayOpacity: themeAppearanceDefaults.dark.overlayOpacity,
      textColor: themeAppearanceDefaults.dark.textColor,
    });
    
    logger.info("已填充种子外观数据");
  }
  
  logger.info("种子数据填充完成");
}

function mapSite(row: SiteRow, tags: SiteTag[]): Site {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    iconUrl: row.icon_url,
    isPinned: Boolean(row.is_pinned),
    globalSortOrder: row.global_sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
  };
}

function getSiteTagsForIds(
  db: Database.Database,
  siteIds: string[],
  isAuthenticated: boolean,
) {
  if (!siteIds.length) return new Map<string, SiteTag[]>();

  const placeholders = siteIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `
      SELECT
        st.site_id,
        t.id,
        t.name,
        t.slug,
        t.is_hidden,
        st.sort_order
      FROM site_tags st
      JOIN tags t ON t.id = st.tag_id
      WHERE st.site_id IN (${placeholders})
        ${isAuthenticated ? "" : "AND t.is_hidden = 0"}
      ORDER BY st.sort_order ASC, t.sort_order ASC
      `,
    )
    .all(...siteIds) as Array<
    SiteTag & { site_id: string; is_hidden: number; sort_order: number }
  >;

  const tagsMap = new Map<string, SiteTag[]>();

  for (const row of rows) {
    const next = tagsMap.get(row.site_id) ?? [];
    next.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isHidden: Boolean(row.is_hidden),
      sortOrder: row.sort_order,
    });
    tagsMap.set(row.site_id, next);
  }

  return tagsMap;
}

function buildVisibilityClause(isAuthenticated: boolean) {
  if (isAuthenticated) return "1 = 1";

  return `
    NOT EXISTS (
      SELECT 1
      FROM site_tags hidden_link
      JOIN tags hidden_tag ON hidden_tag.id = hidden_link.tag_id
      WHERE hidden_link.site_id = s.id
        AND hidden_tag.is_hidden = 1
    )
  `;
}

function buildSearchClause(search: string) {
  if (!search) {
    return {
      clause: "1 = 1",
      params: [] as string[],
    };
  }

  const like = `%${search}%`;

  return {
    clause: `
      (
        s.name LIKE ?
        OR s.description LIKE ?
        OR EXISTS (
          SELECT 1
          FROM site_tags search_link
          JOIN tags search_tag ON search_tag.id = search_link.tag_id
          WHERE search_link.site_id = s.id
            AND search_tag.name LIKE ?
        )
      )
    `,
    params: [like, like, like],
  };
}

export function getVisibleTags(isAuthenticated: boolean): Tag[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        t.id,
        t.name,
        t.slug,
        t.sort_order,
        t.is_hidden,
        t.logo_url,
        COUNT(DISTINCT s.id) AS site_count
      FROM tags t
      LEFT JOIN site_tags st ON st.tag_id = t.id
      LEFT JOIN sites s ON s.id = st.site_id
        AND ${
          isAuthenticated
            ? "1 = 1"
            : `
          NOT EXISTS (
            SELECT 1
            FROM site_tags hidden_link
            JOIN tags hidden_tag ON hidden_tag.id = hidden_link.tag_id
            WHERE hidden_link.site_id = s.id
              AND hidden_tag.is_hidden = 1
          )
        `
        }
      WHERE ${isAuthenticated ? "1 = 1" : "t.is_hidden = 0"}
      GROUP BY t.id
      ORDER BY t.sort_order ASC, t.name COLLATE NOCASE ASC
      `,
    )
    .all() as TagRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    isHidden: Boolean(row.is_hidden),
    logoUrl: row.logo_url,
    siteCount: row.site_count ?? 0,
  }));
}

export function getPaginatedSites(options: {
  isAuthenticated: boolean;
  scope: "all" | "tag";
  tagId?: string | null;
  query?: string | null;
  cursor?: string | null;
}): PaginatedSites {
  const db = getDb();
  const offset = decodeCursor(options.cursor ?? null);
  const search = options.query?.trim() ?? "";
  const searchClause = buildSearchClause(search);
  const visibilityClause = buildVisibilityClause(options.isAuthenticated);
  const pageSize = siteConfig.pageSize;

  const filters = [visibilityClause, searchClause.clause];
  const filterParams: Array<string | number> = [...searchClause.params];
  let orderBy = "s.is_pinned DESC, s.global_sort_order ASC, s.name COLLATE NOCASE ASC";
  let orderParams: Array<string | number> = [];

  if (options.scope === "tag") {
    filters.unshift("EXISTS (SELECT 1 FROM site_tags filter_link WHERE filter_link.site_id = s.id AND filter_link.tag_id = ?)");
    filterParams.unshift(options.tagId ?? "");
    orderBy = `
      s.is_pinned DESC,
      (
        SELECT filter_order.sort_order
        FROM site_tags filter_order
        WHERE filter_order.site_id = s.id
          AND filter_order.tag_id = ?
      ) ASC,
      s.name COLLATE NOCASE ASC
    `;
    orderParams = [options.tagId ?? ""];
  }

  const whereClause = filters.join(" AND ");

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM sites s
      WHERE ${whereClause}
      `,
    )
    .get(...filterParams) as { count: number };

  const queryParams = [...filterParams, ...orderParams, pageSize, offset];
  const rows = db
    .prepare(
      `
      SELECT s.*
      FROM sites s
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
      `,
    )
    .all(...queryParams) as SiteRow[];

  const tagsMap = getSiteTagsForIds(
    db,
    rows.map((row) => row.id),
    options.isAuthenticated,
  );

  const items = rows.map((row) => mapSite(row, tagsMap.get(row.id) ?? []));
  const nextOffset = offset + items.length;

  return {
    items,
    total: totalRow.count,
    nextCursor: nextOffset < totalRow.count ? encodeCursor(nextOffset) : null,
  };
}

export function getAppearances(): Record<ThemeMode, ThemeAppearance> {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color, logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      FROM theme_appearances
      `,
    )
    .all() as AppearanceRow[];

  const appearances: Record<ThemeMode, ThemeAppearance> = {
    light: {
      theme: "light" as const,
      desktopWallpaperAssetId: null,
      desktopWallpaperUrl: null,
      mobileWallpaperAssetId: null,
      mobileWallpaperUrl: null,
      fontPreset: themeAppearanceDefaults.light.fontPreset,
      fontSize: themeAppearanceDefaults.light.fontSize,
      overlayOpacity: themeAppearanceDefaults.light.overlayOpacity,
      textColor: themeAppearanceDefaults.light.textColor,
      logoAssetId: null,
      logoUrl: null,
      faviconAssetId: null,
      faviconUrl: null,
      desktopCardFrosted: false,
      mobileCardFrosted: false,
      isDefault: false,
    },
    dark: {
      theme: "dark" as const,
      desktopWallpaperAssetId: null,
      desktopWallpaperUrl: null,
      mobileWallpaperAssetId: null,
      mobileWallpaperUrl: null,
      fontPreset: themeAppearanceDefaults.dark.fontPreset,
      fontSize: themeAppearanceDefaults.dark.fontSize,
      overlayOpacity: themeAppearanceDefaults.dark.overlayOpacity,
      textColor: themeAppearanceDefaults.dark.textColor,
      logoAssetId: null,
      logoUrl: null,
      faviconAssetId: null,
      faviconUrl: null,
      desktopCardFrosted: false,
      mobileCardFrosted: false,
      isDefault: true,
    },
  };

  for (const row of rows) {
    const desktopWallpaperAssetId = row.desktop_wallpaper_asset_id ?? row.wallpaper_asset_id ?? null;
    const mobileWallpaperAssetId = row.mobile_wallpaper_asset_id ?? null;
    const logoAssetId = row.logo_asset_id ?? null;
    const faviconAssetId = row.favicon_asset_id ?? null;

    appearances[row.theme] = {
      theme: row.theme,
      desktopWallpaperAssetId,
      desktopWallpaperUrl: desktopWallpaperAssetId
        ? `/api/assets/${desktopWallpaperAssetId}/file`
        : null,
      mobileWallpaperAssetId,
      mobileWallpaperUrl: mobileWallpaperAssetId
        ? `/api/assets/${mobileWallpaperAssetId}/file`
        : null,
      fontPreset: row.font_preset in fontPresets ? row.font_preset : "balanced",
      fontSize: Number.isFinite(row.font_size) ? row.font_size : themeAppearanceDefaults[row.theme].fontSize,
      overlayOpacity: row.overlay_opacity,
      textColor: row.text_color,
      logoAssetId,
      logoUrl: logoAssetId
        ? `/api/assets/${logoAssetId}/file`
        : null,
      faviconAssetId,
      faviconUrl: faviconAssetId
        ? `/api/assets/${faviconAssetId}/file`
        : null,
      desktopCardFrosted: Boolean(row.desktop_card_frosted ?? row.card_frosted),
      mobileCardFrosted: Boolean(row.mobile_card_frosted ?? row.card_frosted),
      isDefault: Boolean(row.is_default),
    };
  }

  return appearances;
}

export function getAppSettings(): AppSettings {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM app_settings").all() as AppSettingRow[];
  const settingMap = new Map(rows.map((row) => [row.key, row.value]));
  const lightLogoAssetId =
    settingMap.get("site_logo_light_asset_id") ??
    settingMap.get("site_logo_asset_id") ??
    null;
  const darkLogoAssetId =
    settingMap.get("site_logo_dark_asset_id") ??
    settingMap.get("site_logo_asset_id") ??
    null;

  return {
    lightLogoAssetId,
    lightLogoUrl: lightLogoAssetId
      ? `/api/assets/${lightLogoAssetId}/file`
      : siteConfig.logoSrc,
    darkLogoAssetId,
    darkLogoUrl: darkLogoAssetId
      ? `/api/assets/${darkLogoAssetId}/file`
      : siteConfig.logoSrc,
  };
}

export function getAllSitesForAdmin(): Site[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT *
      FROM sites
      ORDER BY is_pinned DESC, global_sort_order ASC, name COLLATE NOCASE ASC
      `,
    )
    .all() as SiteRow[];
  const tagsMap = getSiteTagsForIds(
    db,
    rows.map((row) => row.id),
    true,
  );

  return rows.map((row) => mapSite(row, tagsMap.get(row.id) ?? []));
}

export function createSite(input: {
  name: string;
  url: string;
  description?: string | null;
  iconUrl: string | null;
  isPinned: boolean;
  tagIds: string[];
}) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = `site-${crypto.randomUUID()}`;
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM sites")
    .get() as { maxOrder: number };

  const insertSite = db.prepare(`
    INSERT INTO sites (
      id, name, url, description, icon_url, is_pinned, global_sort_order, created_at, updated_at
    ) VALUES (
      @id, @name, @url, @description, @iconUrl, @isPinned, @globalSortOrder, @createdAt, @updatedAt
    )
  `);

  const insertSiteTag = db.prepare(`
    INSERT INTO site_tags (site_id, tag_id, sort_order)
    VALUES (@siteId, @tagId, @sortOrder)
  `);

  const transaction = db.transaction(() => {
    insertSite.run({
      id,
      name: input.name,
      url: input.url,
      description: input.description ?? null,
      iconUrl: input.iconUrl,
      isPinned: input.isPinned ? 1 : 0,
      globalSortOrder: orderRow.maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    for (const tagId of input.tagIds) {
      const currentOrder = db
        .prepare(
          "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM site_tags WHERE tag_id = ?",
        )
        .get(tagId) as { maxOrder: number };
      insertSiteTag.run({
        siteId: id,
        tagId,
        sortOrder: currentOrder.maxOrder + 1,
      });
    }
  });

  transaction();

  return getAllSitesForAdmin().find((site) => site.id === id) ?? null;
}

export function updateSite(input: {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  iconUrl: string | null;
  isPinned: boolean;
  tagIds: string[];
}) {
  const db = getDb();
  const now = new Date().toISOString();
  const existingTags = db
    .prepare("SELECT tag_id, sort_order FROM site_tags WHERE site_id = ?")
    .all(input.id) as Array<{ tag_id: string; sort_order: number }>;

  const existingMap = new Map(existingTags.map((row) => [row.tag_id, row.sort_order]));

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE sites
      SET name = @name,
          url = @url,
          description = @description,
          icon_url = @iconUrl,
          is_pinned = @isPinned,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id: input.id,
      name: input.name,
      url: input.url,
      description: input.description ?? null,
      iconUrl: input.iconUrl,
      isPinned: input.isPinned ? 1 : 0,
      updatedAt: now,
    });

    db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(input.id);

    for (const tagId of input.tagIds) {
      const preserved = existingMap.get(tagId);
      const nextOrder =
        preserved ??
        ((db
          .prepare(
            "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM site_tags WHERE tag_id = ?",
          )
          .get(tagId) as { maxOrder: number }).maxOrder + 1);

      db.prepare(
        "INSERT INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)",
      ).run(input.id, tagId, nextOrder);
    }
  });

  transaction();

  return getAllSitesForAdmin().find((site) => site.id === input.id) ?? null;
}

export function deleteSite(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM sites WHERE id = ?").run(id);
}

export function createTag(input: {
  name: string;
  isHidden: boolean;
  logoUrl: string | null;
}) {
  const db = getDb();
  const id = `tag-${crypto.randomUUID()}`;
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM tags")
    .get() as { maxOrder: number };

  db.prepare(`
    INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url)
    VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl)
  `).run({
    id,
    name: input.name,
    slug: slugify(input.name) || id,
    sortOrder: orderRow.maxOrder + 1,
    isHidden: input.isHidden ? 1 : 0,
    logoUrl: input.logoUrl,
  });

  return getVisibleTags(true).find((tag) => tag.id === id) ?? null;
}

export function updateTag(input: {
  id: string;
  name: string;
  isHidden: boolean;
  logoUrl: string | null;
}) {
  const db = getDb();
  db.prepare(`
    UPDATE tags
    SET name = @name,
        slug = @slug,
        is_hidden = @isHidden,
        logo_url = @logoUrl
    WHERE id = @id
  `).run({
    id: input.id,
    name: input.name,
    slug: slugify(input.name) || input.id,
    isHidden: input.isHidden ? 1 : 0,
    logoUrl: input.logoUrl,
  });

  return getVisibleTags(true).find((tag) => tag.id === input.id) ?? null;
}

export function deleteTag(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM tags WHERE id = ?").run(id);
}

export function reorderTags(tagIds: string[]) {
  const db = getDb();
  const transaction = db.transaction(() => {
    tagIds.forEach((tagId, index) => {
      db.prepare("UPDATE tags SET sort_order = ? WHERE id = ?").run(index, tagId);
    });
  });

  transaction();
}

export function reorderSitesGlobal(siteIds: string[]) {
  const db = getDb();
  const transaction = db.transaction(() => {
    siteIds.forEach((siteId, index) => {
      db.prepare("UPDATE sites SET global_sort_order = ? WHERE id = ?").run(index, siteId);
    });
  });

  transaction();
}

export function reorderSitesInTag(tagId: string, siteIds: string[]) {
  const db = getDb();
  const transaction = db.transaction(() => {
    siteIds.forEach((siteId, index) => {
      db.prepare(
        "UPDATE site_tags SET sort_order = ? WHERE tag_id = ? AND site_id = ?",
      ).run(index, tagId, siteId);
    });
  });

  transaction();
}

export function updateAppearances(
  appearances: Record<
    ThemeMode,
    {
      desktopWallpaperAssetId: string | null;
      mobileWallpaperAssetId: string | null;
      fontPreset: FontPresetKey;
      fontSize: number;
      overlayOpacity: number;
      textColor: string;
      logoAssetId?: string | null;
      faviconAssetId?: string | null;
      desktopCardFrosted?: boolean;
      mobileCardFrosted?: boolean;
      isDefault?: boolean;
    }
  >,
) {
  const db = getDb();

  // First, reset all is_default to 0 if any theme is being set as default
  const anyIsDefault = (["light", "dark"] as const).some(
    (theme) => appearances[theme].isDefault === true
  );
  if (anyIsDefault) {
    db.exec("UPDATE theme_appearances SET is_default = 0");
  }

  const statement = db.prepare(`
    INSERT INTO theme_appearances (
      theme,
      wallpaper_asset_id,
      desktop_wallpaper_asset_id,
      mobile_wallpaper_asset_id,
      font_preset,
      font_size,
      overlay_opacity,
      text_color,
      logo_asset_id,
      favicon_asset_id,
      card_frosted,
      desktop_card_frosted,
      mobile_card_frosted,
      is_default
    ) VALUES (
      @theme,
      NULL,
      @desktopWallpaperAssetId,
      @mobileWallpaperAssetId,
      @fontPreset,
      @fontSize,
      @overlayOpacity,
      @textColor,
      @logoAssetId,
      @faviconAssetId,
      0,
      @desktopCardFrosted,
      @mobileCardFrosted,
      @isDefault
    )
    ON CONFLICT(theme) DO UPDATE SET
      wallpaper_asset_id = excluded.wallpaper_asset_id,
      desktop_wallpaper_asset_id = excluded.desktop_wallpaper_asset_id,
      mobile_wallpaper_asset_id = excluded.mobile_wallpaper_asset_id,
      font_preset = excluded.font_preset,
      font_size = excluded.font_size,
      overlay_opacity = excluded.overlay_opacity,
      text_color = excluded.text_color,
      logo_asset_id = excluded.logo_asset_id,
      favicon_asset_id = excluded.favicon_asset_id,
      card_frosted = excluded.card_frosted,
      desktop_card_frosted = excluded.desktop_card_frosted,
      mobile_card_frosted = excluded.mobile_card_frosted,
      is_default = excluded.is_default
  `);

  const transaction = db.transaction(() => {
    (["light", "dark"] as const).forEach((theme) => {
      statement.run({
        theme,
        desktopWallpaperAssetId: appearances[theme].desktopWallpaperAssetId,
        mobileWallpaperAssetId: appearances[theme].mobileWallpaperAssetId,
        fontPreset: appearances[theme].fontPreset,
        fontSize: appearances[theme].fontSize,
        overlayOpacity: appearances[theme].overlayOpacity,
        textColor: appearances[theme].textColor,
        logoAssetId: appearances[theme].logoAssetId ?? null,
        faviconAssetId: appearances[theme].faviconAssetId ?? null,
        desktopCardFrosted: appearances[theme].desktopCardFrosted ? 1 : 0,
        mobileCardFrosted: appearances[theme].mobileCardFrosted ? 1 : 0,
        isDefault: appearances[theme].isDefault ? 1 : 0,
      });
    });
  });

  transaction();
}

export function updateAppSettings(settings: {
  lightLogoAssetId: string | null;
  darkLogoAssetId: string | null;
}) {
  const db = getDb();
  const statement = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const transaction = db.transaction(() => {
    statement.run({
      key: "site_logo_light_asset_id",
      value: settings.lightLogoAssetId,
    });
    statement.run({
      key: "site_logo_dark_asset_id",
      value: settings.darkLogoAssetId,
    });
  });

  transaction();

  return getAppSettings();
}

export function createAsset(input: { filePath: string; mimeType: string; kind: string }) {
  const db = getDb();
  const id = `asset-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO assets (id, kind, file_path, mime_type, created_at)
    VALUES (@id, @kind, @filePath, @mimeType, @createdAt)
  `).run({
    id,
    kind: input.kind,
    filePath: input.filePath,
    mimeType: input.mimeType,
    createdAt,
  });

  return {
    id,
    kind: input.kind,
    url: `/api/assets/${id}/file`,
  };
}

export function getAsset(assetId: string) {
  const db = getDb();
  return (
    (db
      .prepare(
        "SELECT id, kind, file_path, mime_type, created_at FROM assets WHERE id = ?",
      )
      .get(assetId) as
      | {
          id: string;
          kind: string;
          file_path: string;
          mime_type: string;
          created_at: string;
        }
      | undefined) ?? null
  );
}

export function listStoredAssets(): StoredAsset[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, kind, file_path, mime_type, created_at
      FROM assets
      ORDER BY created_at ASC, id ASC
      `,
    )
    .all() as StoredAssetRow[];

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    filePath: row.file_path,
    mimeType: row.mime_type,
    createdAt: row.created_at,
  }));
}

export function buildConfigArchive(): ConfigArchive {
  const db = getDb();
  const tagRows = db
    .prepare(
      `
      SELECT id, name, slug, sort_order, is_hidden, logo_url
      FROM tags
      ORDER BY sort_order ASC, name COLLATE NOCASE ASC
      `,
    )
    .all() as TagRow[];
  const siteRows = db
    .prepare(
      `
      SELECT id, name, url, description, icon_url, global_sort_order, created_at, updated_at
      , is_pinned
      FROM sites
      ORDER BY is_pinned DESC, global_sort_order ASC, name COLLATE NOCASE ASC
      `,
    )
    .all() as SiteRow[];
  const siteTagRows = db
    .prepare(
      `
      SELECT site_id, tag_id, sort_order
      FROM site_tags
      ORDER BY tag_id ASC, sort_order ASC, site_id ASC
      `,
    )
    .all() as Array<{ site_id: string; tag_id: string; sort_order: number }>;
  const appearanceRows = db
    .prepare(
      `
      SELECT theme, wallpaper_asset_id, desktop_wallpaper_asset_id, mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color, logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default
      FROM theme_appearances
      ORDER BY theme ASC
      `,
    )
    .all() as AppearanceRow[];
  const assets = listStoredAssets();

  const appearanceMap: Record<ThemeMode, ConfigArchiveAppearance> = {
    light: {
      theme: "light",
      desktopWallpaperAssetId: null,
      mobileWallpaperAssetId: null,
      fontPreset: themeAppearanceDefaults.light.fontPreset,
      fontSize: themeAppearanceDefaults.light.fontSize,
      overlayOpacity: themeAppearanceDefaults.light.overlayOpacity,
      textColor: themeAppearanceDefaults.light.textColor,
      logoAssetId: null,
      faviconAssetId: null,
      desktopCardFrosted: false,
      mobileCardFrosted: false,
      isDefault: false,
    },
    dark: {
      theme: "dark",
      desktopWallpaperAssetId: null,
      mobileWallpaperAssetId: null,
      fontPreset: themeAppearanceDefaults.dark.fontPreset,
      fontSize: themeAppearanceDefaults.dark.fontSize,
      overlayOpacity: themeAppearanceDefaults.dark.overlayOpacity,
      textColor: themeAppearanceDefaults.dark.textColor,
      logoAssetId: null,
      faviconAssetId: null,
      desktopCardFrosted: false,
      mobileCardFrosted: false,
      isDefault: true,
    },
  };

  for (const row of appearanceRows) {
    const desktopWallpaperAssetId = row.desktop_wallpaper_asset_id ?? row.wallpaper_asset_id ?? null;
    const mobileWallpaperAssetId = row.mobile_wallpaper_asset_id ?? null;

    appearanceMap[row.theme] = {
      theme: row.theme,
      desktopWallpaperAssetId,
      mobileWallpaperAssetId,
      fontPreset: row.font_preset in fontPresets ? row.font_preset : "balanced",
      fontSize: Number.isFinite(row.font_size) ? row.font_size : themeAppearanceDefaults[row.theme].fontSize,
      overlayOpacity: row.overlay_opacity,
      textColor: row.text_color,
      logoAssetId: row.logo_asset_id ?? null,
      faviconAssetId: row.favicon_asset_id ?? null,
      desktopCardFrosted: Boolean(row.desktop_card_frosted ?? row.card_frosted),
      mobileCardFrosted: Boolean(row.mobile_card_frosted ?? row.card_frosted),
      isDefault: Boolean(row.is_default),
    };
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tags: tagRows.map<ConfigArchiveTag>((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sortOrder: row.sort_order,
      isHidden: Boolean(row.is_hidden),
      logoUrl: row.logo_url,
    })),
    sites: siteRows.map<ConfigArchiveSite>((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      description: row.description,
      iconUrl: row.icon_url,
      isPinned: Boolean(row.is_pinned),
      globalSortOrder: row.global_sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    siteTags: siteTagRows.map<ConfigArchiveSiteTag>((row) => ({
      siteId: row.site_id,
      tagId: row.tag_id,
      sortOrder: row.sort_order,
    })),
    appearances: appearanceMap,
    settings: {
      lightLogoAssetId: getAppSettings().lightLogoAssetId,
      darkLogoAssetId: getAppSettings().darkLogoAssetId,
    },
    assets: assets.map<ConfigArchiveAsset>((asset) => ({
      id: asset.id,
      kind: asset.kind,
      mimeType: asset.mimeType,
      createdAt: asset.createdAt,
      archivePath: `assets/${path.basename(asset.filePath)}`,
    })),
  };
}

function extFromMime(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    default:
      return ".bin";
  }
}

export function replaceConfigArchive(
  archive: ConfigArchive,
  assetFiles: Map<string, Buffer>,
) {
  const db = getDb();
  const uploadsDir = path.join(process.cwd(), "storage", "uploads");
  const oldAssets = listStoredAssets();
  const nextAssetPaths = new Map<string, string>();
  const tagIds = new Set(archive.tags.map((tag) => tag.id));
  const siteIds = new Set(archive.sites.map((site) => site.id));
  const assetIds = new Set(archive.assets.map((asset) => asset.id));

  for (const relation of archive.siteTags) {
    if (!siteIds.has(relation.siteId)) {
      throw new Error(`站点关联引用了不存在的网站：${relation.siteId}`);
    }

    if (!tagIds.has(relation.tagId)) {
      throw new Error(`站点关联引用了不存在的标签：${relation.tagId}`);
    }
  }

  for (const theme of ["light", "dark"] as const) {
    const desktopWallpaperAssetId = archive.appearances[theme].desktopWallpaperAssetId;
    const mobileWallpaperAssetId = archive.appearances[theme].mobileWallpaperAssetId;

    if (desktopWallpaperAssetId && !assetIds.has(desktopWallpaperAssetId)) {
      throw new Error(`主题 ${theme} 引用了不存在的桌面壁纸资源：${desktopWallpaperAssetId}`);
    }

    if (mobileWallpaperAssetId && !assetIds.has(mobileWallpaperAssetId)) {
      throw new Error(`主题 ${theme} 引用了不存在的移动壁纸资源：${mobileWallpaperAssetId}`);
    }
  }

  if (
    archive.settings.lightLogoAssetId &&
    !assetIds.has(archive.settings.lightLogoAssetId)
  ) {
    throw new Error(`明亮主题 Logo 引用了不存在的资源：${archive.settings.lightLogoAssetId}`);
  }

  if (
    archive.settings.darkLogoAssetId &&
    !assetIds.has(archive.settings.darkLogoAssetId)
  ) {
    throw new Error(`暗黑主题 Logo 引用了不存在的资源：${archive.settings.darkLogoAssetId}`);
  }

  for (const asset of archive.assets) {
    if (!assetFiles.has(asset.id)) {
      throw new Error(`缺少资源文件：${asset.archivePath}`);
    }
  }

  fs.mkdirSync(uploadsDir, { recursive: true });

  for (const asset of archive.assets) {
    const archiveName = path.basename(asset.archivePath);
    const safeExt = path.extname(archiveName) || extFromMime(asset.mimeType);
    nextAssetPaths.set(asset.id, path.join(uploadsDir, `${asset.id}${safeExt}`));
  }

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM theme_appearances").run();
    db.prepare("DELETE FROM app_settings").run();
    db.prepare("DELETE FROM site_tags").run();
    db.prepare("DELETE FROM sites").run();
    db.prepare("DELETE FROM tags").run();
    db.prepare("DELETE FROM assets").run();

    const insertAsset = db.prepare(`
      INSERT INTO assets (id, kind, file_path, mime_type, created_at)
      VALUES (@id, @kind, @filePath, @mimeType, @createdAt)
    `);
    const insertTag = db.prepare(`
      INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url)
      VALUES (@id, @name, @slug, @sortOrder, @isHidden, @logoUrl)
    `);
    const insertSite = db.prepare(`
      INSERT INTO sites (
        id, name, url, description, icon_url, is_pinned, global_sort_order, created_at, updated_at
      ) VALUES (
        @id, @name, @url, @description, @iconUrl, @isPinned, @globalSortOrder, @createdAt, @updatedAt
      )
    `);
    const insertSiteTag = db.prepare(`
      INSERT INTO site_tags (site_id, tag_id, sort_order)
      VALUES (@siteId, @tagId, @sortOrder)
    `);
    const insertAppearance = db.prepare(`
      INSERT INTO theme_appearances (
        theme,
        wallpaper_asset_id,
        desktop_wallpaper_asset_id,
        mobile_wallpaper_asset_id,
        font_preset,
        font_size,
        overlay_opacity,
        text_color,
        logo_asset_id,
        favicon_asset_id,
        card_frosted,
        desktop_card_frosted,
        mobile_card_frosted,
        is_default
      ) VALUES (
        @theme,
        NULL,
        @desktopWallpaperAssetId,
        @mobileWallpaperAssetId,
        @fontPreset,
        @fontSize,
        @overlayOpacity,
        @textColor,
        @logoAssetId,
        @faviconAssetId,
        0,
        @desktopCardFrosted,
        @mobileCardFrosted,
        @isDefault
      )
    `);
    const insertSetting = db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES (@key, @value)
    `);

    for (const asset of archive.assets) {
      const filePath = nextAssetPaths.get(asset.id) as string;
      fs.writeFileSync(filePath, assetFiles.get(asset.id) as Buffer);
      insertAsset.run({
        id: asset.id,
        kind: asset.kind,
        filePath,
        mimeType: asset.mimeType,
        createdAt: asset.createdAt,
      });
    }

    for (const tag of archive.tags) {
      insertTag.run({
        id: tag.id,
        name: tag.name,
        slug: tag.slug || slugify(tag.name) || tag.id,
        sortOrder: tag.sortOrder,
        isHidden: tag.isHidden ? 1 : 0,
        logoUrl: tag.logoUrl,
      });
    }

    for (const site of archive.sites) {
      insertSite.run({
        id: site.id,
        name: site.name,
        url: site.url,
        description: site.description,
        iconUrl: site.iconUrl,
        isPinned: site.isPinned ? 1 : 0,
        globalSortOrder: site.globalSortOrder,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
      });
    }

    for (const relation of archive.siteTags) {
      insertSiteTag.run(relation);
    }

    for (const theme of ["light", "dark"] as const) {
      insertAppearance.run(archive.appearances[theme]);
    }

    insertSetting.run({
      key: "site_logo_light_asset_id",
      value: archive.settings.lightLogoAssetId,
    });
    insertSetting.run({
      key: "site_logo_dark_asset_id",
      value: archive.settings.darkLogoAssetId,
    });
  });

  transaction();

  for (const asset of oldAssets) {
    if (asset.filePath !== nextAssetPaths.get(asset.id) && fs.existsSync(asset.filePath)) {
      fs.rmSync(asset.filePath, { force: true });
    }
  }
}

export function getSearchSuggestions(options: {
  query: string;
  isAuthenticated: boolean;
  limit?: number;
}) {
  const db = getDb();
  const query = options.query.trim();
  if (!query) return [];

  const like = `%${query}%`;
  const limit = options.limit ?? 8;
  const visibilityClause = options.isAuthenticated
    ? "1 = 1"
    : `
      NOT EXISTS (
        SELECT 1
        FROM site_tags hidden_link
        JOIN tags hidden_tag ON hidden_tag.id = hidden_link.tag_id
        WHERE hidden_link.site_id = s.id
          AND hidden_tag.is_hidden = 1
      )
    `;

  const siteRows = db
    .prepare(
      `
      SELECT DISTINCT s.name AS value, 'site' AS kind, s.updated_at AS sort_at
      FROM sites s
      WHERE ${visibilityClause}
        AND (s.name LIKE ? OR s.description LIKE ?)
      ORDER BY s.is_pinned DESC, s.global_sort_order ASC, s.updated_at DESC
      LIMIT ?
      `,
    )
    .all(like, like, limit) as Array<{ value: string; kind: "site"; sort_at: string }>;

  const remaining = Math.max(limit - siteRows.length, 0);
  const tagRows =
    remaining > 0
      ? (db
          .prepare(
            `
            SELECT DISTINCT t.name AS value, 'tag' AS kind, CAST(t.sort_order AS TEXT) AS sort_at
            FROM tags t
            WHERE ${options.isAuthenticated ? "1 = 1" : "t.is_hidden = 0"}
              AND t.name LIKE ?
            ORDER BY t.sort_order ASC, t.name COLLATE NOCASE ASC
            LIMIT ?
            `,
          )
          .all(like, remaining) as Array<{ value: string; kind: "tag"; sort_at: string }>)
      : [];

  const deduped = new Set<string>();
  const items: Array<{ value: string; kind: "site" | "tag" }> = [];

  for (const row of [...siteRows, ...tagRows]) {
    const normalized = row.value.trim();
    if (!normalized || deduped.has(normalized)) {
      continue;
    }
    deduped.add(normalized);
    items.push({ value: normalized, kind: row.kind });
    if (items.length >= limit) break;
  }

  return items;
}

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

  for (const asset of oldAssets) {
    if (fs.existsSync(asset.filePath)) {
      fs.rmSync(asset.filePath, { force: true });
    }
  }
}
