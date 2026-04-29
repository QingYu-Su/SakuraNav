/**
 * @description 网站数据仓库 - 管理网站数据的增删改查和排序操作
 * @description 多用户版本：所有操作基于 owner_id 隔离数据空间
 */

import type { Site, SiteTag, PaginatedSites, SocialCardType, OnlineCheckFrequency, OnlineCheckMatchMode, AccessRules, AccessCondition, AlternateUrl, RelatedSiteItem } from "@/lib/base/types";
import { SOCIAL_TAG_ID, DEFAULT_ONLINE_CHECK_TIMEOUT, DEFAULT_ONLINE_CHECK_MATCH_MODE, DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD } from "@/lib/base/types";
import { getDb } from "@/lib/database";
import { getSiteTagsForIds } from "./tag-repository";
import { getRelatedSitesForIds } from "./site-relation-repository";
import { siteConfig } from "@/lib/config/config";
import { decodeCursor, encodeCursor } from "@/lib/utils/utils";

/** 网站数据库行类型 */
type SiteRow = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  icon_url: string | null;
  icon_bg_color: string | null;
  is_online: number | null;
  skip_online_check: number;
  online_check_frequency: string;
  online_check_timeout: number;
  online_check_match_mode: string;
  online_check_keyword: string;
  online_check_fail_threshold: number;
  online_check_last_run: string | null;
  online_check_fail_count: number;
  access_rules: string | null;
  is_pinned: number;
  global_sort_order: number;
  card_type: string | null;
  card_data: string | null;
  owner_id: string;
  recommend_context: string | null;
  ai_relation_enabled: number | null;
  allow_linked_by_others: number | null;
  related_sites_enabled: number | null;
  recommend_context_enabled: number | null;
  created_at: string;
  updated_at: string;
};

function mapSiteRow(row: SiteRow, tags: SiteTag[], relatedSites: RelatedSiteItem[]): Site {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    iconUrl: row.icon_url,
    iconBgColor: row.icon_bg_color,
    isOnline: row.is_online == null ? null : Boolean(row.is_online),
    skipOnlineCheck: Boolean(row.skip_online_check),
    onlineCheckFrequency: (row.online_check_frequency || "1d") as OnlineCheckFrequency,
    onlineCheckTimeout: row.online_check_timeout || DEFAULT_ONLINE_CHECK_TIMEOUT,
    onlineCheckMatchMode: (row.online_check_match_mode || "status") as OnlineCheckMatchMode,
    onlineCheckKeyword: row.online_check_keyword || "",
    onlineCheckFailThreshold: row.online_check_fail_threshold || DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
    onlineCheckLastRun: row.online_check_last_run,
    onlineCheckFailCount: row.online_check_fail_count || 0,
    accessRules: row.access_rules ? normalizeAccessRules(JSON.parse(row.access_rules)) : null,
    isPinned: Boolean(row.is_pinned),
    globalSortOrder: row.global_sort_order,
    cardType: row.card_type as SocialCardType | null,
    cardData: row.card_data,
    recommendContext: row.recommend_context ?? "",
    aiRelationEnabled: row.ai_relation_enabled ?? 1 ? true : false,
    allowLinkedByOthers: row.allow_linked_by_others ?? 1 ? true : false,
    relatedSitesEnabled: row.related_sites_enabled == null ? true : Boolean(row.related_sites_enabled),
    recommendContextEnabled: row.recommend_context_enabled == null ? false : Boolean(row.recommend_context_enabled),
    relatedSites,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
  };
}

function buildSearchClause(search: string): { clause: string; params: string[] } {
  if (!search) {
    return { clause: "1 = 1", params: [] };
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

/**
 * 获取分页站点列表
 * @param ownerId 数据所有者 ID
 */
export function getPaginatedSites(options: {
  ownerId: string;
  scope: "all" | "tag";
  tagId?: string | null;
  query?: string | null;
  cursor?: string | null;
}): PaginatedSites {
  const db = getDb();
  const offset = decodeCursor(options.cursor ?? null);
  const search = options.query?.trim() ?? "";
  const searchClause = buildSearchClause(search);
  const pageSize = siteConfig.pageSize;

  const filters = ["s.owner_id = ?", searchClause.clause];
  const filterParams: Array<string | number> = [options.ownerId, ...searchClause.params];
  let orderBy = "s.is_pinned DESC, s.global_sort_order ASC, s.name COLLATE NOCASE ASC";
  let orderParams: Array<string | number> = [];

  if (options.scope === "tag") {
    // 社交卡片虚拟标签：按 card_type IS NOT NULL 过滤
    if (options.tagId === SOCIAL_TAG_ID) {
      filters.unshift("s.card_type IS NOT NULL");
    } else {
      filters.unshift(
        "EXISTS (SELECT 1 FROM site_tags filter_link WHERE filter_link.site_id = s.id AND filter_link.tag_id = ?)"
      );
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
  }

  const whereClause = filters.join(" AND ");

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM sites s
      WHERE ${whereClause}
      `
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
      `
    )
    .all(...queryParams) as SiteRow[];

  const tagsMap = getSiteTagsForIds(
    db,
    rows.map((row) => row.id),
  );
  const relationsMap = getRelatedSitesForIds(rows.map((row) => row.id));

  const items = rows.map((row) => mapSiteRow(row, tagsMap.get(row.id) ?? [], relationsMap.get(row.id) ?? []));
  const nextOffset = offset + items.length;

  return {
    items,
    total: totalRow.count,
    nextCursor: nextOffset < totalRow.count ? encodeCursor(nextOffset) : null,
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
      `
    )
    .all() as SiteRow[];
  const tagsMap = getSiteTagsForIds(
    db,
    rows.map((row) => row.id),
  );
  const relationsMap = getRelatedSitesForIds(rows.map((row) => row.id));

  return rows.map((row) => mapSiteRow(row, tagsMap.get(row.id) ?? [], relationsMap.get(row.id) ?? []));
}

export function getSiteById(id: string): Site | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sites WHERE id = ?").get(id) as SiteRow | undefined;
  if (!row) return null;

  const tagsMap = getSiteTagsForIds(db, [row.id]);
  const relationsMap = getRelatedSitesForIds([row.id]);
  return mapSiteRow(row, tagsMap.get(row.id) ?? [], relationsMap.get(row.id) ?? []);
}

export function createSite(input: {
  name: string;
  url: string;
  description?: string | null;
  iconUrl: string | null;
  iconBgColor?: string | null;
  isPinned: boolean;
  skipOnlineCheck?: boolean;
  onlineCheckFrequency?: OnlineCheckFrequency;
  onlineCheckTimeout?: number;
  onlineCheckMatchMode?: OnlineCheckMatchMode;
  onlineCheckKeyword?: string;
  onlineCheckFailThreshold?: number;
  tagIds: string[];
  cardType?: SocialCardType | null;
  cardData?: string | null;
  ownerId: string;
  accessRules?: AccessRules | null;
  recommendContext?: string;
  aiRelationEnabled?: boolean;
  allowLinkedByOthers?: boolean;
  relatedSites?: Array<{ siteId: string; enabled: boolean; locked: boolean; sortOrder: number }>;
  relatedSitesEnabled?: boolean;
  recommendContextEnabled?: boolean;
}): Site | null {
  const db = getDb();
  const now = new Date().toISOString();
  const id = `site-${crypto.randomUUID()}`;
  const orderRow = db
    .prepare("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM sites WHERE owner_id = ?")
    .get(input.ownerId) as { maxOrder: number };

  const insertSite = db.prepare(`
    INSERT INTO sites (
      id, name, url, description, icon_url, icon_bg_color, skip_online_check, online_check_frequency,
      online_check_timeout, online_check_match_mode, online_check_keyword, online_check_fail_threshold,
      is_pinned, global_sort_order, card_type, card_data, access_rules, owner_id,
      recommend_context, ai_relation_enabled, allow_linked_by_others, related_sites_enabled,
      recommend_context_enabled,
      created_at, updated_at
    ) VALUES (
      @id, @name, @url, @description, @iconUrl, @iconBgColor, @skipOnlineCheck, @onlineCheckFrequency,
      @onlineCheckTimeout, @onlineCheckMatchMode, @onlineCheckKeyword, @onlineCheckFailThreshold,
      @isPinned, @globalSortOrder, @cardType, @cardData, @accessRules, @ownerId,
      @recommendContext, @aiRelationEnabled, @allowLinkedByOthers, @relatedSitesEnabled,
      @recommendContextEnabled,
      @createdAt, @updatedAt
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
      iconBgColor: input.iconBgColor ?? null,
      skipOnlineCheck: input.skipOnlineCheck ? 1 : 0,
      onlineCheckFrequency: input.onlineCheckFrequency ?? "1d",
      onlineCheckTimeout: input.onlineCheckTimeout ?? DEFAULT_ONLINE_CHECK_TIMEOUT,
      onlineCheckMatchMode: input.onlineCheckMatchMode ?? DEFAULT_ONLINE_CHECK_MATCH_MODE,
      onlineCheckKeyword: input.onlineCheckKeyword ?? "",
      onlineCheckFailThreshold: input.onlineCheckFailThreshold ?? DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
      isPinned: input.isPinned ? 1 : 0,
      globalSortOrder: orderRow.maxOrder + 1,
      cardType: input.cardType ?? null,
      cardData: input.cardData ?? null,
      accessRules: input.accessRules ? JSON.stringify(input.accessRules) : null,
      ownerId: input.ownerId,
      recommendContext: input.recommendContext ?? "",
      aiRelationEnabled: (input.aiRelationEnabled ?? true) ? 1 : 0,
      allowLinkedByOthers: (input.allowLinkedByOthers ?? true) ? 1 : 0,
      relatedSitesEnabled: (input.relatedSitesEnabled ?? true) ? 1 : 0,
      recommendContextEnabled: (input.recommendContextEnabled ?? false) ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    });

    for (const tagId of input.tagIds) {
      const currentOrder = db
        .prepare(
          "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM site_tags WHERE tag_id = ?"
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

  return getSiteById(id);
}

export function updateSite(input: {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  iconUrl: string | null;
  iconBgColor?: string | null;
  isPinned: boolean;
  skipOnlineCheck?: boolean;
  onlineCheckFrequency?: OnlineCheckFrequency;
  onlineCheckTimeout?: number;
  onlineCheckMatchMode?: OnlineCheckMatchMode;
  onlineCheckKeyword?: string;
  onlineCheckFailThreshold?: number;
  tagIds: string[];
  cardType?: SocialCardType | null;
  cardData?: string | null;
  accessRules?: AccessRules | null;
  recommendContext?: string;
  aiRelationEnabled?: boolean;
  allowLinkedByOthers?: boolean;
  relatedSites?: Array<{ siteId: string; enabled: boolean; locked: boolean; sortOrder: number }>;
  relatedSitesEnabled?: boolean;
  recommendContextEnabled?: boolean;
}): Site | null {
  const db = getDb();
  const now = new Date().toISOString();
  const existingTags = db
    .prepare("SELECT tag_id, sort_order FROM site_tags WHERE site_id = ?")
    .all(input.id) as Array<{ tag_id: string; sort_order: number }>;

  const existingMap = new Map(existingTags.map((row) => [row.tag_id, row.sort_order]));

  const transaction = db.transaction(() => {
    db.prepare(
      `
      UPDATE sites
      SET name = @name,
          url = @url,
          description = @description,
          icon_url = @iconUrl,
          icon_bg_color = @iconBgColor,
          skip_online_check = @skipOnlineCheck,
          online_check_frequency = @onlineCheckFrequency,
          online_check_timeout = @onlineCheckTimeout,
          online_check_match_mode = @onlineCheckMatchMode,
          online_check_keyword = @onlineCheckKeyword,
          online_check_fail_threshold = @onlineCheckFailThreshold,
          is_pinned = @isPinned,
          card_type = @cardType,
          card_data = @cardData,
          access_rules = @accessRules,
          recommend_context = @recommendContext,
          ai_relation_enabled = @aiRelationEnabled,
          allow_linked_by_others = @allowLinkedByOthers,
          related_sites_enabled = @relatedSitesEnabled,
          recommend_context_enabled = @recommendContextEnabled,
          updated_at = @updatedAt
      WHERE id = @id
    `
    ).run({
      id: input.id,
      name: input.name,
      url: input.url,
      description: input.description ?? null,
      iconUrl: input.iconUrl,
      iconBgColor: input.iconBgColor ?? null,
      skipOnlineCheck: input.skipOnlineCheck ? 1 : 0,
      onlineCheckFrequency: input.onlineCheckFrequency ?? "1d",
      onlineCheckTimeout: input.onlineCheckTimeout ?? DEFAULT_ONLINE_CHECK_TIMEOUT,
      onlineCheckMatchMode: input.onlineCheckMatchMode ?? DEFAULT_ONLINE_CHECK_MATCH_MODE,
      onlineCheckKeyword: input.onlineCheckKeyword ?? "",
      onlineCheckFailThreshold: input.onlineCheckFailThreshold ?? DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
      isPinned: input.isPinned ? 1 : 0,
      cardType: input.cardType ?? null,
      cardData: input.cardData ?? null,
      accessRules: input.accessRules ? JSON.stringify(input.accessRules) : null,
      recommendContext: input.recommendContext ?? "",
      aiRelationEnabled: (input.aiRelationEnabled ?? true) ? 1 : 0,
      allowLinkedByOthers: (input.allowLinkedByOthers ?? true) ? 1 : 0,
      relatedSitesEnabled: (input.relatedSitesEnabled ?? true) ? 1 : 0,
      recommendContextEnabled: (input.recommendContextEnabled ?? false) ? 1 : 0,
      updatedAt: now,
    });

    db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(input.id);

    for (const tagId of input.tagIds) {
      const preserved = existingMap.get(tagId);
      const nextOrder =
        preserved ??
        ((db
          .prepare(
            "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM site_tags WHERE tag_id = ?"
          )
          .get(tagId) as { maxOrder: number }).maxOrder +
          1);

      db.prepare(
        "INSERT INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)"
      ).run(input.id, tagId, nextOrder);
    }
  });

  transaction();

  return getSiteById(input.id);
}

export function deleteSite(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sites WHERE id = ?").run(id);
}

export function reorderSitesGlobal(siteIds: string[]): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    siteIds.forEach((siteId, index) => {
      db.prepare("UPDATE sites SET global_sort_order = ? WHERE id = ?").run(index, siteId);
    });
  });
  transaction();
}

export function reorderSitesInTag(tagId: string, siteIds: string[]): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    siteIds.forEach((siteId, index) => {
      db.prepare(
        "UPDATE site_tags SET sort_order = ? WHERE tag_id = ? AND site_id = ?"
      ).run(index, tagId, siteId);
    });
  });
  transaction();
}

/** 获取所有站点的 id 和 url（仅普通网站，排除社交卡片） */
export function getAllSiteUrls(): Array<{ id: string; url: string }> {
  const db = getDb();
  return db.prepare("SELECT id, url FROM sites WHERE card_type IS NULL").all() as Array<{ id: string; url: string }>;
}

/** 站点在线检测配置（用于批量检测时传递参数） */
export type SiteOnlineCheckConfig = {
  id: string;
  url: string;
  timeout: number;
  matchMode: OnlineCheckMatchMode;
  keyword: string;
};

/** 获取所有未跳过在线检测的站点及其检测配置 */
export function getOnlineCheckSites(): SiteOnlineCheckConfig[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT id, url, online_check_timeout, online_check_match_mode, online_check_keyword FROM sites WHERE skip_online_check = 0 AND card_type IS NULL"
  ).all() as Array<{
    id: string;
    url: string;
    online_check_timeout: number;
    online_check_match_mode: string;
    online_check_keyword: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    timeout: r.online_check_timeout || DEFAULT_ONLINE_CHECK_TIMEOUT,
    matchMode: (r.online_check_match_mode || "status") as OnlineCheckMatchMode,
    keyword: r.online_check_keyword || "",
  }));
}

export function updateSiteOnlineStatus(siteId: string, isOnline: boolean): void {
  const db = getDb();
  const now = new Date().toISOString();

  // 读取当前连续失败计数和阈值
  const row = db.prepare("SELECT online_check_fail_count, online_check_fail_threshold FROM sites WHERE id = ?").get(siteId) as
    { online_check_fail_count: number; online_check_fail_threshold: number } | undefined;

  const failCount = row?.online_check_fail_count ?? 0;
  const threshold = row?.online_check_fail_threshold || DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD;

  if (isOnline) {
    // 在线：重置失败计数
    db.prepare(
      "UPDATE sites SET is_online = 1, online_check_last_run = ?, online_check_fail_count = 0 WHERE id = ?"
    ).run(now, siteId);
  } else {
    // 离线：累加失败计数
    const newFailCount = failCount + 1;
    // 仅当连续失败达到阈值时才标记为离线
    const markOffline = newFailCount >= threshold;
    db.prepare(
      "UPDATE sites SET is_online = ?, online_check_last_run = ?, online_check_fail_count = ? WHERE id = ?"
    ).run(markOffline ? 0 : 1, now, newFailCount, siteId);
  }
}

export function updateSitesOnlineStatus(statusMap: Map<string, boolean>) {
  const db = getDb();

  const transaction = db.transaction(() => {
    for (const [id, isOnline] of statusMap) {
      // 批量检测复用单站点逻辑（内部处理时间戳和失败计数）
      updateSiteOnlineStatus(id, isOnline);
    }
  });

  transaction();
}

/** 获取指定用户的社交卡片数量 */
export function getSocialCardCount(ownerId?: string): number {
  const db = getDb();
  if (ownerId) {
    const row = db.prepare("SELECT COUNT(*) AS count FROM sites WHERE card_type IS NOT NULL AND owner_id = ?").get(ownerId) as { count: number };
    return row.count;
  }
  const row = db.prepare("SELECT COUNT(*) AS count FROM sites WHERE card_type IS NOT NULL").get() as { count: number };
  return row.count;
}

/** 获取指定用户的社交卡片站点 */
export function getSocialCardSites(ownerId?: string): Site[] {
  const db = getDb();
  const query = ownerId
    ? "SELECT * FROM sites WHERE card_type IS NOT NULL AND owner_id = ? ORDER BY global_sort_order ASC"
    : "SELECT * FROM sites WHERE card_type IS NOT NULL ORDER BY global_sort_order ASC";
  const rows = (ownerId ? db.prepare(query).all(ownerId) : db.prepare(query).all()) as SiteRow[];
  const tagsMap = getSiteTagsForIds(db, rows.map((r) => r.id));
  const relMap = getRelatedSitesForIds(rows.map((r) => r.id));
  return rows.map((row) => mapSiteRow(row, tagsMap.get(row.id) ?? [], relMap.get(row.id) ?? []));
}

/** 删除指定用户的所有普通网站卡片 */
export function deleteAllNormalSites(ownerId: string): void {
  const db = getDb();
  const ids = db.prepare("SELECT id FROM sites WHERE card_type IS NULL AND owner_id = ?").all(ownerId) as Array<{ id: string }>;
  const transaction = db.transaction(() => {
    for (const { id } of ids) {
      db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(id);
      db.prepare("DELETE FROM sites WHERE id = ?").run(id);
    }
  });
  transaction();
}

/** 删除指定用户的所有社交卡片 */
export function deleteAllSocialCardSites(ownerId: string): void {
  const db = getDb();
  const ids = db.prepare("SELECT id FROM sites WHERE card_type IS NOT NULL AND owner_id = ?").all(ownerId) as Array<{ id: string }>;
  const transaction = db.transaction(() => {
    for (const { id } of ids) {
      db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(id);
      db.prepare("DELETE FROM sites WHERE id = ?").run(id);
    }
  });
  transaction();
}

// ──────────────────────────────────────
// 数据归一化：兼容旧版 conditions 数组格式
// ──────────────────────────────────────

/**
 * 归一化访问规则数据（兼容旧版 conditions 数组 → 新版 condition 单值）
 * 旧版 AlternateUrl.conditions: AccessCondition[]
 * 新版 AlternateUrl.condition: AccessCondition | null
 */
function normalizeAccessRules(raw: Record<string, unknown>): AccessRules {
  const mode = (raw.mode === "auto" || raw.mode === "conditional") ? raw.mode as AccessRules["mode"] : "auto";
  const autoConfig = (raw.autoConfig ?? { revertOnRecovery: true }) as AccessRules["autoConfig"];
  const rawUrls = Array.isArray(raw.urls) ? raw.urls : [];
  const urls: AlternateUrl[] = rawUrls.map((u: Record<string, unknown>) => {
    let condition: AccessCondition | null = null;
    if (u.condition && typeof u.condition === "object" && ("type" in (u.condition as object))) {
      condition = u.condition as AccessCondition;
    } else if (Array.isArray(u.conditions) && u.conditions.length > 0) {
      // 旧版兼容：取第一个条件
      condition = u.conditions[0] as AccessCondition;
    }
    return {
      id: u.id as string,
      url: u.url as string,
      label: (u.label as string) ?? "",
      enabled: (u.enabled as boolean) ?? true,
      isOnline: (u.isOnline as boolean | null) ?? null,
      lastCheckTime: (u.lastCheckTime as string | null) ?? null,
      latency: (u.latency as number | null) ?? null,
      condition,
    };
  });
  return { mode, autoConfig, urls, enabled: raw.enabled === false ? false : true };
}
