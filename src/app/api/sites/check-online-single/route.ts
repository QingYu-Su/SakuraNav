/**
 * 单站点在线检查 API 路由
 * @description 检测指定网站的在线状态，用于新建/编辑网站后的即时检测
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/base/auth";
import { getSiteById, updateSiteOnlineStatus } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:CheckOnlineSingle");

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

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json() as { siteId?: string };
    if (!body.siteId) {
      return jsonError("缺少站点 ID", 400);
    }

    const site = getSiteById(body.siteId);
    if (!site) {
      return jsonError("站点不存在", 404);
    }

    const online = await checkSite(site.url);
    updateSiteOnlineStatus(site.id, online);

    logger.info(`${online ? "✓" : "✗"} ${site.url} (单站点检测)`);

    return jsonOk({ id: site.id, online });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("单站点在线检查失败", error);
    return jsonError(error instanceof Error ? error.message : "检查失败", 500);
  }
}
