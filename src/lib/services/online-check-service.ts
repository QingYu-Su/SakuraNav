/**
 * 单站点在线检查服务
 * @description 提取自 check-online-single API 路由，供 API/MCP 复用
 * 包含：URL 缓存查询 → HEAD→GET 回退 → 重试 3 次 → 更新缓存 → 更新站点状态 → 离线通知
 */

import { getSiteById, updateSiteOnlineStatus } from "./site-repository";
import { getAppSettings } from "./appearance-repository";
import { sendNotificationToUser } from "./notification-repository";
import { getUrlOnlineStatusIfFresh, upsertUrlOnlineCache } from "./url-online-cache-repository";
import { checkSiteOnline } from "@/lib/utils/online-check-util";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("OnlineCheckService");

/** 最大重试次数 */
const MAX_ATTEMPTS = 3;

/** 重试间隔（毫秒） */
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 对指定站点执行完整的在线检查流程
 * @param siteId - 站点 ID
 * @returns online 状态 (true=在线, false=离线, null=站点不存在)
 */
export async function performSingleSiteOnlineCheck(siteId: string): Promise<boolean | null> {
  const site = await getSiteById(siteId);
  if (!site) return null;

  // 1. 先查 URL 缓存，20 小时内直接返回
  const cachedOnline = await getUrlOnlineStatusIfFresh(site.url);
  if (cachedOnline !== null) {
    const statusChange = await updateSiteOnlineStatus(site.id, cachedOnline);
    logger.info(`${cachedOnline ? "✓" : "✗"} ${site.url}（使用缓存结果）`);
    if (statusChange?.wentOffline) {
      const settings = await getAppSettings();
      const appName = settings.siteName || "SakuraNav";
      sendNotificationToUser(statusChange.ownerId, `${appName} 站点离线通知`, `网站「${site.name}」(${site.url}) 当前处于离线状态，请及时检查。`).catch(() => {});
    }
    return cachedOnline;
  }

  // 2. 缓存未命中，执行实际检查（带重试）
  let online = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    online = await checkSiteOnline(site.url);
    if (online) {
      if (attempt > 1) {
        logger.info(`✓ ${site.url}（第 ${attempt} 次重试成功）`);
      } else {
        logger.info(`✓ ${site.url}（单站点检测成功）`);
      }
      break;
    }
    if (attempt < MAX_ATTEMPTS) {
      logger.info(`✗ ${site.url}（检测失败，第 ${attempt} 次重试...）`);
      await delay(RETRY_DELAY_MS);
    }
  }

  if (!online) {
    logger.info(`✗ ${site.url}（重试 ${MAX_ATTEMPTS} 次后仍离线）`);
  }

  // 3. 更新 URL 缓存
  await upsertUrlOnlineCache(site.url, online);

  // 4. 更新站点状态
  const statusChange = await updateSiteOnlineStatus(site.id, online);

  // 5. 离线通知
  if (statusChange?.wentOffline) {
    const settings = await getAppSettings();
    const appName = settings.siteName || "SakuraNav";
    sendNotificationToUser(statusChange.ownerId, `${appName} 站点离线通知`, `网站「${site.name}」(${site.url}) 当前处于离线状态，请及时检查。`).catch((err) => {
      logger.error("离线通知发送失败", err);
    });
  }

  return online;
}

/**
 * URL 规范化：自动补全 https:// 协议前缀
 */
export function ensureUrlProtocol(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
