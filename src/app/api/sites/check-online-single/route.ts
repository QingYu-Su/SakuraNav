/**
 * 单站点在线检查 API 路由
 * @description 检测指定网站的在线状态，使用站点独立配置的检测参数
 * 即时检测（新建/URL变更/开关切换）时内部重试最多 failThreshold 次
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getSiteById, updateSiteOnlineStatus, sendNotificationToUser, getAppSettings } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { isUrlSafe } from "@/lib/utils/ssrf-protection";
import { isRateLimited, getClientIp } from "@/lib/utils/rate-limit";
import { createLogger } from "@/lib/base/logger";
import type { OnlineCheckMatchMode } from "@/lib/base/types";

const logger = createLogger("API:CheckOnlineSingle");

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** 重试间隔（毫秒） */
const RETRY_DELAY_MS = 500;

/**
 * 检测单个 URL 是否可访问
 * @param matchMode 判定模式
 * @param keyword 关键词
 */
async function checkSite(
  url: string,
  timeoutMs = 3000,
  matchMode: OnlineCheckMatchMode = "status",
  keyword = "",
): Promise<boolean> {
  // SSRF 防护：检查 URL 是否指向私有/保留地址
  if (!(await isUrlSafe(url))) {
    logger.warning("SSRF 防护: 跳过私有地址", { url });
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const method = matchMode === "keyword" ? "GET" : "HEAD";
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": BROWSER_UA },
    });

    if (matchMode === "keyword" && keyword) {
      if (res.status < 200 || res.status >= 400) return false;
      const body = await res.text();
      return body.includes(keyword);
    }

    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** 延时辅助 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    await requireUserSession();

    // 速率限制
    const ip = getClientIp(request);
    if (isRateLimited(ip, "onlineCheck")) {
      return jsonError("请求过于频繁，请稍后再试", 429);
    }

    const body = await request.json() as { siteId?: string };
    if (!body.siteId) {
      return jsonError("缺少站点 ID", 400);
    }

    const site = await getSiteById(body.siteId);
    if (!site) {
      return jsonError("站点不存在", 404);
    }

    const timeout = site.onlineCheckTimeout * 1000;
    const matchMode = site.onlineCheckMatchMode;
    const keyword = site.onlineCheckKeyword;
    const maxAttempts = site.onlineCheckFailThreshold;

    // 即时检测：内部重试最多 maxAttempts 次
    let online = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      online = await checkSite(site.url, timeout, matchMode, keyword);
      if (online) {
        if (attempt > 1) {
          logger.info(`✓ ${site.url} (重试第 ${attempt}/${maxAttempts} 次成功)`);
        } else {
          logger.info(`✓ ${site.url} (单站点检测)`);
        }
        break;
      }
      // 本次失败，若还有剩余次数则继续重试
      if (attempt < maxAttempts) {
        logger.info(`✗ ${site.url} (检测失败，重试 ${attempt}/${maxAttempts})`);
        await delay(RETRY_DELAY_MS);
      }
    }

    if (!online) {
      logger.info(`✗ ${site.url} (重试 ${maxAttempts} 次后仍离线)`);
    }

    // 即时检测结果使用 force 模式：直接设置最终状态，跳过渐进式计数
    const statusChange = await updateSiteOnlineStatus(site.id, online, true);

    // 站点离线时发送通知（异步，不阻塞响应）
    if (statusChange?.wentOffline) {
      const settings = await getAppSettings();
      const siteName = settings.siteName || "SakuraNav";
      const title = `${siteName} 站点离线通知`;
      const content = `网站「${site.name}」(${site.url}) 当前处于离线状态，请及时检查。`;
      sendNotificationToUser(statusChange.ownerId, title, content).catch((err) => {
        logger.error("离线通知发送失败", err);
      });
    }

    return jsonOk({ id: site.id, online });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("单站点在线检查失败", error);
    return jsonError(error instanceof Error ? error.message : "检查失败", 500);
  }
}
