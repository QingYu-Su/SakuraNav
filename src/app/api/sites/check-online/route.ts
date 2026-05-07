/**
 * 批量在线检查 API 路由
 * @description 同步执行单轮批量在线检查，利用 URL 缓存跳过 20 小时内已检查的 URL
 * 检查完成后立即返回结果，前端据此刷新页面
 */

import { requireUserSession } from "@/lib/base/auth";
import { getOnlineCheckSites, updateSitesOnlineStatus, sendNotificationToUser, getAppSettings } from "@/lib/services";
import type { OnlineStatusChange } from "@/lib/services";
import { getUrlsOnlineStatusBatch, upsertUrlOnlineCacheBatch } from "@/lib/services/url-online-cache-repository";
import { checkSiteOnline } from "@/lib/utils/online-check-util";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { isRateLimited, getClientIp } from "@/lib/utils/rate-limit";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:CheckOnline");

/** 并发检查数 */
const CONCURRENCY = 10;

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
      const content = `网站「${change.siteName}」(${change.siteUrl}) 当前处于离线状态，请及时检查。`;
      const count = await sendNotificationToUser(ownerId, title, content);
      if (count > 0) {
        logger.info(`离线通知已发送: ${change.siteName} → ${ownerId} (${count} 条通道)`);
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    await requireUserSession();

    const ip = getClientIp(request);
    if (isRateLimited(ip, "onlineCheck")) {
      return jsonError("请求过于频繁，请稍后再试", 429);
    }

    const sites = await getOnlineCheckSites();
    if (sites.length === 0) {
      return jsonOk({ checked: 0 });
    }

    // 1. 查询 URL 缓存，跳过 20 小时内已检查的 URL
    const allUrls = [...new Set(sites.map((s) => s.url))];
    const cachedResults = await getUrlsOnlineStatusBatch(allUrls);

    // 筛选出需要实际检查的站点（URL 未缓存或已过期）
    const sitesToCheck = sites.filter((s) => !cachedResults.has(s.url));

    logger.info(
      `批量检查: 共 ${sites.length} 个站点, ${cachedResults.size} 个使用缓存, ${sitesToCheck.length} 个需要检查`,
    );

    // 2. 对未缓存的 URL 执行实际检查（单轮）
    const checkResults = new Map<string, boolean>();
    if (sitesToCheck.length > 0) {
      for (let i = 0; i < sitesToCheck.length; i += CONCURRENCY) {
        const batch = sitesToCheck.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(
          batch.map(async (site) => {
            const online = await checkSiteOnline(site.url);
            logger.info(`${online ? "✓" : "✗"} ${site.url}`);
            return { url: site.url, online };
          }),
        );
        for (const r of batchResults) {
          checkResults.set(r.url, r.online);
        }
      }
    }

    // 3. 合并缓存结果和检查结果，构建 siteId → online 映射
    const allResults = new Map<string, boolean>();
    for (const site of sites) {
      const online = checkResults.get(site.url) ?? cachedResults.get(site.url);
      if (online !== undefined) {
        allResults.set(site.id, online);
      }
    }

    // 4. 更新 URL 缓存（仅新检查的结果）
    if (checkResults.size > 0) {
      await upsertUrlOnlineCacheBatch(checkResults);
    }

    // 5. 更新数据库中站点的在线状态
    const offlineChanges = await updateSitesOnlineStatus(allResults);
    logger.info(`批量检查完成: 共 ${allResults.size} 个站点, ${offlineChanges.length} 个状态变更`);

    // 6. 发送离线通知
    if (offlineChanges.length > 0) {
      await sendOfflineNotifications(offlineChanges);
    }

    return jsonOk({ checked: allResults.size });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("在线检查失败", error);
    return jsonError(error instanceof Error ? error.message : "检查失败", 500);
  }
}
