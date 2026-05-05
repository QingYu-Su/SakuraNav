/**
 * 网站在线检查 API 路由
 * @description 批量检测所有网站的在线状态，使用每个站点独立配置的检测参数
 */

import { requireUserSession } from "@/lib/base/auth";
import { getOnlineCheckSites, updateSitesOnlineStatus } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { isUrlSafe } from "@/lib/utils/ssrf-protection";
import { isRateLimited, getClientIp } from "@/lib/utils/rate-limit";
import { createLogger } from "@/lib/base/logger";
import type { OnlineCheckMatchMode } from "@/lib/base/types";

const logger = createLogger("API:CheckOnline");

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * 检测单个 URL 是否可访问
 * @param matchMode 判定模式：status=HTTP 状态码，keyword=关键词匹配
 * @param keyword 关键词（仅 matchMode=keyword 时有效）
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
    // 关键词匹配需要 GET 请求读取 body
    const method = matchMode === "keyword" ? "GET" : "HEAD";
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": BROWSER_UA },
    });

    if (matchMode === "keyword" && keyword) {
      // 关键词模式：先检查状态码，再检查关键词
      if (res.status < 200 || res.status >= 400) return false;
      const body = await res.text();
      return body.includes(keyword);
    }

    // 默认：HTTP 2xx/3xx 判定为在线
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  try {
    await requireUserSession();

    // 速率限制
    const ip = getClientIp(request);
    if (isRateLimited(ip, "onlineCheck")) {
      return jsonError("请求过于频繁，请稍后再试", 429);
    }

    const sites = await getOnlineCheckSites();

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
          const online = await checkSite(
            site.url,
            site.timeout * 1000,
            site.matchMode,
            site.keyword,
          );
          logger.info(`${online ? "✓" : "✗"} ${site.url}`);
          return { id: site.id, url: site.url, online };
        }),
      );
      results.push(...batchResults);
    }

    // 更新数据库（含连续失败计数逻辑）
    const statusMap = new Map<string, boolean>();
    for (const r of results) {
      statusMap.set(r.id, r.online);
    }
    await updateSitesOnlineStatus(statusMap);

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
