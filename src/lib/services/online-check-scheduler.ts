/**
 * 在线检测定时调度器
 * @description 每天 4:00 AM 自动执行批量在线检测，含多轮重试机制
 * 重试间隔：5分钟 → 10分钟 → 30分钟（共4轮）
 * 使用 url_online_cache 表管理检查间隔和缓存
 */

import { checkSiteOnline } from "@/lib/utils/online-check-util";
import { updateCardsOnlineStatus, sendNotificationToUser, getAppSettings, cleanOrphanUrlCache, upsertUrlOnlineCacheBatch } from "@/lib/services";
import type { OnlineStatusChange } from "@/lib/services";
import { createLogger } from "@/lib/base/logger";
import { getDb } from "@/lib/database";

const logger = createLogger("Scheduler:OnlineCheck");

/** 定时检查的小时（4 AM） */
const CHECK_HOUR = 4;

/** 重试间隔（毫秒）：第1轮失败后等5分钟、第2轮失败后等10分钟、第3轮失败后等30分钟 */
const RETRY_DELAYS = [
  5 * 60 * 1000,   // 5分钟
  10 * 60 * 1000,  // 10分钟
  30 * 60 * 1000,  // 30分钟
];

/** 最大轮次（初始1轮 + 3轮重试 = 共4轮） */
const MAX_ROUNDS = RETRY_DELAYS.length + 1;

/** 并发检查数 */
const CONCURRENCY = 10;

/** 调度器是否已启动 */
let schedulerStarted = false;

/** 上次定时检查的日期（YYYY-MM-DD），防止同一天重复触发 */
let lastScheduledDate: string | null = null;

/**
 * 延时辅助
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 并发检查一批站点
 */
async function checkSitesConcurrently(
  sites: Array<{ id: string; url: string }>,
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  for (let i = 0; i < sites.length; i += CONCURRENCY) {
    const batch = sites.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (site) => {
        const online = await checkSiteOnline(site.url);
        logger.info(`${online ? "✓" : "✗"} ${site.url}`);
        return { id: site.id, url: site.url, online };
      }),
    );
    for (const r of batchResults) {
      results.set(r.id, r.online);
    }
  }

  return results;
}

/**
 * 从检查结果中筛选出失败的站点
 */
function filterFailedSites(
  sites: Array<{ id: string; url: string }>,
  results: Map<string, boolean>,
): Array<{ id: string; url: string }> {
  return sites.filter((s) => results.get(s.id) === false);
}

/**
 * 执行带重试的批量在线检查
 * @param sites 要检查的站点列表
 * @param isRetryMode 是否为重试模式（影响日志前缀）
 */
async function executeBatchCheckWithRetries(
  sites: Array<{ id: string; url: string }>,
  isRetryMode = false,
): Promise<void> {
  if (sites.length === 0) {
    logger.info("没有需要检查的站点");
    return;
  }

  const prefix = isRetryMode ? "立即批量检查" : "定时检查";
  logger.info(`${prefix}开始，共 ${sites.length} 个站点`);

  // 构建 siteId → url 映射（用于最终更新 URL 缓存）
  const siteUrlMap = new Map<string, string>();
  for (const s of sites) siteUrlMap.set(s.id, s.url);

  let currentSites = sites;
  const allResults = new Map<string, boolean>();

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const isLastRound = round === MAX_ROUNDS;
    const roundLabel = round === 1 ? "首轮" : `第 ${round - 1} 次重试`;

    logger.info(`${prefix}第 ${round} 轮（${roundLabel}）开始，检查 ${currentSites.length} 个站点`);

    const roundResults = await checkSitesConcurrently(currentSites);
    // 合并结果
    for (const [id, online] of roundResults) {
      allResults.set(id, online);
    }

    const failedSites = filterFailedSites(currentSites, roundResults);
    const onlineCount = currentSites.length - failedSites.length;

    logger.info(
      `${prefix}第 ${round} 轮完成: ${onlineCount}/${currentSites.length} 在线` +
      (failedSites.length > 0 ? `，${failedSites.length} 个站点失败` : ""),
    );

    // 如果没有失败的站点，或者已经是最后一轮，结束检查
    if (failedSites.length === 0 || isLastRound) {
      if (failedSites.length > 0 && isLastRound) {
        logger.info(`${prefix}所有 ${MAX_ROUNDS} 轮检查完毕，仍有 ${failedSites.length} 个站点离线`);
      }
      break;
    }

    // 等待重试间隔
    const retryDelay = RETRY_DELAYS[round - 1];
    logger.info(`${prefix}等待 ${retryDelay / 1000} 秒后开始第 ${round + 1} 轮重试...`);
    await delay(retryDelay);

    currentSites = failedSites;
  }

  // 更新 URL 缓存（按 URL 去重，取最终结果）
  const urlResults = new Map<string, boolean>();
  for (const [id, online] of allResults) {
    const url = siteUrlMap.get(id);
    if (url) urlResults.set(url, online);
  }
  await upsertUrlOnlineCacheBatch(urlResults);

  // 更新数据库
  const offlineChanges = await updateCardsOnlineStatus(allResults);
  logger.info(`${prefix}数据库已更新，共检查 ${allResults.size} 个站点`);

  // 发送离线通知（仅在所有重试结束后）
  if (offlineChanges.length > 0) {
    await sendOfflineNotifications(offlineChanges);
  }
}

/**
 * 异步发送离线通知
 */
async function sendOfflineNotifications(changes: OnlineStatusChange[]): Promise<void> {
  const settings = await getAppSettings();
  const siteName = settings.siteName || "SakuraNav";

  const grouped = new Map<string, OnlineStatusChange[]>();
  for (const change of changes) {
    const list = grouped.get(change.ownerId) ?? [];
    list.push(change);
    grouped.set(change.ownerId, list);
  }

  for (const [ownerId, siteChanges] of grouped) {
    for (const change of siteChanges) {
      const title = `${siteName} 站点离线通知`;
      const content = `网站「${change.cardName}」(${change.cardUrl}) 当前处于离线状态，请及时检查。`;
      const count = await sendNotificationToUser(ownerId, title, content);
      if (count > 0) {
        logger.info(`离线通知已发送: ${change.cardName} → ${ownerId} (${count} 条通道)`);
      }
    }
  }
}

/**
 * 获取需要定时检查的站点（URL 缓存中不存在或已超过 20 小时的）
 */
async function getScheduledCheckSites(): Promise<Array<{ id: string; url: string; ownerId: string; offlineNotify: boolean; cardName: string; cardUrl: string }>> {
  const db = await getDb();
  const rows = await db.query<{ id: string; url: string; owner_id: string; offline_notify: number; name: string }>(
    `SELECT c.id, c.url, c.owner_id, c.offline_notify, c.name
     FROM cards c
     WHERE c.skip_online_check = 0 AND c.card_type IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM url_online_cache cache
       WHERE cache.url = c.url AND datetime(cache.last_checked_at) >= datetime('now', '-20 hours')
     )`,
  );
  return rows.map((r) => ({ id: r.id, url: r.url, ownerId: r.owner_id, offlineNotify: r.offline_notify === 1, cardName: r.name, cardUrl: r.url }));
}

/**
 * 执行定时批量在线检查（由调度器在 4 AM 触发）
 */
async function runScheduledBatchCheck(): Promise<void> {
  try {
    // 1. 清理不再被任何站点使用的 URL 缓存
    const cleaned = await cleanOrphanUrlCache();
    if (cleaned > 0) {
      logger.info(`清理了 ${cleaned} 个不再使用的 URL 缓存`);
    }

    // 2. 获取需要检查的站点（缓存过期或不存在）
    const sites = await getScheduledCheckSites();

    // 3. 执行带重试的批量检查
    await executeBatchCheckWithRetries(sites, false);
  } catch (error) {
    logger.error("定时在线检查失败", error);
  }
}

/**
 * 执行立即批量在线检查（由导入/重置操作触发）
 * @param sites 要检查的站点列表
 */
export async function runImmediateBatchCheck(
  sites: Array<{ id: string; url: string }>,
): Promise<void> {
  await executeBatchCheckWithRetries(sites, true);
}

/**
 * 启动定时检查调度器
 * 每分钟检查一次，在 4:00 AM 时触发批量在线检查
 */
export function startOnlineCheckScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  logger.info("在线检测定时调度器已启动，将在每天 4:00 AM 执行检查");

  setInterval(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    if (now.getHours() === CHECK_HOUR && now.getMinutes() === 0 && lastScheduledDate !== todayStr) {
      lastScheduledDate = todayStr;
      void runScheduledBatchCheck();
    }
  }, 60 * 1000);
}
