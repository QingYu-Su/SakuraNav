/**
 * 修改密码 API
 * PUT - 修改当前用户密码（包括管理员）
 * OAuth 用户首次设置密码时可不提供旧密码（has_password = 0）
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { requireUserSession } from "@/lib/base/auth";
import { ADMIN_USER_ID } from "@/lib/base/types";
import { getUserByUsernameWithHash, getUserByUsernameWithHashById, verifyPassword, updateUserPassword, userHasPassword, markUserHasPassword } from "@/lib/services/user-repository";
import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";
import { verifyCsrfToken } from "@/lib/utils/csrf";

const logger = createLogger("API:User:Password");

export async function PUT(request: NextRequest) {
  try {
    const session = await requireUserSession();

    if (!verifyCsrfToken(request)) {
      return jsonError("安全验证失败，请刷新页面重试", 403);
    }

    const body = (await request.json()) as {
      oldPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    const { oldPassword, newPassword, confirmPassword } = body;

    if (!newPassword || !confirmPassword) {
      return jsonError("请填写所有字段", 400);
    }

    if (newPassword.length < 6) {
      return jsonError("新密码长度不能少于 6 位", 400);
    }

    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return jsonError("密码需包含大写字母、小写字母和数字", 400);
    }

    if (newPassword !== confirmPassword) {
      return jsonError("两次输入的密码不一致", 400);
    }

    // 检查用户是否已设置密码（OAuth 用户可能未设置）
    const hasPwd = userHasPassword(session.userId);

    if (hasPwd) {
      // 已有密码 → 必须提供旧密码
      if (!oldPassword) {
        return jsonError("请输入旧密码", 400);
      }

      const user = session.userId === ADMIN_USER_ID
        ? getUserByUsernameWithHashById(session.userId)
        : getUserByUsernameWithHash(session.username);

      if (!user) return jsonError("用户不存在", 404);

      const passwordHash = (user as typeof user & { passwordHash: string }).passwordHash;
      if (!verifyPassword(oldPassword, passwordHash)) {
        return jsonError("旧密码不正确", 400);
      }
    }
    // has_password = 0 时不需要旧密码（OAuth 用户首次设置密码）

    updateUserPassword(session.userId, newPassword);
    // 标记用户已设置密码
    markUserHasPassword(session.userId);

    // 密码修改后吊销所有已签发的 token，强制重新登录
    const key = `tokens_valid_after:${session.userId}`;
    const now = Math.floor(Date.now() / 1000);
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(key, String(now));

    logger.info("用户密码已修改，所有旧 token 已吊销", { userId: session.userId });

    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
