/**
 * @description 基于 IP 的简易速率限制器
 * 使用内存 Map 存储，适用于单实例部署场景
 * 对于分布式部署可替换为 Redis 实现
 */

import { createLogger } from "@/lib/base/logger";

const logger = createLogger("RateLimit");

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/** IP → 请求计数 + 过期时间 */
const store = new Map<string, RateLimitEntry>();

/** 定期清理过期条目（每 60 秒） */
const CLEANUP_INTERVAL = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, CLEANUP_INTERVAL);
  // 不阻止进程退出
  if (cleanupTimer.unref) cleanupTimer.unref();
}

/**
 * 预定义的速率限制策略
 */
export const RateLimitPresets = {
  /** 登录/注册：每 IP 每分钟 10 次 */
  auth: { maxRequests: 10, windowMs: 60_000 },
  /** 文件上传：每 IP 每分钟 20 次 */
  upload: { maxRequests: 20, windowMs: 60_000 },
  /** 在线检测：每 IP 每分钟 5 次 */
  onlineCheck: { maxRequests: 5, windowMs: 60_000 },
  /** 通用 API：每 IP 每分钟 60 次 */
  api: { maxRequests: 60, windowMs: 60_000 },
  /** 数据导入：每 IP 每分钟 3 次 */
  import: { maxRequests: 3, windowMs: 60_000 },
} as const;

export type RateLimitPreset = keyof typeof RateLimitPresets;

/**
 * 检查请求是否超出速率限制
 * @returns true = 被限制（应拒绝），false = 允许通过
 */
export function isRateLimited(ip: string, preset: RateLimitPreset): boolean {
  ensureCleanup();

  const config = RateLimitPresets[preset];
  const now = Date.now();
  const key = `${preset}:${ip}`;

  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + config.windowMs };
    store.set(key, entry);
    return false;
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    logger.warning("速率限制触发", { ip, preset, count: entry.count });
    return true;
  }

  return false;
}

/**
 * 从 Next.js Request 中提取客户端 IP
 */
export function getClientIp(request: Request): string {
  // 优先使用反向代理传递的真实 IP 头
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}
