/**
 * 登录 API 路由
 * @description 处理管理员登录请求，验证用户名密码并创建会话令牌
 */

import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/base/auth";
import { serverConfig } from "@/lib/config/server-config";
import { jsonError } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Auth:Login");

/**
 * 处理登录请求
 * @param request - 包含用户名、密码和记住登录选项的请求对象
 * @returns 登录成功返回用户信息，失败返回错误信息
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
    rememberMe?: boolean;
  };

  logger.info("收到登录请求", { username: body.username, rememberMe: body.rememberMe });

  if (
    body.username !== serverConfig.adminUsername ||
    body.password !== serverConfig.adminPassword
  ) {
    logger.warning("登录失败: 用户名或密码错误", { username: body.username });
    return jsonError("账号或密码错误", 401);
  }

  const token = await createSessionToken(serverConfig.adminUsername);

  const response = NextResponse.json({
    ok: true,
    username: serverConfig.adminUsername,
  });

  // 根据 rememberMe 参数设置 cookie 过期时间
  // - rememberMe = true: 30 天免登录
  // - rememberMe = false: 会话 cookie（浏览器关闭时失效）
  const maxAge = body.rememberMe 
    ? serverConfig.rememberDays * 24 * 60 * 60 
    : undefined;

  // 显式设置 Set-Cookie 头
  response.cookies.set("sakura-nav-session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // 开发环境支持 HTTP
    path: "/",
    maxAge,
  });

  logger.info("登录成功", { username: serverConfig.adminUsername, rememberMe: body.rememberMe });

  return response;
}
