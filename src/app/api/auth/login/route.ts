/**
 * 登录 API 路由
 * @description 处理用户登录请求，所有用户（包括管理员）统一从 users 表认证
 */

import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/base/auth";
import { serverConfig } from "@/lib/config/server-config";
import { getUserByUsernameWithHash, verifyPassword } from "@/lib/services/user-repository";
import { jsonError } from "@/lib/utils/utils";
import { isRateLimited, getClientIp } from "@/lib/utils/rate-limit";
import { createLogger } from "@/lib/base/logger";
import { generateCsrfToken, getCsrfCookieOptions } from "@/lib/utils/csrf";

const logger = createLogger("API:Auth:Login");

const IS_PROD = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  // 速率限制
  const ip = getClientIp(request);
  if (isRateLimited(ip, "auth")) {
    return jsonError("请求过于频繁，请稍后再试", 429);
  }

  const body = (await request.json()) as {
    username?: string;
    password?: string;
    rememberMe?: boolean;
  };

  logger.info("收到登录请求", { username: body.username });

  // 统一从 users 表验证（管理员和注册用户使用同一套认证逻辑）
  const user = await getUserByUsernameWithHash(body.username ?? "");
  if (!user) {
    return jsonError("账号或密码错误", 401);
  }
  if (!verifyPassword(body.password ?? "", user.passwordHash)) {
    return jsonError("账号或密码错误", 401);
  }

  const token = await createSessionToken(user.username, user.id, user.role);
  const response = NextResponse.json({ ok: true, username: user.username, role: user.role });
  const maxAge = body.rememberMe ? serverConfig.rememberDays * 24 * 60 * 60 : undefined;
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true, sameSite: "lax", secure: IS_PROD, path: "/", maxAge,
  });
  // 下发 CSRF token（Double Submit Cookie）
  response.cookies.set("csrf_token", generateCsrfToken(), getCsrfCookieOptions());
  logger.info("用户登录成功", { username: user.username, role: user.role });
  return response;
}
