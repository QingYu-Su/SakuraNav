/**
 * @description 卡片数据仓库 - 管理所有卡片（网站卡片、社交卡片、笔记卡片）的增删改查和排序操作
 * @description 多用户版本：所有操作基于 owner_id 隔离数据空间
 */

import type { Card, CardTag, PaginatedCards, SocialCardType, CardType, OnlineCheckFrequency, OnlineCheckMatchMode, AccessRules, AlternateUrl, RelatedCardItem, TodoItem } from "@/lib/base/types";
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
  offline_notify: number;
  access_rules: string | null;
  is_pinned: number;
  global_sort_order: number;
  card_type: string | null;
  card_data: string | null;
  owner_id: string;
  recommend_context: string | null;
  recommend_context_enabled: number | null;
  recommend_context_auto_gen: number | null;
  pending_context_gen: number | null;
  search_text: string | null;
  ai_relation_enabled: number | null;
  related_sites_enabled: number | null;
  notes: string | null;
  notes_ai_enabled: number | null;
  todos: string | null;
  todos_ai_enabled: number | null;
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

function mapCardRow(row: CardRow, tags: CardTag[], relatedCards: RelatedCardItem[]): Card {
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
    offlineNotify: Boolean(row.offline_notify),
    accessRules: row.access_rules ? normalizeAccessRules(JSON.parse(row.access_rules)) : null,
    isPinned: Boolean(row.is_pinned),
    globalSortOrder: row.global_sort_order,
    cardType: row.card_type as (SocialCardType | "note") | null,
    cardData: row.card_data,
    recommendContext: row.recommend_context ?? "",
    aiRelationEnabled: row.ai_relation_enabled ?? 1 ? true : false,
    relatedCardsEnabled: row.related_sites_enabled == null ? true : Boolean(row.related_sites_enabled),
    recommendContextEnabled: row.recommend_context_enabled == null ? false : Boolean(row.recommend_context_enabled),
    recommendContextAutoGen: row.recommend_context_auto_gen == null ? true : Boolean(row.recommend_context_auto_gen),
    pendingContextGen: Boolean(row.pending_context_gen),
    notes: row.notes ?? "",
    notesAiEnabled: row.notes_ai_enabled == null ? true : Boolean(row.notes_ai_enabled),
    todos: parseTodos(row.todos),
    todosAiEnabled: row.todos_ai_enabled == null ? true : Boolean(row.todos_ai_enabled),
    relatedCards,
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
}): Promise<PaginatedCards> {
  const db = await getDb();
  const offset = decodeCursor(options.cursor ?? null);
  const search = options.query?.trim() ?? "";
  const searchClause = buildSearchClause(search);
  const pageSize = siteConfig.pageSize;

  const filters = ["c.owner_id = ?", searchClause.clause];
  const filterParams: Array<string | number> = [options.ownerId, ...searchClause.params];
  let orderBy = "c.is_pinned DESC, c.global_sort_order ASC, c.name COLLATE NOCASE ASC";
  let orderParams: Array<string | number> = [];

  if (options.scope === "tag") {
    if (options.tagId === SOCIAL_TAG_ID) {
      filters.unshift("c.card_type IS NOT NULL AND c.card_type != 'note'");
    } else if (options.tagId === NOTE_TAG_ID) {
      filters.unshift("c.card_type = 'note'");
    } else {
      filters.unshift("EXISTS (SELECT 1 FROM card_tags filter_link WHERE filter_link.card_id = c.id AND filter_link.tag_id = ?)");
      filterParams.unshift(options.tagId ?? "");
      orderBy = `c.is_pinned DESC, (SELECT filter_order.sort_order FROM card_tags filter_order WHERE filter_order.card_id = c.id AND filter_order.tag_id = ?) ASC, c.name COLLATE NOCASE ASC`;
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
    ? await db.query<CardRow>("SELECT * FROM cards WHERE owner_id = ? ORDER BY is_pinned DESC, global_sort_order ASC, name COLLATE NOCASE ASC", [ownerId])
    : await db.query<CardRow>("SELECT * FROM cards ORDER BY is_pinned DESC, global_sort_order ASC, name COLLATE NOCASE ASC");
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
  const row = await db.queryOne<{ name: string; description: string | null; notes: string | null; recommend_context: string | null; todos: string | null }>(
    "SELECT name, description, notes, recommend_context, todos FROM cards WHERE id = ?", [cardId]
  );
  if (!row) return;
  const tagRow = await db.queryOne<{ tagNames: string | null }>(
    "SELECT GROUP_CONCAT(t.name, ' ') AS tagNames FROM card_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.card_id = ?", [cardId]
  );
  let todoText = "";
  const todos = parseTodos(row.todos);
  if (todos.length) todoText = todos.map((t) => t.text).join(" ");
  const searchText = [row.name ?? "", row.description ?? "", row.notes ?? "", row.recommend_context ?? "", todoText, tagRow?.tagNames ?? ""].join(" ").trim();
  await db.execute("UPDATE cards SET search_text = @searchText WHERE id = @id", { searchText, id: cardId });
}

export async function createCard(input: {
  name: string; url: string; description?: string | null; iconUrl: string | null; iconBgColor?: string | null;
  isPinned: boolean; skipOnlineCheck?: boolean; onlineCheckFrequency?: OnlineCheckFrequency; onlineCheckTimeout?: number;
  onlineCheckMatchMode?: OnlineCheckMatchMode; onlineCheckKeyword?: string; onlineCheckFailThreshold?: number;
  offlineNotify?: boolean;
  tagIds: string[]; cardType?: CardType | null; cardData?: string | null; ownerId: string;
  accessRules?: AccessRules | null; recommendContext?: string; aiRelationEnabled?: boolean;
  relatedCards?: Array<{ cardId: string; enabled: boolean; sortOrder: number }>;
  relatedCardsEnabled?: boolean; recommendContextEnabled?: boolean; recommendContextAutoGen?: boolean;
  notes?: string; notesAiEnabled?: boolean; todos?: TodoItem[]; todosAiEnabled?: boolean;
}): Promise<Card | null> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = `card-${crypto.randomUUID()}`;
  const orderRow = await db.queryOne<{ maxOrder: number }>("SELECT COALESCE(MAX(global_sort_order), -1) AS maxOrder FROM cards WHERE owner_id = ?", [input.ownerId]);

  await db.transaction(async () => {
    await db.execute(
      `INSERT INTO cards (id, name, url, description, icon_url, icon_bg_color, skip_online_check, online_check_frequency,
        online_check_timeout, online_check_match_mode, online_check_keyword, online_check_fail_threshold, offline_notify,
        is_pinned, global_sort_order, card_type, card_data, access_rules, owner_id,
        recommend_context, ai_relation_enabled, related_sites_enabled,
        recommend_context_enabled, notes, notes_ai_enabled, todos, todos_ai_enabled, created_at, updated_at
      ) VALUES (
        @id, @name, @url, @description, @iconUrl, @iconBgColor, @skipOnlineCheck, @onlineCheckFrequency,
        @onlineCheckTimeout, @onlineCheckMatchMode, @onlineCheckKeyword, @onlineCheckFailThreshold, @offlineNotify,
        @isPinned, @globalSortOrder, @cardType, @cardData, @accessRules, @ownerId,
        @recommendContext, @aiRelationEnabled, @relatedCardsEnabled,
        @recommendContextEnabled, @notes, @notesAiEnabled, @todos, @todosAiEnabled, @createdAt, @updatedAt
      )`,
      {
        id, name: input.name, url: input.url, description: input.description ?? null, iconUrl: input.iconUrl,
        iconBgColor: input.iconBgColor ?? null, skipOnlineCheck: input.skipOnlineCheck ? 1 : 0,
        onlineCheckFrequency: input.onlineCheckFrequency ?? "1d", onlineCheckTimeout: input.onlineCheckTimeout ?? DEFAULT_ONLINE_CHECK_TIMEOUT,
        onlineCheckMatchMode: input.onlineCheckMatchMode ?? DEFAULT_ONLINE_CHECK_MATCH_MODE, onlineCheckKeyword: input.onlineCheckKeyword ?? "",
        onlineCheckFailThreshold: input.onlineCheckFailThreshold ?? DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
        offlineNotify: (input.offlineNotify ?? true) ? 1 : 0,
        isPinned: input.isPinned ? 1 : 0, globalSortOrder: orderRow!.maxOrder + 1, cardType: input.cardType ?? null,
        cardData: input.cardData ?? null, accessRules: input.accessRules ? JSON.stringify(input.accessRules) : null,
        ownerId: input.ownerId, recommendContext: input.recommendContext ?? "",
        aiRelationEnabled: (input.aiRelationEnabled ?? true) ? 1 : 0,
        relatedCardsEnabled: (input.relatedCardsEnabled ?? true) ? 1 : 0,
        recommendContextEnabled: (input.recommendContextEnabled ?? DEFAULT_RECOMMEND_CONTEXT_ENABLED) ? 1 : 0,
        recommendContextAutoGen: (input.recommendContextAutoGen ?? DEFAULT_RECOMMEND_CONTEXT_AUTO_GEN) ? 1 : 0,
        notes: input.notes ?? "", notesAiEnabled: (input.notesAiEnabled ?? DEFAULT_NOTES_AI_ENABLED) ? 1 : 0,
        todos: JSON.stringify(input.todos ?? []), todosAiEnabled: (input.todosAiEnabled ?? DEFAULT_TODOS_AI_ENABLED) ? 1 : 0,
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
  id: string; name: string; url: string; description?: string | null; iconUrl: string | null; iconBgColor?: string | null;
  isPinned: boolean; skipOnlineCheck?: boolean; onlineCheckFrequency?: OnlineCheckFrequency; onlineCheckTimeout?: number;
  onlineCheckMatchMode?: OnlineCheckMatchMode; onlineCheckKeyword?: string; onlineCheckFailThreshold?: number;
  offlineNotify?: boolean;
  tagIds: string[]; cardType?: CardType | null; cardData?: string | null; accessRules?: AccessRules | null;
  recommendContext?: string; aiRelationEnabled?: boolean;
  relatedCards?: Array<{ cardId: string; enabled: boolean; sortOrder: number }>;
  relatedCardsEnabled?: boolean; recommendContextEnabled?: boolean; recommendContextAutoGen?: boolean;
  notes?: string; notesAiEnabled?: boolean; todos?: TodoItem[]; todosAiEnabled?: boolean;
}): Promise<Card | null> {
  const db = await getDb();
  const now = new Date().toISOString();
  const existingTags = await db.query<{ tag_id: string; sort_order: number }>("SELECT tag_id, sort_order FROM card_tags WHERE card_id = ?", [input.id]);
  const existingMap = new Map(existingTags.map((row) => [row.tag_id, row.sort_order]));

  await db.transaction(async () => {
    await db.execute(
      `UPDATE cards SET name = @name, url = @url, description = @description, icon_url = @iconUrl, icon_bg_color = @iconBgColor,
        skip_online_check = @skipOnlineCheck, online_check_frequency = @onlineCheckFrequency, online_check_timeout = @onlineCheckTimeout,
        online_check_match_mode = @onlineCheckMatchMode, online_check_keyword = @onlineCheckKeyword, online_check_fail_threshold = @onlineCheckFailThreshold,
        offline_notify = @offlineNotify,
        is_pinned = @isPinned, card_type = @cardType, card_data = @cardData, access_rules = @accessRules,
        recommend_context = @recommendContext, ai_relation_enabled = @aiRelationEnabled,
        related_sites_enabled = @relatedCardsEnabled, recommend_context_enabled = @recommendContextEnabled,
        recommend_context_auto_gen = @recommendContextAutoGen, notes = @notes, notes_ai_enabled = @notesAiEnabled,
        todos = @todos, todos_ai_enabled = @todosAiEnabled, updated_at = @updatedAt WHERE id = @id`,
      {
        id: input.id, name: input.name, url: input.url, description: input.description ?? null,
        iconUrl: input.iconUrl, iconBgColor: input.iconBgColor ?? null, skipOnlineCheck: input.skipOnlineCheck ? 1 : 0,
        onlineCheckFrequency: input.onlineCheckFrequency ?? "1d", onlineCheckTimeout: input.onlineCheckTimeout ?? DEFAULT_ONLINE_CHECK_TIMEOUT,
        onlineCheckMatchMode: input.onlineCheckMatchMode ?? DEFAULT_ONLINE_CHECK_MATCH_MODE, onlineCheckKeyword: input.onlineCheckKeyword ?? "",
        onlineCheckFailThreshold: input.onlineCheckFailThreshold ?? DEFAULT_ONLINE_CHECK_FAIL_THRESHOLD,
        offlineNotify: (input.offlineNotify ?? true) ? 1 : 0,
        isPinned: input.isPinned ? 1 : 0, cardType: input.cardType ?? null, cardData: input.cardData ?? null,
        accessRules: input.accessRules ? JSON.stringify(input.accessRules) : null, recommendContext: input.recommendContext ?? "",
        aiRelationEnabled: (input.aiRelationEnabled ?? true) ? 1 : 0,
        relatedCardsEnabled: (input.relatedCardsEnabled ?? true) ? 1 : 0,
        recommendContextEnabled: (input.recommendContextEnabled ?? DEFAULT_RECOMMEND_CONTEXT_ENABLED) ? 1 : 0,
        recommendContextAutoGen: (input.recommendContextAutoGen ?? DEFAULT_RECOMMEND_CONTEXT_AUTO_GEN) ? 1 : 0,
        notes: input.notes ?? "", notesAiEnabled: (input.notesAiEnabled ?? DEFAULT_NOTES_AI_ENABLED) ? 1 : 0,
        todos: JSON.stringify(input.todos ?? []), todosAiEnabled: (input.todosAiEnabled ?? DEFAULT_TODOS_AI_ENABLED) ? 1 : 0, updatedAt: now,
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
  await db.execute("UPDATE cards SET recommend_context = @context, updated_at = @updatedAt WHERE id = @id", { context, updatedAt: new Date().toISOString(), id });
  await recomputeSearchText(id);
}

export async function updateCardMemo(id: string, data: { notes?: string; notesAiEnabled?: boolean; todos?: TodoItem[]; todosAiEnabled?: boolean }): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const params: Record<string, string | number> = { id };
  if (data.notes !== undefined) { sets.push("notes = @notes"); params.notes = data.notes; }
  if (data.notesAiEnabled !== undefined) { sets.push("notes_ai_enabled = @notesAiEnabled"); params.notesAiEnabled = data.notesAiEnabled ? 1 : 0; }
  if (data.todos !== undefined) { sets.push("todos = @todos"); params.todos = JSON.stringify(data.todos); }
  if (data.todosAiEnabled !== undefined) { sets.push("todos_ai_enabled = @todosAiEnabled"); params.todosAiEnabled = data.todosAiEnabled ? 1 : 0; }
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

export async function getAllSiteCardUrls(ownerId?: string): Promise<Array<{ id: string; url: string }>> {
  const db = await getDb();
  return ownerId ? db.query("SELECT id, url FROM cards WHERE card_type IS NULL AND owner_id = ?", [ownerId]) : db.query("SELECT id, url FROM cards WHERE card_type IS NULL");
}

export type CardOnlineCheckConfig = { id: string; url: string; ownerId: string; offlineNotify: boolean; cardName: string; cardUrl: string };

export async function getOnlineCheckSiteCards(): Promise<CardOnlineCheckConfig[]> {
  const db = await getDb();
  const rows = await db.query<{ id: string; url: string; owner_id: string; offline_notify: number; name: string }>(
    "SELECT id, url, owner_id, offline_notify, name FROM cards WHERE skip_online_check = 0 AND card_type IS NULL"
  );
  return rows.map((r) => ({ id: r.id, url: r.url, ownerId: r.owner_id, offlineNotify: r.offline_notify === 1, cardName: r.name, cardUrl: r.url }));
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
  const row = await db.queryOne<{ is_online: number | null; offline_notify: number; name: string; url: string; owner_id: string }>(
    "SELECT is_online, offline_notify, name, url, owner_id FROM cards WHERE id = ?", [cardId]
  );
  if (!row) return null;
  const wasOnline = row.is_online === 1;

  if (isOnline) {
    await db.execute("UPDATE cards SET is_online = 1, online_check_last_run = ?, online_check_fail_count = 0 WHERE id = ?", [now, cardId]);
  } else {
    await db.execute("UPDATE cards SET is_online = 0, online_check_last_run = ? WHERE id = ?", [now, cardId]);
    if (wasOnline && row.offline_notify === 1) {
      return { wentOffline: true, cardName: row.name, cardUrl: row.url, ownerId: row.owner_id };
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

export async function getAllSiteCardTodos(): Promise<Array<{ id: string; todos: string | null }>> {
  const db = await getDb();
  return db.query("SELECT id, todos FROM cards WHERE card_type IS NULL OR card_type = ''");
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
