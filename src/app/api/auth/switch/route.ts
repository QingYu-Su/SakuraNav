/**
 * 切换用户 API 路由
 * @description 已登录用户可直接切换到另一个用户（无需密码），用于切换用户弹窗
 */

import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/base/auth";
import { serverConfig } from "@/lib/config/server-config";
import { getUserById } from "@/lib/services/user-repository";
import { jsonError } from "@/lib/utils/utils";
import { getSession } from "@/lib/base/auth";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Auth:Switch");

export async function POST(request: NextRequest) {
  // 验证当前用户已登录
  const session = await getSession();
  if (!session?.isAuthenticated) {
    return jsonError("未登录，无法切换用户", 401);
  }

  const body = (await request.json()) as { userId?: string };
  const targetUserId = body.userId;

  if (!targetUserId) {
    return jsonError("缺少目标用户 ID", 400);
  }

  if (targetUserId === session.userId) {
    return jsonError("目标用户与当前用户相同", 400);
  }

  // 查找目标用户
  const targetUser = getUserById(targetUserId);
  if (!targetUser) {
    return jsonError("目标用户不存在", 404);
  }

  // 直接为目标用户创建会话（免密码）
  const token = await createSessionToken(targetUser.username, targetUser.id, targetUser.role);
  const response = NextResponse.json({
    ok: true,
    username: targetUser.username,
    userId: targetUser.id,
    role: targetUser.role,
  });
  const maxAge = serverConfig.rememberDays * 24 * 60 * 60;
  response.cookies.set("sakura-nav-session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge,
  });

  logger.info("用户切换成功", {
    from: session.username,
    to: targetUser.username,
  });
  return response;
}
