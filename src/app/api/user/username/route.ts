/**
 * 用户名修改 API
 * PUT - 修改用户名（仅允许修改一次，OAuth 用户可用）
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { requireUserSession } from "@/lib/base/auth";
import { updateUserUsername, isUsernameTaken, getUserById } from "@/lib/services/user-repository";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:User:Username");

export async function PUT(request: NextRequest) {
  try {
    const session = await requireUserSession();

    // 管理员不允许通过此接口修改用户名
    if (session.role === "admin") {
      return jsonError("管理员不支持修改用户名", 403);
    }

    const body = (await request.json()) as { username?: string };
    const newUsername = body.username?.trim();

    if (!newUsername) {
      return jsonError("用户名不能为空", 400);
    }

    if (newUsername.length < 2 || newUsername.length > 10) {
      return jsonError("用户名长度需在 2-10 个字符之间", 400);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return jsonError("用户名只能包含字母、数字和下划线", 400);
    }

    // 检查用户名是否已被占用（排除自己）
    const currentUser = await getUserById(session.userId);
    if (currentUser && currentUser.username !== newUsername && await isUsernameTaken(newUsername)) {
      return jsonError("该用户名已被占用", 409);
    }

    const success = await updateUserUsername(session.userId, newUsername);
    if (!success) {
      return jsonError("用户名只能修改一次，您已修改过", 400);
    }

    logger.info("用户名修改成功", { userId: session.userId, newUsername });
    return jsonOk({ ok: true, username: newUsername });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    return jsonError("修改失败", 500);
  }
}
