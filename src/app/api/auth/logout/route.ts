/**
 * 登出 API 路由
 * @description 处理管理员登出请求，清除会话Cookie并吊销该用户的所有已签发 token
 */

import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/base/auth";
import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";
import { verifyCsrfToken } from "@/lib/utils/csrf";

const logger = createLogger("API:Auth:Logout");

/**
 * 处理登出请求
 * 清除 Cookie 并在数据库中记录 tokens_valid_after 时间戳，
 * 使该用户之前签发的所有 JWT 在 getSession() 验证时失效
 */
export async function POST(request: NextRequest) {
  // CSRF 校验（登出虽低风险但保持一致性）
  if (!verifyCsrfToken(request)) {
    return NextResponse.json({ error: "安全验证失败" }, { status: 403 });
  }

  const session = await getSession();
  await clearSessionCookie();

  if (session?.userId) {
    // 吊销该用户在当前时间之前的所有 token
    const key = `tokens_valid_after:${session.userId}`;
    const now = Math.floor(Date.now() / 1000);
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(key, String(now));
    logger.info("用户已登出，所有旧 token 已吊销", { userId: session.userId });
  }

  return NextResponse.json({ ok: true });
}
