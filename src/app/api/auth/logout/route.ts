/**
 * 登出 API 路由
 * @description 处理管理员登出请求，清除会话Cookie
 */

import { NextResponse } from "next/server";

/**
 * 处理登出请求
 * @returns 清除会话后的响应
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });

  // 清除 cookie
  response.cookies.set("sakura-nav-session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });

  return response;
}
