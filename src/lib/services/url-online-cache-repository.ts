/**
 * URL 在线状态缓存仓库
 * @description 管理 URL → 在线/离线状态的缓存，支持 20 小时内免重复检查
 * 缓存以 URL 为主键，同一 URL 的多个站点卡片共享检查结果
 */

import { getDb } from "@/lib/database";

/**
 * 查询单个 URL 的缓存状态（仅返回 20 小时内的新鲜结果）
 * @returns `true`=在线 / `false`=离线 / `null`=无缓存或已过期
 */
export async function getUrlOnlineStatusIfFresh(url: string): Promise<boolean | null> {
  const db = await getDb();
  const row = await db.queryOne<{ is_online: number }>(
    "SELECT is_online FROM url_online_cache WHERE url = ? AND datetime(last_checked_at) >= datetime('now', '-20 hours')",
    [url],
  );
  return row ? Boolean(row.is_online) : null;
}

/**
 * 批量查询 URL 的缓存状态（仅返回 20 小时内的新鲜结果）
 */
export async function getUrlsOnlineStatusBatch(urls: string[]): Promise<Map<string, boolean>> {
  if (urls.length === 0) return new Map();
  const db = await getDb();
  const placeholders = urls.map(() => "?").join(",");
  const rows = await db.query<{ url: string; is_online: number }>(
    `SELECT url, is_online FROM url_online_cache WHERE url IN (${placeholders}) AND datetime(last_checked_at) >= datetime('now', '-20 hours')`,
    urls,
  );
  const map = new Map<string, boolean>();
  for (const row of rows) {
    map.set(row.url, Boolean(row.is_online));
  }
  return map;
}

/**
 * 更新或插入单个 URL 的缓存
 */
export async function upsertUrlOnlineCache(url: string, isOnline: boolean): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute(
    "INSERT OR REPLACE INTO url_online_cache (url, is_online, last_checked_at) VALUES (@url, @isOnline, @now)",
    { url, isOnline: isOnline ? 1 : 0, now },
  );
}

/**
 * 批量更新或插入 URL 缓存
 */
export async function upsertUrlOnlineCacheBatch(results: Map<string, boolean>): Promise<void> {
  if (results.size === 0) return;
  const db = await getDb();
  const now = new Date().toISOString();
  await db.transaction(async () => {
    for (const [url, isOnline] of results) {
      await db.execute(
        "INSERT OR REPLACE INTO url_online_cache (url, is_online, last_checked_at) VALUES (@url, @isOnline, @now)",
        { url, isOnline: isOnline ? 1 : 0, now },
      );
    }
  });
}

/**
 * 清除不再被任何站点卡片引用的 URL 缓存
 * @returns 删除的行数
 */
export async function cleanOrphanUrlCache(): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "DELETE FROM url_online_cache WHERE url NOT IN (SELECT DISTINCT url FROM cards WHERE card_type IS NULL)",
  );
  return result.changes;
}

/**
 * 将 URL 缓存应用到所有站点（设置 is_online 字段）
 * @returns 更新的行数
 */
export async function applyUrlCacheToCards(): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "UPDATE cards SET site_is_online = (SELECT c.is_online FROM url_online_cache c WHERE c.url = cards.site_url) WHERE card_type IS NULL AND EXISTS (SELECT 1 FROM url_online_cache c WHERE c.url = cards.site_url)",
  );
  return result.changes;
}
