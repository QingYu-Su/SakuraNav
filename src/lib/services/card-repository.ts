/**
 * @description 卡片数据仓库 - 管理所有卡片（网站卡片、社交卡片、笔记卡片）的增删改查和排序操作
 * @description 多用户版本：所有操作基于 owner_id 隔离数据空间
 */

import type { Card, CardTag, PaginatedCards, SocialCardType, CardType, OnlineCheckFrequency, OnlineCheckMatchMode, AccessRules, AlternateUrl, RelatedSiteItem, TodoItem } from "@/lib/base/types";
import { SOCIAL_TAG_ID, NOTE_TAG_ID, DEFAULT_ONLINE_CHECK_TIMEOUT, DEFAULT_ONLINE_CHECK_MATCH_MODE, DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD, DEFAULT_NOTES_AI_ENABLED, DEFAULT_TODOS_AI_ENABLED, DEFAULT_RECOMMEND_CONTEXT_ENABLED, DEFAULT_RECOMMEND_CONTEXT_AUTO_GEN } from "@/lib/base/types";
import { getDb } from "@/lib/database";
import { getCardTagsForIds } from "./tag-repository";
import { getRelatedCardsForIds } from "./card-relation-repository";
import { siteConfig } from "@/lib/config/config";
import { decodeCursor, encodeCursor } from "@/lib/utils/utils";

/** 卡片数据库行类型 */
type CardRow = {
  id: string;
  name: string;
  site_url: string;
  site_description: string | null;
  icon_url: string | null;
  icon_bg_color: string | null;
  site_is_online: number | null;
  site_skip_online_check: number;
  site_online_check_frequency: string;
  site_online_check_timeout: number;
  site_online_check_match_mode: string;
  site_online_check_keyword: string;
  site_online_check_fail_threshold: number;
  site_online_check_last_run: string | null;
  site_online_check_fail_count: number;
  site_offline_notify: number;
  site_access_rules: string | null;
  site_is_pinned: number;
  global_sort_order: number;
  card_type: string | null;
  card_data: string | null;
  owner_id: string;
  site_recommend_context: string | null;
  site_recommend_context_enabled: number | null;
  site_recommend_context_auto_gen: number | null;
  site_pending_context_gen: number | null;
  search_text: string | null;
  site_ai_relation_enabled: number | null;
  site_related_sites_enabled: number | null;
  site_notes: string | null;
  site_notes_ai_enabled: number | null;
  site_todos: string | null;
  site_todos_ai_enabled: number | null;
  social_hint: string | null;
  created_at: string;
  updated_at: string;
};

/** 安全解析 todos JSON */
function parseTodos(raw: string | null): TodoItem[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((item: Record<string, unknown>) =>
      typeof item.id === "string" && typeof item.text === "string" && typeof item.completed === "boolean"
    ) as TodoItem[];
  } catch {
    return [];
  }
}

function mapCardRow(row: CardRow, tags: CardTag[], relatedCards: RelatedSiteItem[]): Card {
  return {
    id: row.id,
    name: row.name,
    siteUrl: row.site_url,
    siteDescription: row.site_description,
    iconUrl: row.icon_url,
    iconBgColor: row.icon_bg_color,
    siteIsOnline: row.site_is_online == null ? null : Boolean(row.site_is_online),
    siteSkipOnlineCheck: Boolean(row.site_skip_online_check),
    siteOnlineCheckFrequency: (row.site_online_check_frequency || "1d") as OnlineCheckFrequency,
    siteOnlineCheckTimeout: row.site_online_check_timeout || DEFAULT_ONLINE_CHECK_TIMEOUT,
    siteOnlineCheckMatchMode: (row.site_online_check_match_mode || "status") as OnlineCheckMatchMode,
    siteOnlineCheckKeyword: row.site_online_check_keyword || "",
    siteOnlineCheckFailThreshold: row.site_online_check_fail_threshold || DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
    siteOnlineCheckLastRun: row.site_online_check_last_run,
    siteOnlineCheckFailCount: row.site_online_check_fail_count || 0,
    siteOfflineNotify: Boolean(row.site_offline_notify),
    siteAccessRules: row.site_access_rules ? normalizeAccessRules(JSON.parse(row.site_access_rules)) : null,
    siteIsPinned: Boolean(row.site_is_pinned),
    globalSortOrder: row.global_sort_order,
    cardType: row.card_type as (SocialCardType | "note") | null,
    cardData: row.card_data,
    siteRecommendContext: row.site_recommend_context ?? "",
    siteAiRelationEnabled: row.site_ai_relation_enabled ?? 1 ? true : false,
    siteRelatedSitesEnabled: row.site_related_sites_enabled == null ? true : Boolean(row.site_related_sites_enabled),
    siteRecommendContextEnabled: row.site_recommend_context_enabled == null ? false : Boolean(row.site_recommend_context_enabled),
    siteRecommendContextAutoGen: row.site_recommend_context_auto_gen == null ? true : Boolean(row.site_recommend_context_auto_gen),
    sitePendingContextGen: Boolean(row.site_pending_context_gen),
    siteNotes: row.site_notes ?? "",
    siteNotesAiEnabled: row.site_notes_ai_enabled == null ? true : Boolean(row.site_notes_ai_enabled),
    siteTodos: parseTodos(row.site_todos),
    siteTodosAiEnabled: row.site_todos_ai_enabled == null ? true : Boolean(row.site_todos_ai_enabled),
    socialHint: row.social_hint,
    siteRelatedSites: relatedCards,
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
  return { clause: `(c.search_text LIKE ?)`, params: [like] };
}

export async function getPaginatedCards(options: {
  ownerId: string;
  scope: "all" | "tag";
  tagId?: string | null;
  query?: string | null;
  cursor?: string | null;
  cardType?: "site" | null;
}): Promise<PaginatedCards> {
  const db = await getDb();
  const offset = decodeCursor(options.cursor ?? null);
  const search = options.query?.trim() ?? "";
  const searchClause = buildSearchClause(search);
  const pageSize = siteConfig.pageSize;

  const filters = ["c.owner_id = ?", searchClause.clause];
  const filterParams: Array<string | number> = [options.ownerId, ...searchClause.params];
  let orderBy = "c.site_is_pinned DESC, c.global_sort_order ASC, c.name COLLATE NOCASE ASC";
  let orderParams: Array<string | number> = [];

  // 按 cardType 过滤：site = 仅网站卡片（card_type 为空），不传则返回全部
  if (options.cardType === "site") {
    filters.unshift("(c.card_type IS NULL OR c.card_type = '')");
  }

  if (options.scope === "tag") {
    if (options.tagId === SOCIAL_TAG_ID) {
      filters.unshift("c.card_type IS NOT NULL AND c.card_type != 'note'");
    } else if (options.tagId === NOTE_TAG_ID) {
      filters.unshift("c.card_type = 'note'");
    } else {
      filters.unshift("EXISTS (SELECT 1 FROM card_tags filter_link WHERE filter_link.card_id = c.id AND filter_link.tag_id = ?)");
      filterParams.unshift(options.tagId ?? "");
      orderBy = `c.site_is_pinned DESC, (SELECT filter_order.sort_order FROM card_tags filter_order WHERE filter_order.card_id = c.id AND filter_order.tag_id = ?) ASC, c.name COLLATE NOCASE ASC`;
      orderParams = [options.tagId ?? ""];
    }
  }

  const whereClause = filters.join(" AND ");
  const totalRow = await db.queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM cards c WHERE ${whereClause}`, filterParams);
  const queryParams = [...filterParams, ...orderParams, pageSize, offset];
  const rows = await db.query<CardRow>(`SELECT c.* FROM cards c WHERE ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, queryParams);

  const tagsMap = await getCardTagsForIds(rows.map((row) => row.id));
  const relationsMap = await getRelatedCardsForIds(rows.map((row) => row.id));
  const items = rows.map((row) => mapCardRow(row, tagsMap.get(row.id) ?? [], relationsMap.get(row.id) ?? []));
  const nextOffset = offset + items.length;

  return { items, total: totalRow!.count, nextCursor: nextOffset < totalRow!.count ? encodeCursor(nextOffset) : null };
}

export async function getAllCardsForAdmin(ownerId?: string): Promise<Card[]> {
  const db = await getDb();
  const rows = ownerId
    ? await db.query<CardRow>("SELECT * FROM cards WHERE owner_id = ? ORDER BY site_is_pinned DESC, global_sort_order ASC, name COLLATE NOCASE ASC", [ownerId])
    : await db.query<CardRow>("SELECT * FROM cards ORDER BY site_is_pinned DESC, global_sort_order ASC, name COLLATE NOCASE ASC");
  const tagsMap = await getCardTagsForIds(rows.map((row) => row.id));
  const relationsMap = await getRelatedCardsForIds(rows.map((row) => row.id));
  return rows.map((row) => mapCardRow(row, tagsMap.get(row.id) ?? [], relationsMap.get(row.id) ?? []));
}

export async function getCardById(id: string): Promise<Card | null> {
  const db = await getDb();
  const row = await db.queryOne<CardRow>("SELECT * FROM cards WHERE id = ?", [id]);
  if (!row) return null;
  const tagsMap = await getCardTagsForIds([row.id]);
  const relationsMap = await getRelatedCardsForIds([row.id]);
  return mapCardRow(row, tagsMap.get(row.id) ?? [], relationsMap.get(row.id) ?? []);
}

export async function getCardOwnerId(id: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.queryOne<{ owner_id: string }>("SELECT owner_id FROM cards WHERE id = ?", [id]);
  return row?.owner_id ?? null;
}

export async function recomputeSearchText(cardId: string): Promise<void> {
  const db = await getDb();
  const row = await db.queryOne<{ name: string; site_description: string | null; site_notes: string | null; site_recommend_context: string | null; site_todos: string | null }>(
    "SELECT name, site_description, site_notes, site_recommend_context, site_todos FROM cards WHERE id = ?", [cardId]
  );
  if (!row) return;
  const tagRow = await db.queryOne<{ tagNames: string | null }>(
    "SELECT GROUP_CONCAT(t.name, ' ') AS tagNames FROM card_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.card_id = ?", [cardId]
  );
  let todoText = "";
  const todos = parseTodos(row.site_todos);
  if (todos.length) todoText = todos.map((t) => t.text).join(" ");
  const searchText = [row.name ?? "", row.site_description ?? "", row.site_notes ?? "", row.site_recommend_context ?? "", todoText, tagRow?.tagNames ?? ""].join(" ").trim();
  await db.execute("UPDATE cards SET search_text = @searchText WHERE id = @id", { searchText, id: cardId });
}

export async function createCard(input: {
  name: string; siteUrl: string; siteDescription?: string | null; iconUrl: string | null; iconBgColor?: string | null;
  siteIsPinned: boolean; siteSkipOnlineCheck?: boolean; siteOnlineCheckFrequency?: OnlineCheckFrequency; siteOnlineCheckTimeout?: number;
  siteOnlineCheckMatchMode?: OnlineCheckMatchMode; siteOnlineCheckKeyword?: string; siteOnlineCheckFailThreshold?: number;
  siteOfflineNotify?: boolean;
  tagIds: string[]; cardType?: CardType | null; cardData?: string | null; ownerId: string;
  siteAccessRules?: AccessRules | null; siteRecommendContext?: string; siteAiRelationEnabled?: boolean;
  siteRelatedSites?: Array<{ cardId: string; enabled: boolean; sortOrder: number }>;
  siteRelatedSitesEnabled?: boolean; siteRecommendContextEnabled?: boolean; siteRecommendContextAutoGen?: boolean;
  siteNotes?: string; siteNotesAiEnabled?: boolean; siteTodos?: TodoItem[]; siteTodosAiEnabled?: boolean;
  socialHint?: string | null;
}): Promise<Card | null> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = `card-${crypto.randomUUID()}`;
  const orderRow = await db.queryOne<{ maxOrder: number }>("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM cards WHERE owner_id = ?", [input.ownerId]);

  await db.transaction(async () => {
    await db.execute(
      `INSERT INTO cards (id, name, site_url, site_description, icon_url, icon_bg_color, site_skip_online_check, site_online_check_frequency,
        site_online_check_timeout, site_online_check_match_mode, site_online_check_keyword, site_online_check_fail_threshold, site_offline_notify,
        site_is_pinned, global_sort_order, card_type, card_data, site_access_rules, owner_id,
        site_recommend_context, site_ai_relation_enabled, site_related_sites_enabled,
        site_recommend_context_enabled, site_notes, site_notes_ai_enabled, site_todos, site_todos_ai_enabled, social_hint, created_at, updated_at
      ) VALUES (
        @id, @name, @siteUrl, @siteDescription, @iconUrl, @iconBgColor, @siteSkipOnlineCheck, @siteOnlineCheckFrequency,
        @siteOnlineCheckTimeout, @siteOnlineCheckMatchMode, @siteOnlineCheckKeyword, @siteOnlineCheckFailThreshold, @siteOfflineNotify,
        @siteIsPinned, @globalSortOrder, @cardType, @cardData, @siteAccessRules, @ownerId,
        @siteRecommendContext, @siteAiRelationEnabled, @siteRelatedSitesEnabled,
        @siteRecommendContextEnabled, @siteNotes, @siteNotesAiEnabled, @siteTodos, @siteTodosAiEnabled, @socialHint, @createdAt, @updatedAt
      )`,
      {
        id, name: input.name, siteUrl: input.siteUrl, siteDescription: input.siteDescription ?? null, iconUrl: input.iconUrl,
        iconBgColor: input.iconBgColor ?? null, siteSkipOnlineCheck: input.siteSkipOnlineCheck ? 1 : 0,
        siteOnlineCheckFrequency: input.siteOnlineCheckFrequency ?? "1d", siteOnlineCheckTimeout: input.siteOnlineCheckTimeout ?? DEFAULT_ONLINE_CHECK_TIMEOUT,
        siteOnlineCheckMatchMode: input.siteOnlineCheckMatchMode ?? DEFAULT_ONLINE_CHECK_MATCH_MODE, siteOnlineCheckKeyword: input.siteOnlineCheckKeyword ?? "",
        siteOnlineCheckFailThreshold: input.siteOnlineCheckFailThreshold ?? DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
        siteOfflineNotify: (input.siteOfflineNotify ?? true) ? 1 : 0,
        siteIsPinned: input.siteIsPinned ? 1 : 0, globalSortOrder: orderRow!.maxOrder + 1, cardType: input.cardType ?? null,
        cardData: input.cardData ?? null, siteAccessRules: input.siteAccessRules ? JSON.stringify(input.siteAccessRules) : null,
        ownerId: input.ownerId, siteRecommendContext: input.siteRecommendContext ?? "",
        siteAiRelationEnabled: (input.siteAiRelationEnabled ?? true) ? 1 : 0,
        siteRelatedSitesEnabled: (input.siteRelatedSitesEnabled ?? true) ? 1 : 0,
        siteRecommendContextEnabled: (input.siteRecommendContextEnabled ?? DEFAULT_RECOMMEND_CONTEXT_ENABLED) ? 1 : 0,
        siteRecommendContextAutoGen: (input.siteRecommendContextAutoGen ?? DEFAULT_RECOMMEND_CONTEXT_AUTO_GEN) ? 1 : 0,
        siteNotes: input.siteNotes ?? "", siteNotesAiEnabled: (input.siteNotesAiEnabled ?? DEFAULT_NOTES_AI_ENABLED) ? 1 : 0,
        siteTodos: JSON.stringify(input.siteTodos ?? []), siteTodosAiEnabled: (input.siteTodosAiEnabled ?? DEFAULT_TODOS_AI_ENABLED) ? 1 : 0,
        socialHint: input.socialHint ?? null,
        createdAt: now, updatedAt: now,
      }
    );
    for (const tagId of input.tagIds) {
      const currentOrder = await db.queryOne<{ maxOrder: number }>("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM card_tags WHERE tag_id = ?", [tagId]);
      await db.execute("INSERT INTO card_tags (card_id, tag_id, sort_order) VALUES (@cardId, @tagId, @sortOrder)", { cardId: id, tagId, sortOrder: currentOrder!.maxOrder + 1 });
    }
  });

  await recomputeSearchText(id);
  return getCardById(id);
}

export async function updateCard(input: {
  id: string; name: string; siteUrl: string; siteDescription?: string | null; iconUrl: string | null; iconBgColor?: string | null;
  siteIsPinned: boolean; siteSkipOnlineCheck?: boolean; siteOnlineCheckFrequency?: OnlineCheckFrequency; siteOnlineCheckTimeout?: number;
  siteOnlineCheckMatchMode?: OnlineCheckMatchMode; siteOnlineCheckKeyword?: string; siteOnlineCheckFailThreshold?: number;
  siteOfflineNotify?: boolean;
  tagIds: string[]; cardType?: CardType | null; cardData?: string | null; siteAccessRules?: AccessRules | null;
  siteRecommendContext?: string; siteAiRelationEnabled?: boolean;
  siteRelatedSites?: Array<{ cardId: string; enabled: boolean; sortOrder: number }>;
  siteRelatedSitesEnabled?: boolean; siteRecommendContextEnabled?: boolean; siteRecommendContextAutoGen?: boolean;
  siteNotes?: string; siteNotesAiEnabled?: boolean; siteTodos?: TodoItem[]; siteTodosAiEnabled?: boolean;
  socialHint?: string | null;
}): Promise<Card | null> {
  const db = await getDb();
  const now = new Date().toISOString();
  const existingTags = await db.query<{ tag_id: string; sort_order: number }>("SELECT tag_id, sort_order FROM card_tags WHERE card_id = ?", [input.id]);
  const existingMap = new Map(existingTags.map((row) => [row.tag_id, row.sort_order]));

  await db.transaction(async () => {
    await db.execute(
      `UPDATE cards SET name = @name, site_url = @siteUrl, site_description = @siteDescription, icon_url = @iconUrl, icon_bg_color = @iconBgColor,
        site_skip_online_check = @siteSkipOnlineCheck, site_online_check_frequency = @siteOnlineCheckFrequency, site_online_check_timeout = @siteOnlineCheckTimeout,
        site_online_check_match_mode = @siteOnlineCheckMatchMode, site_online_check_keyword = @siteOnlineCheckKeyword, site_online_check_fail_threshold = @siteOnlineCheckFailThreshold,
        site_offline_notify = @siteOfflineNotify,
        site_is_pinned = @siteIsPinned, card_type = @cardType, card_data = @cardData, site_access_rules = @siteAccessRules,
        site_recommend_context = @siteRecommendContext, site_ai_relation_enabled = @siteAiRelationEnabled,
        site_related_sites_enabled = @siteRelatedSitesEnabled, site_recommend_context_enabled = @siteRecommendContextEnabled,
        site_recommend_context_auto_gen = @siteRecommendContextAutoGen, site_notes = @siteNotes, site_notes_ai_enabled = @siteNotesAiEnabled,
        site_todos = @siteTodos, site_todos_ai_enabled = @siteTodosAiEnabled, social_hint = @socialHint, updated_at = @updatedAt WHERE id = @id`,
      {
        id: input.id, name: input.name, siteUrl: input.siteUrl, siteDescription: input.siteDescription ?? null,
        iconUrl: input.iconUrl, iconBgColor: input.iconBgColor ?? null, siteSkipOnlineCheck: input.siteSkipOnlineCheck ? 1 : 0,
        siteOnlineCheckFrequency: input.siteOnlineCheckFrequency ?? "1d", siteOnlineCheckTimeout: input.siteOnlineCheckTimeout ?? DEFAULT_ONLINE_CHECK_TIMEOUT,
        siteOnlineCheckMatchMode: input.siteOnlineCheckMatchMode ?? DEFAULT_ONLINE_CHECK_MATCH_MODE, siteOnlineCheckKeyword: input.siteOnlineCheckKeyword ?? "",
        siteOnlineCheckFailThreshold: input.siteOnlineCheckFailThreshold ?? DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
        siteOfflineNotify: (input.siteOfflineNotify ?? true) ? 1 : 0,
        siteIsPinned: input.siteIsPinned ? 1 : 0, cardType: input.cardType ?? null, cardData: input.cardData ?? null,
        siteAccessRules: input.siteAccessRules ? JSON.stringify(input.siteAccessRules) : null, siteRecommendContext: input.siteRecommendContext ?? "",
        siteAiRelationEnabled: (input.siteAiRelationEnabled ?? true) ? 1 : 0,
        siteRelatedSitesEnabled: (input.siteRelatedSitesEnabled ?? true) ? 1 : 0,
        siteRecommendContextEnabled: (input.siteRecommendContextEnabled ?? DEFAULT_RECOMMEND_CONTEXT_ENABLED) ? 1 : 0,
        siteRecommendContextAutoGen: (input.siteRecommendContextAutoGen ?? DEFAULT_RECOMMEND_CONTEXT_AUTO_GEN) ? 1 : 0,
        siteNotes: input.siteNotes ?? "", siteNotesAiEnabled: (input.siteNotesAiEnabled ?? DEFAULT_NOTES_AI_ENABLED) ? 1 : 0,
        siteTodos: JSON.stringify(input.siteTodos ?? []), siteTodosAiEnabled: (input.siteTodosAiEnabled ?? DEFAULT_TODOS_AI_ENABLED) ? 1 : 0,
        socialHint: input.socialHint ?? null, updatedAt: now,
      }
    );
    await db.execute("DELETE FROM card_tags WHERE card_id = ?", [input.id]);
    for (const tagId of input.tagIds) {
      const preserved = existingMap.get(tagId);
      const nextOrder = preserved ?? ((await db.queryOne<{ maxOrder: number }>("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM card_tags WHERE tag_id = ?", [tagId]))!.maxOrder + 1);
      await db.execute("INSERT INTO card_tags (card_id, tag_id, sort_order) VALUES (?, ?, ?)", [input.id, tagId, nextOrder]);
    }
  });

  await recomputeSearchText(input.id);
  return getCardById(input.id);
}

export async function updateCardRecommendContext(id: string, context: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE cards SET site_recommend_context = @context, updated_at = @updatedAt WHERE id = @id", { context, updatedAt: new Date().toISOString(), id });
  await recomputeSearchText(id);
}

export async function updateCardMemo(id: string, data: { siteNotes?: string; siteNotesAiEnabled?: boolean; siteTodos?: TodoItem[]; siteTodosAiEnabled?: boolean }): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const params: Record<string, string | number> = { id };
  if (data.siteNotes !== undefined) { sets.push("site_notes = @siteNotes"); params.siteNotes = data.siteNotes; }
  if (data.siteNotesAiEnabled !== undefined) { sets.push("site_notes_ai_enabled = @siteNotesAiEnabled"); params.siteNotesAiEnabled = data.siteNotesAiEnabled ? 1 : 0; }
  if (data.siteTodos !== undefined) { sets.push("site_todos = @siteTodos"); params.siteTodos = JSON.stringify(data.siteTodos); }
  if (data.siteTodosAiEnabled !== undefined) { sets.push("site_todos_ai_enabled = @siteTodosAiEnabled"); params.siteTodosAiEnabled = data.siteTodosAiEnabled ? 1 : 0; }
  if (sets.length === 0) return;
  await db.execute(`UPDATE cards SET ${sets.join(", ")}, updated_at = @updatedAt WHERE id = @id`, { ...params, updatedAt: new Date().toISOString() });
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM cards WHERE id = ?", [id]);
}

export async function reorderCardsGlobal(cardIds: string[]): Promise<void> {
  const db = await getDb();
  await db.transaction(async () => {
    for (let i = 0; i < cardIds.length; i++) {
      await db.execute("UPDATE cards SET global_sort_order = ? WHERE id = ?", [i, cardIds[i]]);
    }
  });
}

export async function reorderCardsInTag(tagId: string, cardIds: string[]): Promise<void> {
  const db = await getDb();
  await db.transaction(async () => {
    for (let i = 0; i < cardIds.length; i++) {
      await db.execute("UPDATE card_tags SET sort_order = ? WHERE tag_id = ? AND card_id = ?", [i, tagId, cardIds[i]]);
    }
  });
}

export async function getAllSiteCardUrls(ownerId?: string): Promise<Array<{ id: string; site_url: string }>> {
  const db = await getDb();
  return ownerId ? db.query("SELECT id, site_url FROM cards WHERE card_type IS NULL AND owner_id = ?", [ownerId]) : db.query("SELECT id, site_url FROM cards WHERE card_type IS NULL");
}

export type CardOnlineCheckConfig = { id: string; siteUrl: string; ownerId: string; siteOfflineNotify: boolean; cardName: string; cardUrl: string };

export async function getOnlineCheckSiteCards(): Promise<CardOnlineCheckConfig[]> {
  const db = await getDb();
  const rows = await db.query<{ id: string; site_url: string; owner_id: string; site_offline_notify: number; name: string }>(
    "SELECT id, site_url, owner_id, site_offline_notify, name FROM cards WHERE site_skip_online_check = 0 AND card_type IS NULL"
  );
  return rows.map((r) => ({ id: r.id, siteUrl: r.site_url, ownerId: r.owner_id, siteOfflineNotify: r.site_offline_notify === 1, cardName: r.name, cardUrl: r.site_url }));
}

/** updateCardOnlineStatus 的返回结果 */
export type OnlineStatusChange = {
  /** 是否刚刚从在线变为离线 */
  wentOffline: boolean;
  /** 卡片名称 */
  cardName: string;
  /** 卡片 URL */
  cardUrl: string;
  /** 卡片所有者 ID */
  ownerId: string;
};

/**
 * 更新单个卡片的在线状态（直接设置，无渐进式失败计数）
 * @returns 离线通知信息（仅当从在线变为离线且启用了通知时返回）
 */
export async function updateCardOnlineStatus(cardId: string, isOnline: boolean): Promise<OnlineStatusChange | null> {
  const db = await getDb();
  const now = new Date().toISOString();
  const row = await db.queryOne<{ site_is_online: number | null; site_offline_notify: number; name: string; site_url: string; owner_id: string }>(
    "SELECT site_is_online, site_offline_notify, name, site_url, owner_id FROM cards WHERE id = ?", [cardId]
  );
  if (!row) return null;
  const wasOnline = row.site_is_online === 1;

  if (isOnline) {
    await db.execute("UPDATE cards SET site_is_online = 1, site_online_check_last_run = ?, site_online_check_fail_count = 0 WHERE id = ?", [now, cardId]);
  } else {
    await db.execute("UPDATE cards SET site_is_online = 0, site_online_check_last_run = ? WHERE id = ?", [now, cardId]);
    if (wasOnline && row.site_offline_notify === 1) {
      return { wentOffline: true, cardName: row.name, cardUrl: row.site_url, ownerId: row.owner_id };
    }
  }
  return null;
}

export async function updateCardsOnlineStatus(statusMap: Map<string, boolean>): Promise<OnlineStatusChange[]> {
  const db = await getDb();
  const changes: OnlineStatusChange[] = [];
  await db.transaction(async () => {
    for (const [id, isOnline] of statusMap) {
      const change = await updateCardOnlineStatus(id, isOnline);
      if (change) changes.push(change);
    }
  });
  return changes;
}

export async function getSocialCardCount(ownerId?: string): Promise<number> {
  const db = await getDb();
  const row = ownerId
    ? await db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM cards WHERE card_type IS NOT NULL AND card_type != 'note' AND owner_id = ?", [ownerId])
    : await db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM cards WHERE card_type IS NOT NULL AND card_type != 'note'");
  return row!.count;
}

export async function getSocialCards(ownerId?: string): Promise<Card[]> {
  const db = await getDb();
  const query = ownerId
    ? "SELECT * FROM cards WHERE card_type IS NOT NULL AND card_type != 'note' AND owner_id = ? ORDER BY global_sort_order ASC"
    : "SELECT * FROM cards WHERE card_type IS NOT NULL AND card_type != 'note' ORDER BY global_sort_order ASC";
  const rows = ownerId ? await db.query<CardRow>(query, [ownerId]) : await db.query<CardRow>(query);
  const tagsMap = await getCardTagsForIds(rows.map((r) => r.id));
  const relMap = await getRelatedCardsForIds(rows.map((r) => r.id));
  return rows.map((row) => mapCardRow(row, tagsMap.get(row.id) ?? [], relMap.get(row.id) ?? []));
}

export async function deleteAllSiteCards(ownerId: string): Promise<void> {
  const db = await getDb();
  const ids = await db.query<{ id: string }>("SELECT id FROM cards WHERE card_type IS NULL AND owner_id = ?", [ownerId]);
  await db.transaction(async () => {
    for (const { id } of ids) {
      await db.execute("DELETE FROM card_tags WHERE card_id = ?", [id]);
      await db.execute("DELETE FROM cards WHERE id = ?", [id]);
    }
  });
}

export async function deleteAllSocialCards(ownerId: string): Promise<void> {
  const db = await getDb();
  const ids = await db.query<{ id: string }>("SELECT id FROM cards WHERE card_type IS NOT NULL AND card_type != 'note' AND owner_id = ?", [ownerId]);
  await db.transaction(async () => {
    for (const { id } of ids) {
      await db.execute("DELETE FROM card_tags WHERE card_id = ?", [id]);
      await db.execute("DELETE FROM cards WHERE id = ?", [id]);
    }
  });
}

export async function getNoteCardCount(ownerId?: string): Promise<number> {
  const db = await getDb();
  const row = ownerId
    ? await db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM cards WHERE card_type = 'note' AND owner_id = ?", [ownerId])
    : await db.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM cards WHERE card_type = 'note'");
  return row!.count;
}

export async function getAllSiteCardTodos(): Promise<Array<{ id: string; site_todos: string | null }>> {
  const db = await getDb();
  return db.query("SELECT id, site_todos FROM cards WHERE card_type IS NULL OR card_type = ''");
}

export async function getNoteCards(ownerId?: string): Promise<Card[]> {
  const db = await getDb();
  const rows = ownerId
    ? await db.query<CardRow>("SELECT * FROM cards WHERE card_type = 'note' AND owner_id = ? ORDER BY global_sort_order ASC", [ownerId])
    : await db.query<CardRow>("SELECT * FROM cards WHERE card_type = 'note' ORDER BY global_sort_order ASC");
  const tagsMap = await getCardTagsForIds(rows.map((row) => row.id));
  const relationsMap = await getRelatedCardsForIds(rows.map((row) => row.id));
  return rows.map((row) => mapCardRow(row, tagsMap.get(row.id) ?? [], relationsMap.get(row.id) ?? []));
}

export async function deleteAllNoteCards(ownerId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM cards WHERE card_type = 'note' AND owner_id = ?", [ownerId]);
}

function normalizeAccessRules(raw: Record<string, unknown>): AccessRules {
  const rawUrls = Array.isArray(raw.urls) ? raw.urls : [];
  const urls: AlternateUrl[] = rawUrls.map((u: Record<string, unknown>) => ({
    id: u.id as string, url: u.url as string, label: (u.label as string) ?? "",
  }));
  return { urls };
}
