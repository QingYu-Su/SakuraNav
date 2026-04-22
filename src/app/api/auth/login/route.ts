/**
 * 登录 API 路由
 * @description 处理用户登录请求，支持管理员（config.yml）和注册用户认证
 */

import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/base/auth";
import { serverConfig } from "@/lib/config/server-config";
import { ADMIN_USER_ID } from "@/lib/base/types";
import { getUserByUsernameWithHash, verifyPassword } from "@/lib/services/user-repository";
import { jsonError } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Auth:Login");

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
    rememberMe?: boolean;
  };

  logger.info("收到登录请求", { username: body.username });

  // 1. 尝试管理员登录
  if (body.username === serverConfig.adminUsername && body.password === serverConfig.adminPassword) {
    const token = await createSessionToken(serverConfig.adminUsername, ADMIN_USER_ID, "admin");
    const response = NextResponse.json({ ok: true, username: serverConfig.adminUsername, role: "admin" });
    const maxAge = body.rememberMe ? serverConfig.rememberDays * 24 * 60 * 60 : undefined;
    response.cookies.set("sakura-nav-session", token, {
      httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge,
    });
    logger.info("管理员登录成功");
    return response;
  }

  // 2. 尝试注册用户登录
  const user = getUserByUsernameWithHash(body.username ?? "");
  if (!user) {
    return jsonError("账号或密码错误", 401);
  }
  if (!verifyPassword(body.password ?? "", user.passwordHash)) {
    return jsonError("账号或密码错误", 401);
  }

  const token = await createSessionToken(user.username, user.id, user.role);
  const response = NextResponse.json({ ok: true, username: user.username, role: user.role });
  const maxAge = body.rememberMe ? serverConfig.rememberDays * 24 * 60 * 60 : undefined;
  response.cookies.set("sakura-nav-session", token, {
    httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge,
  });
  logger.info("注册用户登录成功", { username: user.username, role: user.role });
  return response;
}
