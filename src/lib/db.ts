import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fontPresets, siteConfig } from "@/lib/config";
import {
  FontPresetKey,
  PaginatedSites,
  Site,
  SiteTag,
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

type SiteRow = {
  id: string;
  name: string;
  url: string;
  description: string;
  icon_url: string | null;
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
  site_count?: number;
};

type AppearanceRow = {
  theme: ThemeMode;
  wallpaper_asset_id: string | null;
  font_preset: FontPresetKey;
  overlay_opacity: number;
  text_color: string;
};

const DB_PATH = path.join(process.cwd(), "storage", "sakuranav.sqlite");

declare global {
  var __sakuraDb: Database.Database | undefined;
}

function openDatabase() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function getDb() {
  if (!global.__sakuraDb) {
    global.__sakuraDb = openDatabase();
    initializeDatabase(global.__sakuraDb);
  }

  return global.__sakuraDb;
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT NOT NULL,
      icon_url TEXT,
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
      font_preset TEXT NOT NULL,
      overlay_opacity REAL NOT NULL,
      text_color TEXT NOT NULL,
      FOREIGN KEY (wallpaper_asset_id) REFERENCES assets(id) ON DELETE SET NULL
    );
  `);

  seedDatabase(db);
}

function seedDatabase(db: Database.Database) {
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
      "INSERT INTO tags (id, name, slug, sort_order, is_hidden) VALUES (@id, @name, @slug, @sortOrder, @isHidden)",
    );

    const insertMany = db.transaction(() => {
      for (const tag of seedTags) statement.run(tag);
    });
    insertMany();
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
        globalSortOrder: 5,
        createdAt: now,
        updatedAt: now,
        tags: ["tag-private", "tag-work"],
      },
    ];

    const siteStatement = db.prepare(`
      INSERT INTO sites (
        id, name, url, description, icon_url, global_sort_order, created_at, updated_at
      ) VALUES (
        @id, @name, @url, @description, @iconUrl, @globalSortOrder, @createdAt, @updatedAt
      )
    `);

    const siteTagStatement = db.prepare(`
      INSERT INTO site_tags (site_id, tag_id, sort_order)
      VALUES (@siteId, @tagId, @sortOrder)
    `);

    const insertSeed = db.transaction(() => {
      for (const site of sites) {
        siteStatement.run(site);
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
  }

  if (!hasAppearance.count) {
    const statement = db.prepare(`
      INSERT OR REPLACE INTO theme_appearances (
        theme, wallpaper_asset_id, font_preset, overlay_opacity, text_color
      ) VALUES (
        @theme, @wallpaperAssetId, @fontPreset, @overlayOpacity, @textColor
      )
    `);

    statement.run({
      theme: "light",
      wallpaperAssetId: null,
      fontPreset: "balanced",
      overlayOpacity: 0.72,
      textColor: "#18212f",
    });

    statement.run({
      theme: "dark",
      wallpaperAssetId: null,
      fontPreset: "grotesk",
      overlayOpacity: 0.62,
      textColor: "#f3f6ff",
    });
  }
}

function mapSite(row: SiteRow, tags: SiteTag[]): Site {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    iconUrl: row.icon_url,
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
  let orderBy = "s.global_sort_order ASC, s.name COLLATE NOCASE ASC";
  let orderParams: Array<string | number> = [];

  if (options.scope === "tag") {
    filters.unshift("EXISTS (SELECT 1 FROM site_tags filter_link WHERE filter_link.site_id = s.id AND filter_link.tag_id = ?)");
    filterParams.unshift(options.tagId ?? "");
    orderBy = `
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
      SELECT theme, wallpaper_asset_id, font_preset, overlay_opacity, text_color
      FROM theme_appearances
      `,
    )
    .all() as AppearanceRow[];

  const appearances: Record<ThemeMode, ThemeAppearance> = {
    light: {
      theme: "light" as const,
      wallpaperAssetId: null,
      wallpaperUrl: null,
      fontPreset: "balanced" as FontPresetKey,
      overlayOpacity: 0.72,
      textColor: "#18212f",
    },
    dark: {
      theme: "dark" as const,
      wallpaperAssetId: null,
      wallpaperUrl: null,
      fontPreset: "grotesk" as FontPresetKey,
      overlayOpacity: 0.62,
      textColor: "#f3f6ff",
    },
  };

  for (const row of rows) {
    appearances[row.theme] = {
      theme: row.theme,
      wallpaperAssetId: row.wallpaper_asset_id,
      wallpaperUrl: row.wallpaper_asset_id
        ? `/api/assets/${row.wallpaper_asset_id}/file`
        : null,
      fontPreset: row.font_preset in fontPresets ? row.font_preset : "balanced",
      overlayOpacity: row.overlay_opacity,
      textColor: row.text_color,
    };
  }

  return appearances;
}

export function getAllSitesForAdmin(): Site[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT *
      FROM sites
      ORDER BY global_sort_order ASC, name COLLATE NOCASE ASC
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
  description: string;
  iconUrl: string | null;
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
      id, name, url, description, icon_url, global_sort_order, created_at, updated_at
    ) VALUES (
      @id, @name, @url, @description, @iconUrl, @globalSortOrder, @createdAt, @updatedAt
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
      description: input.description,
      iconUrl: input.iconUrl,
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
  description: string;
  iconUrl: string | null;
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
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id: input.id,
      name: input.name,
      url: input.url,
      description: input.description,
      iconUrl: input.iconUrl,
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

export function createTag(input: { name: string; isHidden: boolean }) {
  const db = getDb();
  const id = `tag-${crypto.randomUUID()}`;
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM tags")
    .get() as { maxOrder: number };

  db.prepare(`
    INSERT INTO tags (id, name, slug, sort_order, is_hidden)
    VALUES (@id, @name, @slug, @sortOrder, @isHidden)
  `).run({
    id,
    name: input.name,
    slug: slugify(input.name) || id,
    sortOrder: orderRow.maxOrder + 1,
    isHidden: input.isHidden ? 1 : 0,
  });

  return getVisibleTags(true).find((tag) => tag.id === id) ?? null;
}

export function updateTag(input: { id: string; name: string; isHidden: boolean }) {
  const db = getDb();
  db.prepare(`
    UPDATE tags
    SET name = @name,
        slug = @slug,
        is_hidden = @isHidden
    WHERE id = @id
  `).run({
    id: input.id,
    name: input.name,
    slug: slugify(input.name) || input.id,
    isHidden: input.isHidden ? 1 : 0,
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
      wallpaperAssetId: string | null;
      fontPreset: FontPresetKey;
      overlayOpacity: number;
      textColor: string;
    }
  >,
) {
  const db = getDb();
  const statement = db.prepare(`
    INSERT INTO theme_appearances (
      theme, wallpaper_asset_id, font_preset, overlay_opacity, text_color
    ) VALUES (
      @theme, @wallpaperAssetId, @fontPreset, @overlayOpacity, @textColor
    )
    ON CONFLICT(theme) DO UPDATE SET
      wallpaper_asset_id = excluded.wallpaper_asset_id,
      font_preset = excluded.font_preset,
      overlay_opacity = excluded.overlay_opacity,
      text_color = excluded.text_color
  `);

  const transaction = db.transaction(() => {
    (["light", "dark"] as const).forEach((theme) => {
      statement.run({
        theme,
        wallpaperAssetId: appearances[theme].wallpaperAssetId,
        fontPreset: appearances[theme].fontPreset,
        overlayOpacity: appearances[theme].overlayOpacity,
        textColor: appearances[theme].textColor,
      });
    });
  });

  transaction();
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
