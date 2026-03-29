/**
 * 登录 API 路由
 * @description 处理管理员登录请求，验证用户名密码并创建会话令牌
 */

import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth";
import { serverConfig } from "@/lib/server-config";
import { jsonError } from "@/lib/utils";

/**
 * 处理登录请求
 * @param request - 包含用户名和密码的请求对象
 * @returns 登录成功返回用户信息，失败返回错误信息
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (
    body.username !== serverConfig.adminUsername ||
    body.password !== serverConfig.adminPassword
  ) {
    return jsonError("账号或密码错误", 401);
  }

  const token = await createSessionToken(serverConfig.adminUsername);

  const response = NextResponse.json({
    ok: true,
    username: serverConfig.adminUsername,
  });

  // 显式设置 Set-Cookie 头
  response.cookies.set("sakura-nav-session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // 开发环境支持 HTTP
    path: "/",
    maxAge: serverConfig.rememberDays * 24 * 60 * 60,
  });

  return response;
}
