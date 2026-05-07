/**
 * 单站点在线检查 API 路由
 * @description 检测指定网站的在线状态，先查 URL 缓存，20 小时内直接返回缓存结果
 * 缓存未命中时使用 HEAD → GET 回退策略，失败后最多重试 3 次（2 秒间隔）
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getSiteById, updateSiteOnlineStatus, sendNotificationToUser, getAppSettings } from "@/lib/services";
import { getUrlOnlineStatusIfFresh, upsertUrlOnlineCache } from "@/lib/services/url-online-cache-repository";
import { checkSiteOnline } from "@/lib/utils/online-check-util";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { isRateLimited, getClientIp } from "@/lib/utils/rate-limit";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:CheckOnlineSingle");

/** 最大重试次数 */
const MAX_ATTEMPTS = 3;

/** 重试间隔（毫秒） */
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    await requireUserSession();

    const ip = getClientIp(request);
    if (isRateLimited(ip, "onlineCheck")) {
      return jsonError("请求过于频繁，请稍后再试", 429);
    }

    const body = (await request.json()) as { siteId?: string };
    if (!body.siteId) {
      return jsonError("缺少站点 ID", 400);
    }

    const site = await getSiteById(body.siteId);
    if (!site) {
      return jsonError("站点不存在", 404);
    }

    // 1. 先查 URL 缓存，20 小时内直接返回
    const cachedOnline = await getUrlOnlineStatusIfFresh(site.url);
    if (cachedOnline !== null) {
      const statusChange = await updateSiteOnlineStatus(site.id, cachedOnline);
      logger.info(`${cachedOnline ? "✓" : "✗"} ${site.url}（使用缓存结果）`);
      if (statusChange?.wentOffline) {
        const settings = await getAppSettings();
        const siteName = settings.siteName || "SakuraNav";
        sendNotificationToUser(statusChange.ownerId, `${siteName} 站点离线通知`, `网站「${site.name}」(${site.url}) 当前处于离线状态，请及时检查。`).catch(() => {});
      }
      return jsonOk({ id: site.id, online: cachedOnline, cached: true });
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
      const siteName = settings.siteName || "SakuraNav";
      sendNotificationToUser(statusChange.ownerId, `${siteName} 站点离线通知`, `网站「${site.name}」(${site.url}) 当前处于离线状态，请及时检查。`).catch((err) => {
        logger.error("离线通知发送失败", err);
      });
    }

    return jsonOk({ id: site.id, online, cached: false });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("单站点在线检查失败", error);
    return jsonError(error instanceof Error ? error.message : "检查失败", 500);
  }
}
