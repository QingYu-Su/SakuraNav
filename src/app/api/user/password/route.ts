/**
 * 修改密码 API
 * PUT - 修改当前用户密码
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { requireUserSession } from "@/lib/base/auth";
import { getUserByUsernameWithHash, verifyPassword, updateUserPassword } from "@/lib/services/user-repository";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:User:Password");

export async function PUT(request: NextRequest) {
  try {
    const session = await requireUserSession();
    if (session.userId === "__admin__") {
      return jsonError("管理员请通过配置文件修改密码", 403);
    }

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

    // 验证旧密码
    const user = getUserByUsernameWithHash(session.username);
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
