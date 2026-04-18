/**
 * 登出 API 路由
 * @description 处理管理员登出请求，清除会话Cookie
 */

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/base/auth";

/**
 * 处理登出请求
 * @returns 清除会话后的响应
 */
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
