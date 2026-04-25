/**
 * 修改密码 API
 * PUT - 修改当前用户密码（包括管理员）
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { requireUserSession } from "@/lib/base/auth";
import { ADMIN_USER_ID } from "@/lib/base/types";
import { getUserByUsernameWithHash, getUserByUsernameWithHashById, verifyPassword, updateUserPassword } from "@/lib/services/user-repository";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:User:Password");

export async function PUT(request: NextRequest) {
  try {
    const session = await requireUserSession();

    const body = (await request.json()) as {
      oldPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    const { oldPassword, newPassword, confirmPassword } = body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return jsonError("请填写所有字段", 400);
    }

    if (newPassword.length < 6) {
      return jsonError("新密码长度不能少于 6 位", 400);
    }

    if (newPassword !== confirmPassword) {
      return jsonError("两次输入的密码不一致", 400);
    }

    // 管理员：通过 ID 查找（因为管理员不在注册用户的 username 索引中）
    // 注册用户：通过 username 查找
    const user = session.userId === ADMIN_USER_ID
      ? getUserByUsernameWithHashById(session.userId)
      : getUserByUsernameWithHash(session.username);

    if (!user) return jsonError("用户不存在", 404);

    const passwordHash = (user as typeof user & { passwordHash: string }).passwordHash;
    if (!verifyPassword(oldPassword, passwordHash)) {
      return jsonError("旧密码不正确", 400);
    }

    updateUserPassword(session.userId, newPassword);
    logger.info("用户密码已修改", { userId: session.userId });

    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
