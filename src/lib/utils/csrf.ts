/**
 * @description CSRF Token 工具 — Double Submit Cookie 模式
 *
 * 工作原理：
 * 1. 服务端通过 Set-Cookie 下发 csrf_token（非 httpOnly，JS 可读）
 * 2. 客户端在 mutating 请求中通过 X-CSRF-Token header 回传
 * 3. 服务端校验 header 与 cookie 值一致
 *
 * 优势：无状态、无需 session 存储、与现有 JWT cookie 认证兼容
 */

import { createLogger } from "@/lib/base/logger";

const logger = createLogger("CSRF");

/** Cookie 名称 */
export const CSRF_COOKIE_NAME = "csrf_token";
/** Header 名称 */
export const CSRF_HEADER_NAME = "x-csrf-token";
/** Token 长度（字节数） */
const TOKEN_BYTES = 32;
/** Cookie 有效期：7 天（秒），与会话周期对齐 */
const CSRF_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * 生成 CSRF token（随机 hex 字符串）
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 获取 CSRF cookie 的设置参数
 */
export function getCsrfCookieOptions() {
  return {
    httpOnly: false, // JS 需要读取
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CSRF_COOKIE_MAX_AGE,
  };
}

/**
 * 校验 CSRF token：比对请求 header 与 cookie 值
 * @returns true = 校验通过
 */
export function verifyCsrfToken(request: Request): boolean {
  const cookieToken = request.headers.get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.split("=")[1];

  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    logger.warning("CSRF 校验失败: 缺少 token", {
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
    });
    return false;
  }

  if (cookieToken.length !== TOKEN_BYTES * 2 || headerToken.length !== TOKEN_BYTES * 2) {
    logger.warning("CSRF 校验失败: token 长度异常");
    return false;
  }

  // 时间安全比较
  if (!timingSafeEqualString(cookieToken, headerToken)) {
    logger.warning("CSRF 校验失败: token 不匹配");
    return false;
  }

  return true;
}

/**
 * 时间安全的字符串比较（防止 timing attack）
 */
function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}


