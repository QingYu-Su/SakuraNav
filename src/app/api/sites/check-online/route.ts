/**
 * 网站在线检查 API 路由
 * @description 批量检测所有网站的在线状态，更新数据库中的 is_online 字段
 */

import { requireAdminSession } from "@/lib/base/auth";
import { getAllSiteUrls, updateSitesOnlineStatus } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:CheckOnline");

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** 检测单个 URL 是否可访问 */
async function checkSite(url: string, timeoutMs = 10000): Promise<boolean> {
  async function tryFetch(method: "HEAD" | "GET"): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": BROWSER_UA },
      });
      return res.status >= 200 && res.status < 400;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  // 先 HEAD，失败再用 GET（某些服务器不支持 HEAD）
  if (await tryFetch("HEAD")) return true;
  return tryFetch("GET");
}

export async function POST() {
  try {
    await requireAdminSession();
    const sites = getAllSiteUrls();

    if (sites.length === 0) {
      return jsonOk({ checked: 0, results: [] });
    }

    // 并发检查，限制最大并发数为 10
    const concurrency = 10;
    const results: Array<{ id: string; url: string; online: boolean }> = [];

    for (let i = 0; i < sites.length; i += concurrency) {
      const batch = sites.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (site) => {
          const online = await checkSite(site.url);
          logger.info(`${online ? "✓" : "✗"} ${site.url}`);
          return { id: site.id, url: site.url, online };
        }),
      );
      results.push(...batchResults);
    }

    // 更新数据库
    const statusMap = new Map<string, boolean>();
    for (const r of results) {
      statusMap.set(r.id, r.online);
    }
    updateSitesOnlineStatus(statusMap);

    const onlineCount = results.filter((r) => r.online).length;
    logger.info(`在线检查完成: ${onlineCount}/${results.length} 在线`);

    return jsonOk({
      checked: results.length,
      online: onlineCount,
      offline: results.length - onlineCount,
      results,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("在线检查失败", error);
    return jsonError(error instanceof Error ? error.message : "检查失败", 500);
  }
}
