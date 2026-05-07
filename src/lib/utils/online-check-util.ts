/**
 * 在线检测工具函数
 * @description 提供 HEAD → GET 回退策略的网站在线检测
 */

import { isUrlSafe } from "@/lib/utils/ssrf-protection";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("OnlineCheck");

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** 默认检测超时时间（毫秒） */
export const DEFAULT_CHECK_TIMEOUT = 5000;

/**
 * 尝试使用指定 HTTP 方法请求 URL
 */
async function tryFetch(url: string, method: "HEAD" | "GET", timeoutMs: number): Promise<boolean> {
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

/**
 * 检测单个 URL 是否可访问
 * 策略：先尝试 HEAD 请求，失败后回退到 GET 请求
 * 某些网站不支持 HEAD 方法（返回 405），GET 回退可以解决此问题
 */
export async function checkSiteOnline(url: string, timeoutMs = DEFAULT_CHECK_TIMEOUT): Promise<boolean> {
  if (!(await isUrlSafe(url))) {
    logger.warning("SSRF 防护: 跳过私有地址", { url });
    return false;
  }

  // 先尝试 HEAD（更轻量）
  const headOk = await tryFetch(url, "HEAD", timeoutMs);
  if (headOk) return true;

  // HEAD 失败，回退到 GET（某些服务器不支持 HEAD 方法）
  return await tryFetch(url, "GET", timeoutMs);
}
